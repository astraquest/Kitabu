import { createHash, randomUUID } from 'node:crypto';
import { appConfig } from './config.js';
import {
  GEMINI_TTS_VOICE_BY_AVATAR,
  synthesizeSpeechWithGemini,
  type TextToSpeechResult
} from './ai.js';
import { db } from './db.js';
import {
  completeTtsJob,
  enqueueTtsJob,
  getTtsArtifact,
  type TtsArtifactRecord,
  withTransaction
} from './repositories.js';
import { LANDING_ONBOARDING_TTS_CUES } from './onboardingTts.js';

export const TTS_QUEUE_MODE = 'worker-fallback' as const;
export const TTS_AVATAR_VOICES = Object.keys(GEMINI_TTS_VOICE_BY_AVATAR);

export function normalizeSpokenText(text: string) {
  return text.trim().replace(/\s+/g, ' ');
}

export function buildTtsArtifactKey(text: string, avatarVoice: string, geminiModel: string) {
  const normalizedText = normalizeSpokenText(text);
  const selectedVoice = avatarVoice.trim();
  const model = geminiModel.trim();
  const cacheKey = createHash('sha256')
    .update(JSON.stringify({ normalizedText, selectedVoice, model }))
    .digest('hex');
  return { cacheKey, normalizedText, avatarVoice: selectedVoice, geminiModel: model };
}

function splitSpokenText(text: string, maxLength = 4_000) {
  const normalized = normalizeSpokenText(text);
  if (normalized.length <= maxLength) return normalized ? [normalized] : [];

  const chunks: string[] = [];
  let remaining = normalized;
  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf(' ', maxLength);
    if (splitAt < Math.floor(maxLength * 0.6)) splitAt = maxLength;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export function spokenCuesFromQuestions(
  questions: Array<{ text?: string; explanation?: string }>
) {
  return questions.flatMap(question => question.text ? [question.text] : []);
}

export function isReadyTtsArtifact(
  artifact: TtsArtifactRecord | null
): artifact is TtsArtifactRecord & {
  status: 'ready';
  audio_data: Buffer;
  mime_type: string;
  content_hash: string;
} {
  return Boolean(
    artifact?.status === 'ready' &&
    artifact.audio_data?.length &&
    artifact.mime_type?.trim() &&
    artifact.content_hash?.trim()
  );
}

export interface OnboardingTtsPreparationDependencies {
  getArtifact: (cacheKey: string) => Promise<TtsArtifactRecord | null>;
  enqueue: (input: {
    cacheKey: string;
    normalizedText: string;
    avatarVoice: string;
    geminiVoice: string;
    geminiModel: string;
  }) => Promise<unknown>;
}

export interface OnboardingTtsPreparationResult {
  total: number;
  ready: number;
  enqueued: number;
  failed: number;
}

/**
 * Reads each deterministic artifact before enqueueing it. The database's
 * unique cache/job constraints make a repeated preparation run idempotent.
 */
export async function prepareOnboardingTts(
  dependencies: OnboardingTtsPreparationDependencies = {
    getArtifact: cacheKey => getTtsArtifact(db, cacheKey),
    enqueue: input => withTransaction(client => enqueueTtsJob(client, input))
  }
): Promise<OnboardingTtsPreparationResult> {
  const result: OnboardingTtsPreparationResult = { total: 0, ready: 0, enqueued: 0, failed: 0 };

  for (const cue of LANDING_ONBOARDING_TTS_CUES) {
    for (const avatarVoice of TTS_AVATAR_VOICES) {
      result.total += 1;
      const identity = buildTtsArtifactKey(cue.text, avatarVoice, appConfig.KITABU_GEMINI_TTS_MODEL);
      const existing = await dependencies.getArtifact(identity.cacheKey);
      if (isReadyTtsArtifact(existing)) {
        result.ready += 1;
        continue;
      }

      try {
        await dependencies.enqueue({
          cacheKey: identity.cacheKey,
          normalizedText: identity.normalizedText,
          avatarVoice: identity.avatarVoice,
          geminiVoice: GEMINI_TTS_VOICE_BY_AVATAR[avatarVoice],
          geminiModel: identity.geminiModel
        });
        result.enqueued += 1;
      } catch (error) {
        result.failed += 1;
        console.warn('[tts] onboarding preparation failed', {
          cueId: cue.id,
          avatarVoice,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  return result;
}

export async function enqueueSpeechCues(texts: string[], source: string) {
  const cues = texts.flatMap(splitSpokenText);
  if (cues.length === 0) return { enqueued: 0, source, mode: TTS_QUEUE_MODE };

  const results = await Promise.allSettled(
    cues.flatMap(text => TTS_AVATAR_VOICES.map(async avatarVoice => {
      const identity = buildTtsArtifactKey(text, avatarVoice, appConfig.KITABU_GEMINI_TTS_MODEL);
      const geminiVoice = GEMINI_TTS_VOICE_BY_AVATAR[avatarVoice];
      await withTransaction(client => enqueueTtsJob(client, {
        cacheKey: identity.cacheKey,
        normalizedText: identity.normalizedText,
        avatarVoice: identity.avatarVoice,
        geminiVoice,
        geminiModel: identity.geminiModel
      }));
    }))
  );
  const rejected = results.filter(result => result.status === 'rejected');
  if (rejected.length > 0) {
    console.warn('[tts] queue enqueue degraded', { source, failed: rejected.length, total: results.length });
  }
  return { enqueued: results.length - rejected.length, source, mode: TTS_QUEUE_MODE };
}

export interface DurableSpeechDependencies {
  getArtifact: (cacheKey: string) => Promise<TtsArtifactRecord | null>;
  synthesize: (input: { text: string; voice: string }) => Promise<TextToSpeechResult>;
  persist: (identity: ReturnType<typeof buildTtsArtifactKey>, generated: TextToSpeechResult) => Promise<void>;
}

function readySpeechFromArtifact(artifact: TtsArtifactRecord | null) {
  if (!isReadyTtsArtifact(artifact)) {
    return null;
  }
  return {
    base64Audio: artifact.audio_data.toString('base64'),
    mimeType: artifact.mime_type,
    model: artifact.gemini_model,
    voice: artifact.gemini_voice
  } satisfies TextToSpeechResult;
}

export async function getOrCreateDurableSpeech(
  input: { text: string; avatarVoice: string },
  dependencies?: Partial<DurableSpeechDependencies>
) {
  const identity = buildTtsArtifactKey(input.text, input.avatarVoice, appConfig.KITABU_GEMINI_TTS_MODEL);
  const getArtifact = dependencies?.getArtifact ?? (cacheKey => getTtsArtifact(db, cacheKey));
  let existing = await getArtifact(identity.cacheKey);
  let cachedAudio = readySpeechFromArtifact(existing);
  if (cachedAudio) {
    return {
      cacheHit: true,
      artifactKey: identity.cacheKey,
      audio: cachedAudio
    };
  }

  if (existing?.status === 'processing') {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
      existing = await getArtifact(identity.cacheKey);
      cachedAudio = readySpeechFromArtifact(existing);
      if (cachedAudio) {
        return { cacheHit: true, artifactKey: identity.cacheKey, audio: cachedAudio };
      }
    }
  }

  const generated = await (dependencies?.synthesize ?? synthesizeSpeechWithGemini)({
    text: identity.normalizedText,
    voice: identity.avatarVoice
  });
  if (dependencies?.persist) {
    await dependencies.persist(identity, generated);
  } else {
    const audioData = Buffer.from(generated.base64Audio, 'base64');
    const contentHash = createHash('sha256').update(audioData).digest('hex');
    await withTransaction(async client => {
      const queued = await enqueueTtsJob(client, {
        cacheKey: identity.cacheKey,
        normalizedText: identity.normalizedText,
        avatarVoice: identity.avatarVoice,
        geminiVoice: generated.voice,
        geminiModel: generated.model
      });
      if (queued.job) {
        await completeTtsJob(client, queued.job.id, audioData, generated.mimeType, contentHash);
      }
    });
  }

  return { cacheHit: false, artifactKey: identity.cacheKey, audio: generated };
}

export function newTtsWorkerId() {
  return `tts-worker-${process.pid}-${randomUUID()}`;
}
