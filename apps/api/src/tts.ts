import { randomUUID } from 'node:crypto';
import { db, redis } from './db.js';
import { appConfig } from './config.js';
import { buildNarrationIdentity, NARRATION_VOICES, type AssessmentNarrationInput, type NarrationProfile } from './ttsIdentity.js';
import {
  extractGeminiPcmFromBatch,
  extractGeminiPcmFromJsonl,
  getGeminiBatchLifecycle,
  getGeminiResponsesFile,
  type GeminiBatch
} from './ttsGemini.js';

export { buildNarrationIdentity, NARRATION_VOICES, normalizeNarrationText } from './ttsIdentity.js';
export { composeAssessmentQuestionNarration } from './ttsIdentity.js';
export type { AssessmentNarrationInput, NarrationProfile } from './ttsIdentity.js';

export const ASSESSMENT_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
export const TTS_PROVIDER = 'gemini-batch';

export type NarrationSegment = 'question' | 'prompt' | 'choice' | 'feedback' | 'explanation';

export type AssessmentNarrationResolution =
  | { status: 'ready'; url: string; durationMs: number | null; identitySha256: string }
  | { status: 'pending'; identitySha256: string }
  | { status: 'unavailable'; identitySha256?: string; reason: string };

type TtsAssetRow = {
  identity_sha256: string;
  status: 'queued' | 'processing' | 'ready' | 'failed' | 'unavailable';
  public_url: string | null;
  duration_ms: number | null;
};


export function isAssessmentTtsConfigured() {
  return Boolean(
    appConfig.KITABU_GEMINI_API_KEY &&
    appConfig.KITABU_SUPABASE_URL &&
    appConfig.KITABU_SUPABASE_SERVICE_ROLE_KEY
  );
}

function geminiHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-goog-api-key': appConfig.KITABU_GEMINI_API_KEY ?? ''
  };
}

async function geminiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${appConfig.KITABU_GEMINI_API_BASE_URL}${path}`, {
    ...init,
    headers: { ...geminiHeaders(), ...(init.headers ?? {}) },
    signal: init.signal ?? AbortSignal.timeout(30_000)
  });
  const body = await response.text();
  let parsed: unknown = null;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const message = parsed && typeof parsed === 'object' && 'error' in parsed
      ? String((parsed as { error?: { message?: string } }).error?.message ?? body)
      : body;
    throw new Error(`Gemini Batch API ${response.status}: ${message.slice(0, 300)}`);
  }
  return parsed as T;
}

function toGeminiRequest(asset: ReturnType<typeof buildNarrationIdentity>) {
  return {
    model: `models/${ASSESSMENT_TTS_MODEL}`,
    contents: [{ role: 'user', parts: [{ text: `[${asset.speakingSettings.style}] ${asset.canonicalText}` }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        languageCode: asset.languageCode,
        voiceConfig: { prebuiltVoiceConfig: { voiceName: asset.providerVoice } }
      }
    }
  };
}

export class GeminiBatchTtsProvider {
  async submit(identity: ReturnType<typeof buildNarrationIdentity>, submissionToken: string) {
    const batch = await geminiRequest<GeminiBatch>(`/v1beta/models/${ASSESSMENT_TTS_MODEL}:batchGenerateContent`, {
      method: 'POST',
      body: JSON.stringify({
        batch: {
          displayName: `kitabu-assessment-tts-${submissionToken}`,
          inputConfig: {
            requests: {
              requests: [{
                request: toGeminiRequest(identity),
                metadata: { identitySha256: identity.identitySha256, submissionToken }
              }]
            }
          }
        }
      })
    });
    if (!batch.name) {
      throw new Error('Gemini Batch API did not return a job name');
    }
    return { name: batch.name, metadata: batch };
  }

  async reconcile(submissionToken: string) {
    const result = await geminiRequest<{ batches?: GeminiBatch[] }>(
      `/v1beta/batches?pageSize=100&filter=${encodeURIComponent(`displayName="kitabu-assessment-tts-${submissionToken}"`)}`
    );
    const matching = result.batches?.find(batch => batch.name);
    return matching?.name ? { name: matching.name, metadata: matching } : null;
  }

  async poll(jobName: string) {
    return geminiRequest<GeminiBatch>(`/v1beta/${jobName}`);
  }

  async downloadAudio(batch: GeminiBatch, identitySha256?: string) {
    const inlineAudio = extractGeminiPcmFromBatch(batch, identitySha256);
    if (inlineAudio) return inlineAudio;

    const fileName = getGeminiResponsesFile(batch);
    if (!fileName) {
      throw new Error('Gemini Batch API completed without an audio output file');
    }
    const response = await fetch(`${appConfig.KITABU_GEMINI_API_BASE_URL}/download/v1beta/${fileName}:download?alt=media`, {
      headers: geminiHeaders(),
      signal: AbortSignal.timeout(60_000)
    });
    if (!response.ok) {
      throw new Error(`Gemini output download failed with ${response.status}`);
    }
    const audio = extractGeminiPcmFromJsonl(await response.text(), identitySha256);
    if (!audio) {
      throw new Error('Gemini output did not contain inline audio');
    }
    return audio;
  }
}

function pcmToWav(pcm: Buffer, sampleRate = 24_000, channels = 1, bitsPerSample = 16) {
  const blockAlign = channels * bitsPerSample / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function uploadWav(identitySha256: string, wav: Buffer) {
  if (!appConfig.KITABU_SUPABASE_URL || !appConfig.KITABU_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase TTS storage is not configured');
  }
  const storagePath = `assessment/${identitySha256}.wav`;
  const endpoint = `${appConfig.KITABU_SUPABASE_URL}/storage/v1/object/${appConfig.KITABU_TTS_STORAGE_BUCKET}/${storagePath}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${appConfig.KITABU_SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: appConfig.KITABU_SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'audio/wav',
      'x-upsert': 'false',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': 'inline'
    },
    body: new Uint8Array(wav) as BodyInit,
    signal: AbortSignal.timeout(60_000)
  });
  if (!response.ok && response.status !== 409) {
    throw new Error(`Supabase Storage upload failed with ${response.status}`);
  }
  const publicBase = appConfig.KITABU_TTS_PUBLIC_BASE_URL ?? `${appConfig.KITABU_SUPABASE_URL}/storage/v1/object/public/${appConfig.KITABU_TTS_STORAGE_BUCKET}`;
  return { storagePath, publicUrl: `${publicBase.replace(/\/$/, '')}/${storagePath}` };
}

export async function ensureAssessmentNarration(input: AssessmentNarrationInput): Promise<AssessmentNarrationResolution> {
  const identity = buildNarrationIdentity(input);
  if (!isAssessmentTtsConfigured()) {
    return { status: 'unavailable', identitySha256: identity.identitySha256, reason: 'tts_not_configured' };
  }

  const existing = await db.query<TtsAssetRow>(
    `SELECT identity_sha256, status, public_url, duration_ms FROM tts_assets WHERE identity_sha256 = $1`,
    [identity.identitySha256]
  );
  const row = existing.rows[0];
  if (row?.status === 'ready' && row.public_url) {
    return { status: 'ready', url: row.public_url, durationMs: row.duration_ms, identitySha256: identity.identitySha256 };
  }
  if (!row) {
    await db.query(
      `INSERT INTO tts_assets (
         identity_sha256, canonical_text, language_code, voice_profile, provider_voice,
         speaking_settings, provider, model
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
       ON CONFLICT (identity_sha256) DO NOTHING`,
      [identity.identitySha256, identity.canonicalText, identity.languageCode, identity.profile, identity.providerVoice, JSON.stringify(identity.speakingSettings), TTS_PROVIDER, ASSESSMENT_TTS_MODEL]
    );
    await db.query(
      `INSERT INTO tts_jobs (identity_sha256, provider, model, provider_submission_token)
       VALUES ($1, $2, $3, $4) ON CONFLICT (identity_sha256) DO NOTHING`,
      [identity.identitySha256, TTS_PROVIDER, ASSESSMENT_TTS_MODEL, randomUUID()]
    );
    await db.query(
      `INSERT INTO tts_queue (identity_sha256, priority)
       VALUES ($1, 10) ON CONFLICT (identity_sha256) DO NOTHING`,
      [identity.identitySha256]
    );
  }
  return { status: 'pending', identitySha256: identity.identitySha256 };
}

async function markQueueRetry(identitySha256: string, message: string) {
  await db.query(
    `UPDATE tts_queue SET status = 'queued', available_at = NOW() + $2::interval,
       locked_by = NULL, lease_expires_at = NULL, last_error = $3, updated_at = NOW()
     WHERE identity_sha256 = $1`,
    [identitySha256, '30 seconds', message.slice(0, 300)]
  );
}

async function finishAsset(identitySha256: string, status: 'ready' | 'failed' | 'unavailable', details: { errorCode?: string; errorMessage?: string; url?: string; path?: string; durationMs?: number; bytes?: number; metadata?: unknown } = {}) {
  await db.query(
    `UPDATE tts_assets SET status = $2, public_url = COALESCE($3, public_url), storage_path = COALESCE($4, storage_path),
       duration_ms = COALESCE($5, duration_ms), byte_size = COALESCE($6, byte_size),
       provider_metadata = COALESCE($7::jsonb, provider_metadata), error_code = $8, error_message = $9,
       completed_at = CASE WHEN $2 IN ('ready', 'failed', 'unavailable') THEN NOW() ELSE completed_at END, updated_at = NOW()
     WHERE identity_sha256 = $1`,
    [identitySha256, status, details.url ?? null, details.path ?? null, details.durationMs ?? null, details.bytes ?? null, details.metadata ? JSON.stringify(details.metadata) : null, details.errorCode ?? null, details.errorMessage?.slice(0, 500) ?? null]
  );
  await db.query(`UPDATE tts_queue SET status = $2, locked_by = NULL, lease_expires_at = NULL, updated_at = NOW() WHERE identity_sha256 = $1`, [identitySha256, status === 'ready' ? 'done' : 'failed']);
}

async function processTtsItem(identitySha256: string, workerId: string, provider: GeminiBatchTtsProvider) {
  const lockKey = `kitabu:tts:lease:${identitySha256}`;
  const acquired = await redis.set(lockKey, workerId, 'PX', 120_000, 'NX');
  if (acquired !== 'OK') return;
  try {
    const result = await db.query<{
      canonical_text: string; language_code: string; voice_profile: NarrationProfile; provider_voice: string;
      speaking_settings: { pitch?: number; speakingRate?: number; style?: string }; provider_job_name: string | null;
      provider_submission_token: string; status: string; provider_metadata: Record<string, unknown>;
    }>(
      `SELECT a.canonical_text, a.language_code, a.voice_profile, a.provider_voice, a.speaking_settings,
              j.provider_job_name, j.provider_submission_token, j.status, j.provider_metadata
       FROM tts_assets a JOIN tts_jobs j ON j.identity_sha256 = a.identity_sha256
       WHERE a.identity_sha256 = $1`, [identitySha256]
    );
    const item = result.rows[0];
    if (!item) return;
    const identity = buildNarrationIdentity({
      text: item.canonical_text,
      languageCode: item.language_code,
      profile: item.voice_profile,
      speakingRate: item.speaking_settings?.speakingRate,
      pitch: item.speaking_settings?.pitch,
      style: item.speaking_settings?.style
    });
    let providerJobName = item.provider_job_name;
    let batch: GeminiBatch | null = null;
    if (!providerJobName) {
      if (item.status === 'submitting' || item.status === 'uncertain' || item.provider_metadata?.submissionStartedAt) {
        const reconciled = await provider.reconcile(item.provider_submission_token);
        if (!reconciled) {
          await finishAsset(identitySha256, 'unavailable', { errorCode: 'submission_uncertain', errorMessage: 'Gemini submission could not be reconciled without a duplicate retry.' });
          return;
        }
        providerJobName = reconciled.name;
        await db.query(`UPDATE tts_jobs SET provider_job_name = $2, status = 'submitted', provider_metadata = $3::jsonb, updated_at = NOW() WHERE identity_sha256 = $1`, [identitySha256, providerJobName, JSON.stringify(reconciled.metadata)]);
      } else {
        await db.query(`UPDATE tts_jobs SET status = 'submitting', provider_metadata = provider_metadata || $2::jsonb, updated_at = NOW() WHERE identity_sha256 = $1 AND status = 'queued'`, [identitySha256, JSON.stringify({ submissionStartedAt: new Date().toISOString() })]);
        try {
          const submitted = await provider.submit(identity, item.provider_submission_token);
          providerJobName = submitted.name;
          await db.query(`UPDATE tts_jobs SET provider_job_name = $2, status = 'submitted', submitted_at = NOW(), provider_metadata = $3::jsonb, updated_at = NOW() WHERE identity_sha256 = $1`, [identitySha256, providerJobName, JSON.stringify(submitted.metadata)]);
        } catch (error) {
          await db.query(`UPDATE tts_jobs SET status = 'uncertain', error_code = 'submission_uncertain', error_message = $2, updated_at = NOW() WHERE identity_sha256 = $1`, [identitySha256, error instanceof Error ? error.message : 'Gemini submission failed']);
          await finishAsset(identitySha256, 'unavailable', { errorCode: 'submission_uncertain', errorMessage: 'Gemini submission outcome is uncertain; no automatic duplicate submission was attempted.' });
          return;
        }
      }
    }

    batch = await provider.poll(providerJobName);
    await db.query(`UPDATE tts_jobs SET status = 'polling', last_polled_at = NOW(), provider_metadata = $2::jsonb, updated_at = NOW() WHERE identity_sha256 = $1`, [identitySha256, JSON.stringify(batch)]);
    const batchLifecycle = getGeminiBatchLifecycle(batch);
    if (batchLifecycle === 'pending') {
      await markQueueRetry(identitySha256, 'Gemini batch is still processing');
      return;
    }
    if (batchLifecycle === 'failed') {
      const batchState = batch.metadata?.state ?? batch.state;
      await finishAsset(identitySha256, 'failed', { errorCode: 'gemini_batch_failed', errorMessage: batch.error?.message ?? `Gemini batch ended in ${batchState}` });
      await db.query(`UPDATE tts_jobs SET status = 'failed', error_code = 'gemini_batch_failed', error_message = $2, updated_at = NOW() WHERE identity_sha256 = $1`, [identitySha256, batch.error?.message ?? `Gemini batch ended in ${batchState}`]);
      return;
    }
    const audio = await provider.downloadAudio(batch, identitySha256);
    const wav = pcmToWav(audio.pcm);
    const storage = await uploadWav(identitySha256, wav);
    await finishAsset(identitySha256, 'ready', { path: storage.storagePath, url: storage.publicUrl, durationMs: Math.round(audio.pcm.length / (24_000 * 2) * 1000), bytes: wav.length, metadata: { ...batch, mimeType: audio.metadata.mimeType } });
    await db.query(`UPDATE tts_jobs SET status = 'completed', updated_at = NOW() WHERE identity_sha256 = $1`, [identitySha256]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TTS worker failed';
    await markQueueRetry(identitySha256, message);
    console.warn('[tts] worker item failed', { identitySha256, state: 'retrying', error: message.slice(0, 200) });
  } finally {
    await redis.del(lockKey);
  }
}

export async function processAssessmentTtsQueue() {
  if (!isAssessmentTtsConfigured()) return 0;
  const workerId = `tts-worker-${randomUUID()}`;
  const claimed = await db.query<{ identity_sha256: string }>(
    `WITH claim AS (
       SELECT identity_sha256 FROM tts_queue
       WHERE (status = 'queued' AND available_at <= NOW())
          OR (status = 'processing' AND lease_expires_at < NOW())
       ORDER BY priority DESC, created_at ASC
       FOR UPDATE SKIP LOCKED LIMIT $1
     )
     UPDATE tts_queue q SET status = 'processing', locked_by = $2, lease_expires_at = NOW() + INTERVAL '2 minutes', attempts = attempts + 1, updated_at = NOW()
     FROM claim WHERE q.identity_sha256 = claim.identity_sha256
     RETURNING q.identity_sha256`,
    [appConfig.KITABU_TTS_QUEUE_BATCH_SIZE, workerId]
  );
  const provider = new GeminiBatchTtsProvider();
  await Promise.all(claimed.rows.map(row => processTtsItem(row.identity_sha256, workerId, provider)));
  return claimed.rows.length;
}
