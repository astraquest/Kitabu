import { appConfig } from './config.js';
import { synthesizeSpeechWithGemini } from './ai.js';

export type TtsProviderName = 'cartesia' | 'gemini';
export type TtsProviderErrorKind = 'quota' | 'rate_limit' | 'unavailable' | 'invalid';

export class TtsProviderError extends Error {
  readonly provider: TtsProviderName;
  readonly kind: TtsProviderErrorKind;
  readonly status?: number;
  readonly retryAfterMs?: number;

  constructor(input: {
    provider: TtsProviderName;
    kind: TtsProviderErrorKind;
    message: string;
    status?: number;
    retryAfterMs?: number;
  }) {
    super(input.message);
    this.name = 'TtsProviderError';
    this.provider = input.provider;
    this.kind = input.kind;
    this.status = input.status;
    this.retryAfterMs = input.retryAfterMs;
  }
}

export interface TtsProviderInput {
  text: string;
  language: string;
  voice: string;
  speakingRate?: number;
  pitch?: number;
  pronunciation?: Record<string, unknown>;
  style?: Record<string, unknown>;
}

export interface TtsProviderResult {
  bytes: Buffer;
  mimeType: string;
  model: string;
  voice: string;
  durationMs: number | null;
  metadata: Record<string, unknown>;
}

export interface TtsProvider {
  readonly name: TtsProviderName;
  synthesize(input: TtsProviderInput): Promise<TtsProviderResult>;
}

function bodySnippet(body: string) {
  return body.replace(/\s+/g, ' ').slice(0, 300);
}

export function classifyTtsProviderHttpError(
  provider: TtsProviderName,
  status: number,
  body: string
) {
  const normalized = body.toLowerCase();
  const kind: TtsProviderErrorKind = status === 429 || normalized.includes('quota') || normalized.includes('credit')
    ? 'quota'
    : status === 408 || status === 425 || status === 409 || normalized.includes('rate limit')
      ? 'rate_limit'
      : status >= 400 && status < 500
        ? 'invalid'
        : 'unavailable';
  return new TtsProviderError({
    provider,
    kind,
    status,
    message: `${provider} TTS request failed (${status}): ${bodySnippet(body)}`
  });
}

function classifyTtsProviderException(provider: TtsProviderName, error: unknown) {
  if (error instanceof TtsProviderError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const statusMatch = message.match(/\b(401|403|408|409|425|429|5\d\d)\b/);
  return statusMatch
    ? classifyTtsProviderHttpError(provider, Number(statusMatch[1]), message)
    : new TtsProviderError({ provider, kind: 'unavailable', message });
}

function estimateWavDurationMs(bytes: Buffer) {
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF') return null;
  const sampleRate = bytes.readUInt32LE(24);
  const channels = bytes.readUInt16LE(22);
  const bitsPerSample = bytes.readUInt16LE(34);
  if (!sampleRate || !channels || !bitsPerSample) return null;
  const dataSize = bytes.readUInt32LE(40);
  return Math.round((dataSize / (sampleRate * channels * (bitsPerSample / 8))) * 1000);
}

function parseJsonObject(value: string, label: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('object required');
    return parsed as Record<string, unknown>;
  } catch {
    throw new TtsProviderError({ provider: 'cartesia', kind: 'unavailable', message: `${label} is not valid JSON` });
  }
}

function resolveCartesiaVoice(avatarVoice: string) {
  const map = parseJsonObject(appConfig.KITABU_CARTESIA_VOICE_MAP, 'KITABU_CARTESIA_VOICE_MAP');
  const toVoiceId = (configured: unknown) => typeof configured === 'string'
    ? configured.trim()
    : configured && typeof configured === 'object' && 'id' in configured && typeof configured.id === 'string'
      ? configured.id.trim()
      : '';
  const voiceId = toVoiceId(map[avatarVoice]) || toVoiceId(map.default) || toVoiceId(appConfig.KITABU_CARTESIA_DEFAULT_VOICE);
  if (!voiceId) {
    throw new TtsProviderError({
      provider: 'cartesia',
      kind: 'unavailable',
      message: `No Cartesia voice is configured for ${avatarVoice}`
    });
  }
  return voiceId;
}

export class CartesiaTtsProvider implements TtsProvider {
  readonly name = 'cartesia' as const;
  private inFlight = 0;
  private dailyCharacters = new Map<string, number>();
  private monthlyCharacters = new Map<string, number>();

  constructor(private readonly fetchImpl: typeof fetch = globalThis.fetch) {}

  async synthesize(input: TtsProviderInput): Promise<TtsProviderResult> {
    if (!appConfig.KITABU_CARTESIA_API_KEY) {
      throw new TtsProviderError({ provider: 'cartesia', kind: 'unavailable', message: 'Cartesia is not configured' });
    }
    if (this.inFlight >= appConfig.KITABU_CARTESIA_MAX_CONCURRENCY) {
      throw new TtsProviderError({ provider: 'cartesia', kind: 'rate_limit', message: 'Cartesia local concurrency limit reached' });
    }
    const characters = input.text.length;
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const month = day.slice(0, 7);
    const dailyUsed = this.dailyCharacters.get(day) ?? 0;
    const monthlyUsed = this.monthlyCharacters.get(month) ?? 0;
    if (appConfig.KITABU_CARTESIA_MAX_DAILY_CHARACTERS > 0 && dailyUsed + characters > appConfig.KITABU_CARTESIA_MAX_DAILY_CHARACTERS) {
      throw new TtsProviderError({ provider: 'cartesia', kind: 'quota', message: 'Cartesia daily local character allowance reached' });
    }
    if (appConfig.KITABU_CARTESIA_MAX_MONTHLY_CHARACTERS > 0 && monthlyUsed + characters > appConfig.KITABU_CARTESIA_MAX_MONTHLY_CHARACTERS) {
      throw new TtsProviderError({ provider: 'cartesia', kind: 'quota', message: 'Cartesia monthly local character allowance reached' });
    }

    const voiceId = resolveCartesiaVoice(input.voice);
    const outputFormat = parseJsonObject(appConfig.KITABU_CARTESIA_OUTPUT_FORMAT, 'KITABU_CARTESIA_OUTPUT_FORMAT');
    this.inFlight += 1;
    try {
      const response = await this.fetchImpl(`${appConfig.KITABU_CARTESIA_BASE_URL}/tts/bytes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cartesia-Version': appConfig.KITABU_CARTESIA_VERSION,
          'X-API-Key': appConfig.KITABU_CARTESIA_API_KEY
        },
        body: JSON.stringify({
          model_id: appConfig.KITABU_CARTESIA_MODEL,
          transcript: input.text,
          voice: { mode: 'id', id: voiceId },
          output_format: outputFormat,
          language: input.language
        })
      });
      if (!response.ok) throw classifyTtsProviderHttpError('cartesia', response.status, await response.text());
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length) throw new TtsProviderError({ provider: 'cartesia', kind: 'unavailable', message: 'Cartesia returned empty audio' });
      this.dailyCharacters.set(day, dailyUsed + characters);
      this.monthlyCharacters.set(month, monthlyUsed + characters);
      return {
        bytes,
        mimeType: response.headers.get('content-type')?.split(';')[0] ?? 'audio/wav',
        model: appConfig.KITABU_CARTESIA_MODEL,
        voice: voiceId,
        durationMs: estimateWavDurationMs(bytes),
        metadata: { language: input.language, characters, estimatedCartesiaCharacters: characters }
      };
    } catch (error) {
      throw classifyTtsProviderException('cartesia', error);
    } finally {
      this.inFlight -= 1;
    }
  }
}

export class GeminiTtsProvider implements TtsProvider {
  readonly name = 'gemini' as const;

  async synthesize(input: TtsProviderInput): Promise<TtsProviderResult> {
    try {
      const result = await synthesizeSpeechWithGemini({ text: input.text, voice: input.voice, language: input.language });
      const bytes = Buffer.from(result.base64Audio, 'base64');
      return {
        bytes,
        mimeType: result.mimeType,
        model: result.model,
        voice: result.voice,
        durationMs: estimateWavDurationMs(bytes),
        metadata: { language: input.language }
      };
    } catch (error) {
      throw classifyTtsProviderException('gemini', error);
    }
  }
}

export function createTtsProviders() {
  return {
    cartesia: new CartesiaTtsProvider(),
    gemini: new GeminiTtsProvider()
  } satisfies Record<TtsProviderName, TtsProvider>;
}
