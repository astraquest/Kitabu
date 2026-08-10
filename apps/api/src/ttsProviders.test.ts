import assert from 'node:assert/strict';
import test from 'node:test';

process.env.KITABU_RUNTIME_ENV = 'test';
process.env.KITABU_NODE_ENV = 'test';
process.env.KITABU_DATABASE_URL ??= 'postgres://kitabu:kitabu@localhost:5432/kitabu';
process.env.KITABU_REDIS_URL ??= 'redis://localhost:6379';
process.env.KITABU_JWT_ISSUER ??= 'kitabu-test';
process.env.KITABU_JWT_AUDIENCE ??= 'kitabu-test';
process.env.KITABU_JWT_PRIVATE_KEY ??= 'test-private-key';
process.env.KITABU_JWT_PUBLIC_KEY ??= 'test-public-key';

const { appConfig } = await import('./config.js');
const {
  CartesiaTtsProvider,
  TtsProviderError,
  classifyTtsProviderHttpError
} = await import('./ttsProviders.js');

test('Cartesia provider sends documented bytes request and parses audio bytes', async () => {
  const original = {
    apiKey: appConfig.KITABU_CARTESIA_API_KEY,
    voiceMap: appConfig.KITABU_CARTESIA_VOICE_MAP
  };
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  Object.assign(appConfig, {
    KITABU_CARTESIA_API_KEY: 'test-cartesia-key',
    KITABU_CARTESIA_VOICE_MAP: JSON.stringify({ Samora: 'voice-id-1' })
  });
  try {
    const provider = new CartesiaTtsProvider(async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(Buffer.from([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'audio/wav' }
      });
    });
    const result = await provider.synthesize({ text: 'Hello learner.', language: 'en', voice: 'Samora' });
    const body = JSON.parse(String(requestInit?.body));
    assert.equal(requestUrl, 'https://api.cartesia.ai/tts/bytes');
    assert.equal((requestInit?.headers as Record<string, string>)['Cartesia-Version'], appConfig.KITABU_CARTESIA_VERSION);
    assert.equal((requestInit?.headers as Record<string, string>)['X-API-Key'], 'test-cartesia-key');
    assert.deepEqual(body, {
      model_id: appConfig.KITABU_CARTESIA_MODEL,
      transcript: 'Hello learner.',
      voice: { mode: 'id', id: 'voice-id-1' },
      output_format: { container: 'wav', encoding: 'pcm_s16le', sample_rate: 24000 },
      language: 'en'
    });
    assert.deepEqual([...result.bytes], [1, 2, 3]);
    assert.equal(result.mimeType, 'audio/wav');
    assert.equal(result.voice, 'voice-id-1');
  } finally {
    Object.assign(appConfig, {
      KITABU_CARTESIA_API_KEY: original.apiKey,
      KITABU_CARTESIA_VOICE_MAP: original.voiceMap
    });
  }
});

test('TTS provider errors classify quota, rate-limit, and unavailable responses', () => {
  assert.equal(classifyTtsProviderHttpError('cartesia', 429, 'quota exceeded').kind, 'quota');
  assert.equal(classifyTtsProviderHttpError('cartesia', 408, 'try later').kind, 'rate_limit');
  assert.equal(classifyTtsProviderHttpError('gemini', 503, 'temporarily unavailable').kind, 'unavailable');
  assert.throws(
    () => { throw new TtsProviderError({ provider: 'cartesia', kind: 'unavailable', message: 'not configured' }); },
    error => error instanceof TtsProviderError && error.kind === 'unavailable'
  );
});

test('Cartesia without an explicit voice mapping is unavailable without a provider call', async () => {
  const original = {
    apiKey: appConfig.KITABU_CARTESIA_API_KEY,
    voiceMap: appConfig.KITABU_CARTESIA_VOICE_MAP
  };
  Object.assign(appConfig, {
    KITABU_CARTESIA_API_KEY: 'test-cartesia-key',
    KITABU_CARTESIA_VOICE_MAP: '{}'
  });
  let calls = 0;
  try {
    await assert.rejects(
      new CartesiaTtsProvider(async () => {
        calls += 1;
        return new Response(Buffer.from([1]), { status: 200 });
      }).synthesize({ text: 'Hello learner.', language: 'en', voice: 'Samora' }),
      error => error instanceof TtsProviderError && error.kind === 'unavailable'
    );
    assert.equal(calls, 0);
  } finally {
    Object.assign(appConfig, {
      KITABU_CARTESIA_API_KEY: original.apiKey,
      KITABU_CARTESIA_VOICE_MAP: original.voiceMap
    });
  }
});
