import { checkRedisHealth, db } from './db.js';
import { appConfig } from './config.js';
import { fulfillDueAccountDeletionRequests, withTransaction } from './repositories.js';
import { processGeminiTtsQueue, processTtsJobs } from './ttsWorker.js';
import { processAssessmentTtsQueue } from './tts.js';
import { repairMissingOnboardingTts } from './speechQueue.js';
import { runAnalyticsWorkerOnce } from './analyticsWorker.js';
import { runAnalyticsInactivityOnce } from './analyticsInactivityWorker.js';

const ACCOUNT_DELETION_SWEEP_INTERVAL_MS = 60 * 60 * 1000;
const ONBOARDING_TTS_REPAIR_INTERVAL_MS = 15 * 60 * 1000;

async function sweepDueAccountDeletions() {
  const deletedCount = await withTransaction(client => fulfillDueAccountDeletionRequests(client));
  if (deletedCount > 0) {
    console.info('[worker] fulfilled due account deletion requests', { deletedCount });
  }
}

async function run() {
  await db.query('SELECT 1');
  const initialRedisHealth = await checkRedisHealth();
  if (initialRedisHealth.status !== 'ok') {
    throw new Error(`Redis is unavailable: ${initialRedisHealth.message ?? 'health check failed'}`);
  }
  setInterval(async () => {
    const redisHealth = await checkRedisHealth();
    if (redisHealth.status !== 'ok') {
      console.warn('[worker] Redis health check degraded', redisHealth);
    }
  }, 30_000);

  await sweepDueAccountDeletions();
  setInterval(() => {
    sweepDueAccountDeletions().catch(error => {
      console.error('[worker] account deletion sweep failed', error);
    });
  }, ACCOUNT_DELETION_SWEEP_INTERVAL_MS);

  if (appConfig.KITABU_ANALYTICS_WORKER_ENABLED) {
    const pollAnalyticsDeliveries = () => {
      runAnalyticsWorkerOnce({
        owner: `kitabu-analytics-${process.pid}`,
        batchSize: appConfig.KITABU_ANALYTICS_WORKER_BATCH_SIZE,
        maxAttempts: appConfig.KITABU_ANALYTICS_WORKER_MAX_ATTEMPTS,
        leaseMs: appConfig.KITABU_ANALYTICS_WORKER_LEASE_MS,
        baseBackoffMs: appConfig.KITABU_ANALYTICS_WORKER_BASE_BACKOFF_MS,
        maxBackoffMs: appConfig.KITABU_ANALYTICS_WORKER_MAX_BACKOFF_MS
      }).then(result => {
        if (result.claimed > 0) console.info('[worker] processed analytics deliveries', result);
      }).catch(error => {
        // Analytics delivery is auxiliary and must not stop TTS or deletion loops.
        console.warn('[worker] analytics delivery poll failed', {
          error: error instanceof Error ? error.name : 'worker_error'
        });
      });
    };
    pollAnalyticsDeliveries();
    setInterval(pollAnalyticsDeliveries, appConfig.KITABU_ANALYTICS_WORKER_POLL_INTERVAL_MS);
    console.info('[worker] analytics delivery worker enabled', {
      pollIntervalMs: appConfig.KITABU_ANALYTICS_WORKER_POLL_INTERVAL_MS,
      batchSize: appConfig.KITABU_ANALYTICS_WORKER_BATCH_SIZE,
      maxAttempts: appConfig.KITABU_ANALYTICS_WORKER_MAX_ATTEMPTS
    });
  }

  if (appConfig.KITABU_ANALYTICS_INACTIVITY_ENABLED) {
    const pollAnalyticsInactivity = () => {
      runAnalyticsInactivityOnce({
        thresholdDays: appConfig.KITABU_ANALYTICS_INACTIVITY_THRESHOLD_DAYS,
        batchSize: appConfig.KITABU_ANALYTICS_INACTIVITY_BATCH_SIZE
      }).then(result => {
        if (result.scanned > 0) console.info('[worker] processed analytics inactivity maintenance', result);
      }).catch(error => {
        // Maintenance is auxiliary and must not stop delivery, TTS, or deletion loops.
        console.warn('[worker] analytics inactivity maintenance failed', {
          error: error instanceof Error ? error.name : 'maintenance_failed'
        });
      });
    };
    pollAnalyticsInactivity();
    setInterval(pollAnalyticsInactivity, appConfig.KITABU_ANALYTICS_INACTIVITY_POLL_INTERVAL_MS);
    console.info('[worker] analytics inactivity maintenance enabled', {
      pollIntervalMs: appConfig.KITABU_ANALYTICS_INACTIVITY_POLL_INTERVAL_MS,
      thresholdDays: appConfig.KITABU_ANALYTICS_INACTIVITY_THRESHOLD_DAYS,
      batchSize: appConfig.KITABU_ANALYTICS_INACTIVITY_BATCH_SIZE
    });
  }

  if (appConfig.KITABU_TTS_WORKER_ENABLED) {
    const repairOnboardingTts = () => {
      repairMissingOnboardingTts().then(result => {
        console.info('[worker] checked curated onboarding TTS storage', result);
      }).catch(error => {
        console.error('[worker] curated onboarding TTS storage repair failed', {
          message: error instanceof Error ? error.message : 'unknown'
        });
      });
    };
    await repairMissingOnboardingTts().then(result => {
      console.info('[worker] checked curated onboarding TTS storage', result);
    }).catch(error => {
      console.error('[worker] curated onboarding TTS storage repair failed', {
        message: error instanceof Error ? error.message : 'unknown'
      });
    });
    setInterval(repairOnboardingTts, ONBOARDING_TTS_REPAIR_INTERVAL_MS);

    const processSpeechQueue = () => {
      processTtsJobs().then(result => {
        if (result.claimed > 0) console.info('[worker] processed TTS jobs', result);
      }).catch(error => {
        console.error('[worker] TTS queue poll failed', error);
      });
    };
    processSpeechQueue();
    setInterval(processSpeechQueue, appConfig.KITABU_TTS_WORKER_POLL_INTERVAL_MS);
    console.info('[worker] TTS queue enabled', {
      mode: 'worker-fallback',
      pollIntervalMs: appConfig.KITABU_TTS_WORKER_POLL_INTERVAL_MS,
      batchSize: appConfig.KITABU_TTS_WORKER_BATCH_SIZE
    });
  }
  if (appConfig.KITABU_TTS_WORKER_ENABLED && appConfig.KITABU_GEMINI_TTS_DAILY_WORKER_ENABLED) {
    scheduleDailyGeminiTtsQueue();
  }

  const runAssessmentTtsQueue = () => {
    processAssessmentTtsQueue().catch(error => {
      console.warn('[worker] assessment TTS queue failed', {
        state: 'worker_error',
        error: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
      });
    });
  };
  runAssessmentTtsQueue();
  setInterval(runAssessmentTtsQueue, appConfig.KITABU_TTS_POLL_INTERVAL_MS);
}

function scheduleDailyGeminiTtsQueue() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(appConfig.KITABU_GEMINI_TTS_DAILY_WORKER_HOUR_UTC, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const delayMs = Math.max(1_000, next.getTime() - now.getTime());
  setTimeout(() => {
    processGeminiTtsQueue().then(result => {
      console.info('[worker] processed daily Gemini TTS queue', result);
    }).catch(error => {
      console.error('[worker] daily Gemini TTS queue failed', error);
    }).finally(scheduleDailyGeminiTtsQueue);
  }, delayMs);
  console.info('[worker] daily Gemini TTS queue scheduled', { at: next.toISOString(), delayMs });
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
