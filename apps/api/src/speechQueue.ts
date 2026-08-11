import { createHash, randomUUID } from 'node:crypto';
import { appConfig } from './config.js';
import {
  GEMINI_TTS_VOICE_BY_AVATAR,
  type TextToSpeechResult
} from './ai.js';
import { db } from './db.js';
import {
  claimTtsJobs,
  completeTtsJobWithStorage,
  enqueueTtsJob,
  getTtsArtifact,
  releaseTtsJobPending,
  type TtsArtifactRecord,
  withTransaction
} from './repositories.js';
import { LANDING_ONBOARDING_TTS_CUES } from './onboardingTts.js';
import { createTtsAssetStorage, type TtsAssetStorage } from './ttsStorage.js';
import { createTtsProviders, TtsProviderError, type TtsProviderInput, type TtsProviderResult } from './ttsProviders.js';

export const TTS_QUEUE_MODE = 'worker-fallback' as const;
export const TTS_AVATAR_VOICES = Object.keys(GEMINI_TTS_VOICE_BY_AVATAR);

export interface TtsIdentityInput {
  text: string;
  language: string;
  voice: string;
  speakingSettings?: Record<string, unknown>;
  pronunciationSettings?: Record<string, unknown>;
}

export interface TtsIdentity {
  cacheKey: string;
  identityKey: string;
  normalizedText: string;
  language: string;
  avatarVoice: string;
  speakingSettings: Record<string, unknown>;
  pronunciationSettings: Record<string, unknown>;
}

export function normalizeSpokenText(text: string) {
  return text.trim().replace(/\s+/g, ' ');
}

function normalizeLanguage(language: string | undefined) {
  return (language?.trim() || 'en').toLowerCase();
}

function normalizeSettings(value: Record<string, unknown> | undefined) {
  return value ?? {};
}

export function buildTtsArtifactKey(input: TtsIdentityInput): TtsIdentity;
export function buildTtsArtifactKey(text: string, avatarVoice: string, legacyModel?: string): TtsIdentity;
export function buildTtsArtifactKey(
  inputOrText: TtsIdentityInput | string,
  avatarVoice?: string,
  _legacyModel?: string
): TtsIdentity {
  const input: TtsIdentityInput = typeof inputOrText === 'string'
    ? { text: inputOrText, language: 'en', voice: avatarVoice ?? '' }
    : inputOrText;
  const normalizedText = normalizeSpokenText(input.text);
  const language = normalizeLanguage(input.language);
  const selectedVoice = input.voice.trim();
  const speakingSettings = normalizeSettings(input.speakingSettings);
  const pronunciationSettings = normalizeSettings(input.pronunciationSettings);
  const identityPayload = { normalizedText, language, selectedVoice, speakingSettings, pronunciationSettings };
  const identityKey = createHash('sha256').update(JSON.stringify(identityPayload)).digest('hex');
  return {
    cacheKey: identityKey,
    identityKey,
    normalizedText,
    language,
    avatarVoice: selectedVoice,
    speakingSettings,
    pronunciationSettings
  };
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

export function spokenCuesFromQuestions(questions: Array<{ text?: string; explanation?: string }>) {
  return questions.flatMap(question => question.text ? [question.text] : []);
}

export function isReadyTtsArtifact(
  artifact: TtsArtifactRecord | null
): artifact is TtsArtifactRecord & { status: 'ready'; mime_type: string; content_hash: string } {
  return Boolean(
    artifact?.status === 'ready' &&
    (artifact.audio_data?.length || artifact.storage_key?.trim()) &&
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
    language?: string;
    provider?: 'cartesia' | 'gemini';
  }) => Promise<unknown>;
}

export interface OnboardingTtsRepairDependencies {
  getArtifact: (cacheKey: string) => Promise<TtsArtifactRecord | null>;
  storage: TtsAssetStorage;
  enqueue: (input: {
    cacheKey: string;
    normalizedText: string;
    avatarVoice: string;
    geminiVoice: string;
    geminiModel: string;
    language?: string;
    provider?: 'cartesia' | 'gemini';
    model?: string;
    voice?: string;
    repairReadyMissingStorage?: boolean;
  }) => Promise<unknown>;
}

export interface OnboardingTtsPreparationResult {
  total: number;
  ready: number;
  enqueued: number;
  failed: number;
}

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
      const identity = buildTtsArtifactKey({ text: cue.text, language: 'en', voice: avatarVoice });
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
          geminiModel: appConfig.KITABU_GEMINI_TTS_MODEL,
          language: identity.language,
          provider: 'cartesia'
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

export interface OnboardingTtsRepairResult {
  total: number;
  ready: number;
  present: number;
  missing: number;
  requeued: number;
  failed: number;
}

/**
 * Repair only ready English landing/onboarding artifacts whose storage object
 * has been verified missing. Pending and non-storage-backed rows remain under
 * the normal preparation/worker paths.
 */
export async function repairMissingOnboardingTts(
  dependencies: OnboardingTtsRepairDependencies = {
    getArtifact: cacheKey => getTtsArtifact(db, cacheKey),
    storage: createTtsAssetStorage(),
    enqueue: input => withTransaction(client => enqueueTtsJob(client, input))
  }
): Promise<OnboardingTtsRepairResult> {
  const result: OnboardingTtsRepairResult = { total: 0, ready: 0, present: 0, missing: 0, requeued: 0, failed: 0 };
  for (const cue of LANDING_ONBOARDING_TTS_CUES) {
    if ((cue.language ?? 'en') !== 'en') continue;
    for (const avatarVoice of TTS_AVATAR_VOICES) {
      result.total += 1;
      const identity = buildTtsArtifactKey({ text: cue.text, language: 'en', voice: avatarVoice });
      const existing = await dependencies.getArtifact(identity.cacheKey);
      if (existing?.status !== 'ready') continue;
      result.ready += 1;

      if (existing.audio_data?.length) {
        result.present += 1;
        continue;
      }

      const storageKey = existing.storage_key?.trim();
      if (!storageKey) continue;
      let storagePresent = false;
      try {
        storagePresent = (await dependencies.storage.read(storageKey)).byteLength > 0;
      } catch {
        storagePresent = false;
      }
      if (storagePresent) {
        result.present += 1;
        continue;
      }

      result.missing += 1;
      try {
        await dependencies.enqueue({
          cacheKey: identity.cacheKey,
          normalizedText: identity.normalizedText,
          avatarVoice: identity.avatarVoice,
          geminiVoice: GEMINI_TTS_VOICE_BY_AVATAR[avatarVoice],
          geminiModel: appConfig.KITABU_GEMINI_TTS_MODEL,
          language: 'en',
          provider: 'cartesia',
          model: appConfig.KITABU_CARTESIA_MODEL,
          voice: avatarVoice,
          repairReadyMissingStorage: true
        });
        result.requeued += 1;
      } catch {
        result.failed += 1;
      }
    }
  }
  return result;
}

export async function enqueueSpeechCues(
  texts: string[],
  source: string,
  options: { language?: string; learnerNeeded?: boolean; priority?: number; metadata?: Record<string, unknown> } = {}
) {
  const cues = texts.flatMap(splitSpokenText);
  if (cues.length === 0) return { enqueued: 0, source, mode: TTS_QUEUE_MODE };
  const language = normalizeLanguage(options.language);
  const results = await Promise.allSettled(
    cues.flatMap(text => TTS_AVATAR_VOICES.map(async avatarVoice => {
      const identity = buildTtsArtifactKey({ text, language, voice: avatarVoice });
      await withTransaction(client => enqueueTtsJob(client, {
        cacheKey: identity.cacheKey,
        identityKey: identity.identityKey,
        normalizedText: identity.normalizedText,
        avatarVoice: identity.avatarVoice,
        geminiVoice: GEMINI_TTS_VOICE_BY_AVATAR[avatarVoice],
        geminiModel: appConfig.KITABU_GEMINI_TTS_MODEL,
        language,
        provider: 'cartesia',
        model: appConfig.KITABU_CARTESIA_MODEL,
        learnerNeeded: options.learnerNeeded,
        priority: options.priority,
        metadata: { source, ...(options.metadata ?? {}) }
      }));
    }))
  );
  const rejected = results.filter(result => result.status === 'rejected');
  if (rejected.length > 0) console.warn('[tts] queue enqueue degraded', { source, failed: rejected.length, total: results.length });
  return { enqueued: results.length - rejected.length, source, mode: TTS_QUEUE_MODE };
}

export interface DurableSpeechDependencies {
  getArtifact: (cacheKey: string) => Promise<TtsArtifactRecord | null>;
  synthesize: (input: { text: string; voice: string; language: string }) => Promise<TextToSpeechResult>;
  persist: (identity: TtsIdentity, generated: TextToSpeechResult) => Promise<void>;
  storage?: TtsAssetStorage;
  providers?: ReturnType<typeof createTtsProviders>;
  repairReadyMissingStorage?: (identity: TtsIdentity) => Promise<void>;
}

async function readySpeechFromArtifact(artifact: TtsArtifactRecord | null, storage: TtsAssetStorage) {
  if (!isReadyTtsArtifact(artifact)) return { audio: null, storageMissing: false };
  let audio = artifact.audio_data?.length ? artifact.audio_data : null;
  if (!audio && artifact.storage_key) {
    try {
      audio = Buffer.from(await storage.read(artifact.storage_key));
    } catch {
      return { audio: null, storageMissing: true };
    }
  }
  if (!audio?.length) return { audio: null, storageMissing: Boolean(artifact.storage_key) };
  return { audio: {
    base64Audio: audio.toString('base64'),
    mimeType: artifact.mime_type,
    model: artifact.model ?? artifact.gemini_model,
    voice: artifact.voice ?? artifact.gemini_voice,
    provider: artifact.provider ?? 'gemini',
    durationMs: artifact.duration_ms,
    metadata: artifact.metadata
  } satisfies TextToSpeechResult, storageMissing: false };
}

export type DurableSpeechResult = {
  cacheHit: boolean;
  artifactKey: string;
  audio: TextToSpeechResult | null;
  pending?: boolean;
};

async function getDefaultSpeechDependencies() {
  return { storage: createTtsAssetStorage(), providers: createTtsProviders() };
}

export async function getOrCreateDurableSpeech(
  input: {
    text: string;
    avatarVoice: string;
    language?: string;
    speakingSettings?: Record<string, unknown>;
    pronunciationSettings?: Record<string, unknown>;
  },
  dependencies?: Partial<DurableSpeechDependencies>
): Promise<DurableSpeechResult> {
  const identity = buildTtsArtifactKey({
    text: input.text,
    language: input.language ?? 'en',
    voice: input.avatarVoice,
    speakingSettings: input.speakingSettings,
    pronunciationSettings: input.pronunciationSettings
  });
  const getArtifact = dependencies?.getArtifact ?? (cacheKey => getTtsArtifact(db, cacheKey));
  const defaults = await getDefaultSpeechDependencies();
  const storage = dependencies?.storage ?? defaults.storage;
  const providers = dependencies?.providers ?? defaults.providers;
  let existing = await getArtifact(identity.cacheKey);
  let readySpeech = await readySpeechFromArtifact(existing, storage);
  if (readySpeech.audio) {
    console.info('[tts] cache hit', { artifactKey: identity.cacheKey, provider: readySpeech.audio.provider ?? 'unknown' });
    return { cacheHit: true, artifactKey: identity.cacheKey, audio: readySpeech.audio };
  }

  if (existing?.status === 'processing') {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
      existing = await getArtifact(identity.cacheKey);
      readySpeech = await readySpeechFromArtifact(existing, storage);
      if (readySpeech.audio) return { cacheHit: true, artifactKey: identity.cacheKey, audio: readySpeech.audio };
    }
    return { cacheHit: false, artifactKey: identity.cacheKey, audio: null, pending: true };
  }

  if (existing?.status === 'ready' && readySpeech.storageMissing) {
    if (dependencies?.repairReadyMissingStorage) {
      await dependencies.repairReadyMissingStorage(identity);
    } else {
      await withTransaction(client => enqueueTtsJob(client, {
        cacheKey: identity.cacheKey,
        identityKey: identity.identityKey,
        normalizedText: identity.normalizedText,
        avatarVoice: identity.avatarVoice,
        geminiVoice: GEMINI_TTS_VOICE_BY_AVATAR[identity.avatarVoice] ?? identity.avatarVoice,
        geminiModel: appConfig.KITABU_GEMINI_TTS_MODEL,
        language: identity.language,
        provider: 'cartesia',
        model: appConfig.KITABU_CARTESIA_MODEL,
        voice: identity.avatarVoice,
        repairReadyMissingStorage: true
      }));
    }
  }

  if (dependencies?.synthesize) {
    const generated = await dependencies.synthesize({ text: identity.normalizedText, voice: identity.avatarVoice, language: identity.language });
    if (dependencies.persist) await dependencies.persist(identity, generated);
    return { cacheHit: false, artifactKey: identity.cacheKey, audio: generated };
  }

  await withTransaction(client => enqueueTtsJob(client, {
    cacheKey: identity.cacheKey,
    identityKey: identity.identityKey,
    normalizedText: identity.normalizedText,
    avatarVoice: identity.avatarVoice,
    geminiVoice: GEMINI_TTS_VOICE_BY_AVATAR[identity.avatarVoice] ?? identity.avatarVoice,
    geminiModel: appConfig.KITABU_GEMINI_TTS_MODEL,
    language: identity.language,
    provider: 'cartesia',
    model: appConfig.KITABU_CARTESIA_MODEL,
    voice: identity.avatarVoice
  }));
  const workerId = `tts-inline-${process.pid}-${randomUUID()}`;
  const claimed = await withTransaction(client => claimTtsJobs(client, 1, workerId, appConfig.KITABU_TTS_WORKER_LEASE_SECONDS, 'cartesia'));
  if (!claimed[0]) {
    return { cacheHit: false, artifactKey: identity.cacheKey, audio: null, pending: true };
  }

  const providerInput: TtsProviderInput = { text: identity.normalizedText, language: identity.language, voice: identity.avatarVoice };
  let generated: TtsProviderResult;
  try {
    generated = await providers.cartesia.synthesize(providerInput);
  } catch (error) {
    const providerError = error instanceof TtsProviderError ? error : new TtsProviderError({ provider: 'cartesia', kind: 'unavailable', message: String(error) });
    await withTransaction(client => releaseTtsJobPending(
      client,
      claimed[0].id,
      providerError.message,
      providerError.retryAfterMs ? Math.ceil(providerError.retryAfterMs / 1000) : appConfig.KITABU_TTS_RETRY_DELAY_SECONDS,
      workerId,
      'gemini'
    ));
    console.warn('[tts] Cartesia unavailable; queued Gemini fallback', { kind: providerError.kind, artifactKey: identity.cacheKey });
    return { cacheHit: false, artifactKey: identity.cacheKey, audio: null, pending: true };
  }

  const storageKey = `tts/${identity.identityKey}.wav`;
  await storage.put(storageKey, generated.bytes);
  const contentHash = createHash('sha256').update(generated.bytes).digest('hex');
  await withTransaction(client => completeTtsJobWithStorage(client, claimed[0].id, {
    mimeType: generated.mimeType,
    contentHash,
    provider: 'cartesia',
    model: generated.model,
    voice: generated.voice,
    durationMs: generated.durationMs,
    storageBackend: storage.backend,
    storageKey,
    storageUrl: storage.publicUrl(storageKey),
    metadata: generated.metadata
  }, workerId));
  console.info('[tts] Cartesia generation completed', { artifactKey: identity.cacheKey, model: generated.model, estimatedCharacters: identity.normalizedText.length });
  return {
    cacheHit: false,
    artifactKey: identity.cacheKey,
    audio: {
      base64Audio: generated.bytes.toString('base64'),
      mimeType: generated.mimeType,
      model: generated.model,
      voice: generated.voice,
      provider: 'cartesia',
      durationMs: generated.durationMs,
      metadata: generated.metadata
    }
  };
}

export function newTtsWorkerId() {
  return `tts-worker-${process.pid}-${randomUUID()}`;
}
