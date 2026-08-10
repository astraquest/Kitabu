import { createHash } from 'node:crypto';
import { appConfig } from './config.js';
import { db } from './db.js';
import {
  claimTtsJobs,
  completeTtsJobWithStorage,
  failTtsJob,
  getTtsQueueDepth,
  releaseTtsJobPending,
  reserveGeminiTtsDailyUsage,
  type TtsJobRecord,
  withTransaction
} from './repositories.js';
import { createTtsAssetStorage, type TtsAssetStorage } from './ttsStorage.js';
import { createTtsProviders, TtsProviderError, type TtsProvider, type TtsProviderInput, type TtsProviderResult } from './ttsProviders.js';
import { newTtsWorkerId } from './speechQueue.js';

export interface QueueProcessorDependencies {
  claim: (limit: number, workerId: string, leaseSeconds: number, provider: 'cartesia' | 'gemini') => Promise<TtsJobRecord[]>;
  synthesize: (provider: TtsProvider, input: TtsProviderInput) => Promise<TtsProviderResult>;
  finalize: (job: TtsJobRecord, generated: TtsProviderResult, workerId: string) => Promise<unknown>;
  release: (job: TtsJobRecord, message: string, delaySeconds: number, workerId: string, provider: 'cartesia' | 'gemini') => Promise<unknown>;
  fail: (job: TtsJobRecord, message: string, workerId: string) => Promise<unknown>;
  reserveGemini: (input: { now: Date; budget: number; spacingMs: number; characters: number }) => Promise<{ reserved: boolean }>;
  queueDepth: () => Promise<{ pending: number; processing: number }>;
  storage: TtsAssetStorage;
  providers: { cartesia: TtsProvider; gemini: TtsProvider };
}

function defaultDependencies(): QueueProcessorDependencies {
  const storage = createTtsAssetStorage();
  const providers = createTtsProviders();
  return {
    claim: (limit, workerId, leaseSeconds, provider) => withTransaction(client => claimTtsJobs(client, limit, workerId, leaseSeconds, provider)),
    synthesize: (provider, input) => provider.synthesize(input),
    finalize: async (job, generated, workerId) => {
      const storageKey = `tts/${job.identity_key ?? job.artifact_id}.wav`;
      await storage.put(storageKey, generated.bytes);
      const contentHash = createHash('sha256').update(generated.bytes).digest('hex');
      return withTransaction(client => completeTtsJobWithStorage(client, job.id, {
        mimeType: generated.mimeType,
        contentHash,
        provider: generated.metadata.provider === 'gemini' ? 'gemini' : job.provider === 'gemini' ? 'gemini' : 'cartesia',
        model: generated.model,
        voice: generated.voice,
        durationMs: generated.durationMs,
        storageBackend: storage.backend,
        storageKey,
        storageUrl: storage.publicUrl(storageKey),
        metadata: generated.metadata
      }, workerId));
    },
    release: (job, message, delaySeconds, workerId, provider) => withTransaction(client => releaseTtsJobPending(client, job.id, message, delaySeconds, workerId, provider)),
    fail: (job, message, workerId) => withTransaction(client => failTtsJob(client, job.id, message, appConfig.KITABU_TTS_MAX_ATTEMPTS, appConfig.KITABU_TTS_RETRY_DELAY_SECONDS, workerId)),
    reserveGemini: input => withTransaction(client => reserveGeminiTtsDailyUsage(client, input)),
    queueDepth: () => getTtsQueueDepth(db),
    storage,
    providers
  };
}

function providerInput(job: TtsJobRecord): TtsProviderInput {
  return { text: job.normalized_text, language: job.language || 'en', voice: job.avatar_voice };
}

async function processCartesiaQueue(
  options: { limit?: number; workerId?: string; dependencies?: QueueProcessorDependencies } = {}
) {
  const dependencies = options.dependencies ?? defaultDependencies();
  const workerId = options.workerId ?? newTtsWorkerId();
  const jobs = await dependencies.claim(options.limit ?? appConfig.KITABU_TTS_WORKER_BATCH_SIZE, workerId, appConfig.KITABU_TTS_WORKER_LEASE_SECONDS, 'cartesia');
  let completed = 0;
  let deferred = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      const generated = await dependencies.synthesize(dependencies.providers.cartesia, providerInput(job));
      await dependencies.finalize(job, generated, workerId);
      completed += 1;
      console.info('[tts] Cartesia worker generation completed', { jobId: job.id, model: generated.model, estimatedCharacters: job.normalized_text.length });
    } catch (error) {
      const providerError = error instanceof TtsProviderError ? error : null;
      const message = error instanceof Error ? error.message : String(error);
      if (providerError && providerError.kind !== 'invalid') {
        await dependencies.release(job, message, providerError.retryAfterMs ? Math.ceil(providerError.retryAfterMs / 1000) : appConfig.KITABU_TTS_RETRY_DELAY_SECONDS, workerId, 'gemini');
        deferred += 1;
        continue;
      }
      await dependencies.fail(job, message.slice(0, 2_000), workerId);
      failed += 1;
      console.warn('[tts] Cartesia job failed', { jobId: job.id, message });
    }
  }
  const queueDepth = await dependencies.queueDepth();
  return { claimed: jobs.length, completed, deferred, failed, queueDepth, mode: 'cartesia-primary' as const };
}

export async function processGeminiTtsQueue(
  options: {
    limit?: number;
    now?: Date;
    workerId?: string;
    dependencies?: QueueProcessorDependencies;
  } = {}
) {
  const dependencies = options.dependencies ?? defaultDependencies();
  const workerId = options.workerId ?? newTtsWorkerId();
  const now = options.now ?? new Date();
  const requestedLimit = options.limit ?? appConfig.KITABU_GEMINI_TTS_DAILY_REQUEST_BUDGET;
  if (requestedLimit <= 0 || appConfig.KITABU_GEMINI_TTS_DAILY_REQUEST_BUDGET <= 0) {
    return { claimed: 0, completed: 0, deferred: 0, failed: 0, stopped: 'daily-budget-disabled' as const, queueDepth: await dependencies.queueDepth(), mode: 'gemini-daily-overflow' as const };
  }
  const claimLimit = Math.min(requestedLimit, appConfig.KITABU_GEMINI_TTS_DAILY_REQUEST_BUDGET);
  const jobs = await dependencies.claim(claimLimit, workerId, appConfig.KITABU_TTS_WORKER_LEASE_SECONDS, 'gemini');
  let completed = 0;
  let deferred = 0;
  let failed = 0;
  let stopped: string | undefined;

  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    const reserved = await dependencies.reserveGemini({
      now,
      budget: appConfig.KITABU_GEMINI_TTS_DAILY_REQUEST_BUDGET,
      spacingMs: appConfig.KITABU_GEMINI_TTS_RPM_SPACING_MS,
      characters: job.normalized_text.length
    });
    if (!reserved.reserved) {
      for (const pendingJob of jobs.slice(index)) {
        await dependencies.release(pendingJob, 'Gemini daily budget or RPM spacing is not available', Math.ceil(appConfig.KITABU_GEMINI_TTS_RPM_SPACING_MS / 1000), workerId, 'gemini');
        deferred += 1;
      }
      stopped = 'daily-budget-or-rpm-spacing';
      break;
    }

    try {
      const generated = await dependencies.synthesize(dependencies.providers.gemini, providerInput(job));
      await dependencies.finalize(job, generated, workerId);
      completed += 1;
      console.info('[tts] Gemini worker generation completed', { jobId: job.id, model: generated.model, dailyConsumed: completed });
    } catch (error) {
      const providerError = error instanceof TtsProviderError ? error : null;
      const message = error instanceof Error ? error.message : String(error);
      if (providerError?.kind === 'quota' || providerError?.kind === 'rate_limit') {
        for (const pendingJob of jobs.slice(index)) {
          await dependencies.release(pendingJob, message, appConfig.KITABU_TTS_RETRY_DELAY_SECONDS, workerId, 'gemini');
          deferred += 1;
        }
        stopped = providerError.kind;
        break;
      }
      await dependencies.fail(job, message.slice(0, 2_000), workerId);
      failed += 1;
      console.warn('[tts] Gemini job failed', { jobId: job.id, message });
    }
  }
  const queueDepth = await dependencies.queueDepth();
  return { claimed: jobs.length, completed, deferred, failed, stopped, queueDepth, mode: 'gemini-daily-overflow' as const };
}

export async function processTtsJobs(
  workerId = newTtsWorkerId(),
  options: { limit?: number; dependencies?: QueueProcessorDependencies } = {}
) {
  return processCartesiaQueue({ workerId, limit: options.limit, dependencies: options.dependencies });
}
