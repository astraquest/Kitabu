import { createHash } from 'node:crypto';
import { appConfig } from './config.js';
import { synthesizeSpeechWithGemini } from './ai.js';
import { claimTtsJobs, completeTtsJob, failTtsJob, withTransaction } from './repositories.js';
import { newTtsWorkerId } from './speechQueue.js';

export async function processTtsJobs(workerId = newTtsWorkerId()) {
  const jobs = await withTransaction(client => claimTtsJobs(
    client,
    appConfig.KITABU_TTS_WORKER_BATCH_SIZE,
    workerId,
    appConfig.KITABU_TTS_WORKER_LEASE_SECONDS
  ));
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const result = await synthesizeSpeechWithGemini({
        text: job.normalized_text,
        voice: job.avatar_voice
      });
      const audio = Buffer.from(result.base64Audio, 'base64');
      const contentHash = createHash('sha256').update(audio).digest('hex');
      await withTransaction(async client => {
        await completeTtsJob(client, job.id, audio, result.mimeType, contentHash, workerId);
      });
      completed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await withTransaction(client => failTtsJob(
        client,
        job.id,
        message.slice(0, 2_000),
        appConfig.KITABU_TTS_MAX_ATTEMPTS,
        appConfig.KITABU_TTS_RETRY_DELAY_SECONDS,
        workerId
      ));
      failed += 1;
      console.warn('[tts] job failed', { jobId: job.id, attempts: job.attempts, message });
    }
  }

  return { claimed: jobs.length, completed, failed, mode: 'worker-fallback' as const };
}
