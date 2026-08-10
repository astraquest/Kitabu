import assert from 'node:assert/strict';
import test from 'node:test';
import { appConfig } from './config.js';
import { TtsProviderError, type TtsProvider, type TtsProviderInput, type TtsProviderResult } from './ttsProviders.js';
import { processGeminiTtsQueue, processTtsJobs, type QueueProcessorDependencies } from './ttsWorker.js';

process.env.KITABU_RUNTIME_ENV = 'test';
process.env.KITABU_NODE_ENV = 'test';
process.env.KITABU_DATABASE_URL ??= 'postgres://kitabu:kitabu@localhost:5432/kitabu';
process.env.KITABU_REDIS_URL ??= 'redis://localhost:6379';
process.env.KITABU_JWT_ISSUER ??= 'kitabu-test';
process.env.KITABU_JWT_AUDIENCE ??= 'kitabu-test';
process.env.KITABU_JWT_PRIVATE_KEY ??= 'test-private-key';
process.env.KITABU_JWT_PUBLIC_KEY ??= 'test-public-key';

const geminiProvider: TtsProvider = {
  name: 'gemini',
  async synthesize(_input: TtsProviderInput): Promise<TtsProviderResult> {
    return { bytes: Buffer.from([1]), mimeType: 'audio/wav', model: 'gemini-test', voice: 'Puck', durationMs: 10, metadata: {} };
  }
};
const cartesiaProvider: TtsProvider = {
  name: 'cartesia',
  async synthesize(_input: TtsProviderInput): Promise<TtsProviderResult> {
    return { bytes: Buffer.from([1]), mimeType: 'audio/wav', model: 'cartesia-test', voice: 'voice', durationMs: 10, metadata: {} };
  }
};

function job(id: string) {
  return {
    id,
    artifact_id: `artifact-${id}`,
    identity_key: `identity-${id}`,
    status: 'processing' as const,
    attempts: 1,
    available_at: new Date(),
    locked_at: new Date(),
    locked_by: 'worker-1',
    last_error: null,
    completed_at: null,
    normalized_text: `Prompt ${id}`,
    avatar_voice: 'Samora',
    gemini_voice: 'Puck',
    gemini_model: 'gemini-test',
    provider: 'gemini' as const,
    language: 'en',
    learner_needed: true,
    priority: 10,
    metadata: {}
  };
}

function dependencies(overrides: Partial<QueueProcessorDependencies> = {}) {
  const released: string[] = [];
  const finalized: string[] = [];
  const reservedAt: Date[] = [];
  const reservedInputs: Array<{ now: Date; budget: number; spacingMs: number; characters: number }> = [];
  const base: QueueProcessorDependencies = {
    claim: async limit => [job('one'), job('two')].slice(0, limit),
    synthesize: async (provider, input) => provider.synthesize(input),
    finalize: async currentJob => { finalized.push(currentJob.id); },
    release: async currentJob => { released.push(currentJob.id); },
    fail: async () => undefined,
    reserveGemini: async input => { reservedAt.push(input.now); reservedInputs.push(input); return { reserved: true }; },
    queueDepth: async () => ({ pending: released.length, processing: 0 }),
    storage: { backend: 'local', put: async () => ({ storageKey: 'x', byteSize: 1 }), read: async () => new Uint8Array([1]), publicUrl: () => null },
    providers: { cartesia: cartesiaProvider, gemini: geminiProvider }
  };
  return { dependencies: { ...base, ...overrides }, released, finalized, reservedAt, reservedInputs };
}

test('Gemini queue enforces an injected clock spacing/budget reservation and processes queued jobs', async () => {
  const fixedNow = new Date('2026-08-10T02:00:00.000Z');
  const state = dependencies();
  const result = await processGeminiTtsQueue({ now: fixedNow, workerId: 'worker-1', limit: 1, dependencies: state.dependencies });
  assert.equal(result.completed, 1);
  assert.deepEqual(state.finalized, ['one']);
  assert.deepEqual(state.reservedAt, [fixedNow]);
});

test('Gemini queue stops at the budget cap and leaves remaining jobs pending', async () => {
  const state = dependencies({
    reserveGemini: (() => {
      let count = 0;
      return async () => ({ reserved: count++ === 0 });
    })()
  });
  const result = await processGeminiTtsQueue({ now: new Date('2026-08-10T02:00:00.000Z'), workerId: 'worker-1', dependencies: state.dependencies });
  assert.equal(result.completed, 1);
  assert.equal(result.stopped, 'daily-budget-or-rpm-spacing');
  assert.deepEqual(state.released, ['two']);
});

test('Gemini quota failure is deferred without a tight provider retry', async () => {
  const state = dependencies({
    synthesize: async () => {
      throw new TtsProviderError({ provider: 'gemini', kind: 'quota', message: 'quota exhausted' });
    }
  });
  const result = await processGeminiTtsQueue({ now: new Date('2026-08-10T02:00:00.000Z'), workerId: 'worker-1', limit: 1, dependencies: state.dependencies });
  assert.equal(result.completed, 0);
  assert.equal(result.stopped, 'quota');
  assert.deepEqual(state.released, ['one']);
});

test('regular TTS polling sends a Cartesia-deferred fallback to Gemini with budget/RPM reservation', async () => {
  const claims: Array<'cartesia' | 'gemini'> = [];
  const synthesizedProviders: string[] = [];
  let cartesiaDeferred = false;
  let geminiClaims = 0;
  const state = dependencies({
    claim: async (_limit, _workerId, _leaseSeconds, provider) => {
      claims.push(provider);
      if (provider === 'cartesia' && !cartesiaDeferred) {
        cartesiaDeferred = true;
        return [job('fallback')];
      }
      return provider === 'gemini' && cartesiaDeferred && geminiClaims++ > 0 ? [job('fallback')] : [];
    },
    synthesize: async (provider, input) => {
      synthesizedProviders.push(provider.name);
      if (provider.name === 'cartesia') {
        throw new TtsProviderError({ provider: 'cartesia', kind: 'unavailable', message: 'Cartesia is not configured' });
      }
      return geminiProvider.synthesize(input);
    }
  });

  const deferredResult = await processTtsJobs('worker-1', { limit: 1, dependencies: state.dependencies });
  assert.equal(deferredResult.deferred, 1);
  assert.deepEqual(state.released, ['fallback']);

  const result = await processTtsJobs('worker-1', { limit: 1, dependencies: state.dependencies });
  assert.deepEqual(claims, ['cartesia', 'gemini', 'cartesia', 'gemini']);
  assert.deepEqual(synthesizedProviders, ['cartesia', 'gemini']);
  assert.equal(result.claimed, 1);
  assert.equal(result.completed, 1);
  assert.equal(result.mode, 'cartesia-primary-with-gemini-fallback');
  assert.deepEqual(state.finalized, ['fallback']);
  assert.equal(state.reservedInputs.length, 1);
  assert.equal(state.reservedInputs[0].budget, appConfig.KITABU_GEMINI_TTS_DAILY_REQUEST_BUDGET);
  assert.equal(state.reservedInputs[0].spacingMs, appConfig.KITABU_GEMINI_TTS_RPM_SPACING_MS);
  assert.equal(state.reservedInputs[0].characters, job('fallback').normalized_text.length);
});
