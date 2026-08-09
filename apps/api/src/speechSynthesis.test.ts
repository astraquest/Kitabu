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
process.env.KITABU_GEMINI_API_KEY ??= 'test-gemini-key';

const { GEMINI_TTS_VOICE_BY_AVATAR, synthesizeSpeechWithGemini } = await import('./ai.js');

type CapturedRequestBody = {
  generationConfig?: {
    speechConfig?: {
      voiceConfig?: {
        prebuiltVoiceConfig?: { voiceName?: string };
      };
    };
  };
};

test('maps the selected avatar voice into the Gemini prebuilt voice request', async () => {
  let requestBody: CapturedRequestBody | null = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{ inlineData: { data: Buffer.from([0, 0]).toString('base64'), mimeType: 'audio/L16;rate=24000' } }]
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

  try {
    const result = await synthesizeSpeechWithGemini({ text: 'Choose the best answer.', voice: 'Samora' });
    assert.equal(GEMINI_TTS_VOICE_BY_AVATAR.Samora, 'Puck');
    const capturedRequestBody = requestBody as unknown as CapturedRequestBody;
    assert.equal(capturedRequestBody.generationConfig?.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName, 'Puck');
    assert.equal(result.voice, 'Puck');
    assert.equal(result.mimeType, 'audio/wav');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('requires an explicit selected avatar voice', async () => {
  await assert.rejects(
    synthesizeSpeechWithGemini({ text: 'Choose the best answer.' }),
    /selected avatar voice is required/,
  );
});
