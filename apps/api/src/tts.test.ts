import assert from 'node:assert/strict';
import test from 'node:test';
import { appConfig } from './config.js';
import { db, redis } from './db.js';
import {
  extractGeminiPcmFromBatch,
  extractGeminiPcmFromJsonl,
  getGeminiBatchLifecycle,
  getGeminiResponsesFile
} from './ttsGemini.js';
import {
  GeminiGenerateContentTtsProvider,
  createAssessmentTtsProvider,
  pcmToWav,
  probeGeminiBatchCapability,
  resolveCachedNarration,
  selectGeminiTtsMode,
  shouldRecoverUncertainTtsJob,
  toGeminiGenerateContentRequest,
  type GeminiBatchCapabilityCache
} from './tts.js';
import {
  buildNarrationIdentity,
  canonicalizeAssessmentNarrationLanguage,
  composeAssessmentQuestionNarration,
  normalizeNarrationText,
  NARRATION_VOICES
} from './ttsIdentity.js';

test.after(async () => {
  redis.disconnect();
  await db.end();
});

test('canonicalizes only the supported assessment narration languages', () => {
  assert.equal(canonicalizeAssessmentNarrationLanguage('en'), 'en-US');
  assert.equal(canonicalizeAssessmentNarrationLanguage(' en-KE '), 'en-US');
  assert.equal(canonicalizeAssessmentNarrationLanguage('sw'), 'sw-KE');
  assert.equal(canonicalizeAssessmentNarrationLanguage('SW-ke'), 'sw-KE');
  assert.equal(canonicalizeAssessmentNarrationLanguage('fr-FR'), null);
});

test('normalizes assessment narration text without changing case or punctuation', () => {
  assert.equal(normalizeNarrationText('  A\r\n\tquestion.  '), 'A question.');
  assert.equal(normalizeNarrationText('NFC e\u0301!'), 'NFC é!');
});

test('includes provider voice and settings in the canonical identity', () => {
  const base = buildNarrationIdentity({ text: 'Choose A.', languageCode: 'en-US', profile: 'Samora' });
  const otherVoice = buildNarrationIdentity({ text: 'Choose A.', languageCode: 'en-US', profile: 'Barake' });
  const otherRate = buildNarrationIdentity({ text: 'Choose A.', languageCode: 'en-US', profile: 'Samora', speakingRate: 0.9 });
  assert.equal(NARRATION_VOICES.Samora, 'Sadaltager');
  assert.notEqual(base.identitySha256, otherVoice.identitySha256);
  assert.notEqual(base.identitySha256, otherRate.identitySha256);
});

test('composes one canonical full-question narration in display order', () => {
  assert.equal(
    composeAssessmentQuestionNarration({
      subjectName: 'Mathematics',
      context: 'Fractions',
      prompt: 'What is 1/2 + 1/4?',
      options: ['1/6', '2/6', '3/4']
    }),
    'Subject: Mathematics. Context: Fractions. Question: What is 1/2 + 1/4? Answer choices: 1. 1/6 2. 2/6 3. 3/4'
  );
});

test('classifies documented Gemini Batch REST operation states', () => {
  assert.equal(getGeminiBatchLifecycle({ metadata: { state: 'JOB_STATE_PENDING' } }), 'pending');
  assert.equal(getGeminiBatchLifecycle({ metadata: { state: 'JOB_STATE_RUNNING' } }), 'pending');
  assert.equal(getGeminiBatchLifecycle({ metadata: { state: 'JOB_STATE_SUCCEEDED' } }), 'succeeded');
  assert.equal(getGeminiBatchLifecycle({ metadata: { state: 'JOB_STATE_FAILED' }, error: { message: 'quota exhausted' } }), 'failed');
});

test('extracts raw PCM from a documented succeeded inline batch result', () => {
  const audio = extractGeminiPcmFromBatch({
    metadata: { state: 'JOB_STATE_SUCCEEDED' },
    dest: { inlinedResponses: [{ metadata: { identitySha256: 'wanted' }, response: {
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: 'AQID' } }] } }]
    } }] }
  }, 'wanted');
  assert.deepEqual(audio?.pcm, Buffer.from([1, 2, 3]));
  assert.equal(audio?.metadata.mimeType, 'audio/L16;codec=pcm;rate=24000');
});

test('reads a documented REST file result path, including snake-case payloads', () => {
  assert.equal(
    getGeminiResponsesFile({ metadata: { state: 'JOB_STATE_SUCCEEDED' }, response: { responses_file: 'files/tts-result.jsonl' } }),
    'files/tts-result.jsonl'
  );
});

test('extracts a correlated raw PCM result from a documented JSONL file response', () => {
  const audio = extractGeminiPcmFromJsonl([
    JSON.stringify({ metadata: { identity_sha256: 'other' }, response: { candidates: [{ content: { parts: [{ text: 'not audio' }] } }] } }),
    JSON.stringify({ metadata: { identitySha256: 'wanted' }, response: { candidates: [{ content: { parts: [{ inline_data: { mime_type: 'audio/pcm', data: 'BAUG' } }] } }] } })
  ].join('\n'), 'wanted');
  assert.deepEqual(audio?.pcm, Buffer.from([4, 5, 6]));
  assert.equal(audio?.metadata.mimeType, 'audio/pcm');
});

test('builds the standard generateContent request and wraps returned PCM as WAV', async () => {
  const identity = buildNarrationIdentity({ text: 'Choose A.', languageCode: 'en-US', profile: 'Samora' });
  const request = toGeminiGenerateContentRequest(identity);
  assert.deepEqual(request.generationConfig.responseModalities, ['AUDIO']);
  assert.equal(request.generationConfig.speechConfig.languageCode, 'en-US');
  assert.equal(request.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Sadaltager');
  assert.equal('model' in request, false);

  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    assert.equal(init?.method, 'POST');
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/pcm', data: 'AQID' } }] } }] })
    } as Response;
  };
  try {
    const audio = await new GeminiGenerateContentTtsProvider().generate(identity);
    assert.match(requestUrl, /:generateContent$/);
    assert.deepEqual(audio.pcm, Buffer.from([1, 2, 3]));
    const wav = pcmToWav(audio.pcm);
    assert.equal(wav.subarray(0, 4).toString(), 'RIFF');
    assert.equal(wav.subarray(8, 12).toString(), 'WAVE');
    assert.equal(wav.readUInt32LE(40), 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ready cache hit does not invoke the provider', async () => {
  let providerInvocations = 0;
  const result = await resolveCachedNarration({
    identity_sha256: 'a'.repeat(64), status: 'ready', public_url: 'https://cdn.example/audio.wav', duration_ms: 12
  }, async () => {
    providerInvocations += 1;
    return { status: 'pending', identitySha256: 'a'.repeat(64) };
  });
  assert.equal(result.status, 'ready');
  assert.equal(providerInvocations, 0);
});

test('concurrent requests for one identity share one standard provider invocation', async () => {
  const identity = buildNarrationIdentity({ text: 'Same text.', languageCode: 'en-US', profile: 'Samora' });
  const originalFetch = globalThis.fetch;
  let invocations = 0;
  globalThis.fetch = async () => {
    invocations += 1;
    await new Promise(resolve => setTimeout(resolve, 10));
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: 'AQID' } }] } }] })
    } as Response;
  };
  try {
    const provider = new GeminiGenerateContentTtsProvider();
    await Promise.all([provider.generate(identity), provider.generate(identity)]);
    assert.equal(invocations, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Batch is disabled by default and capability failures select standard generation', async () => {
  assert.equal(appConfig.KITABU_GEMINI_TTS_BATCH_ENABLED, false);
  assert.ok(await createAssessmentTtsProvider() instanceof GeminiGenerateContentTtsProvider);
  assert.equal(selectGeminiTtsMode(false, true), 'standard');
  assert.equal(selectGeminiTtsMode(true, false), 'standard');

  let cachedValue: string | undefined;
  const cache: GeminiBatchCapabilityCache = {
    get: async () => null,
    set: async (_key, value) => { cachedValue = value; }
  };
  const supported = await probeGeminiBatchCapability({
    cache,
    fetchImpl: async () => ({ ok: false, status: 404 } as Response)
  });
  assert.equal(supported, false);
  assert.equal(cachedValue, 'unsupported');
  assert.equal(selectGeminiTtsMode(true, supported), 'standard');

  const cachedSupported = await probeGeminiBatchCapability({
    cache: { get: async () => 'supported', set: async () => undefined },
    fetchImpl: async () => { throw new Error('cached capability must not probe'); }
  });
  assert.equal(cachedSupported, true);

  const failedProbe = await probeGeminiBatchCapability({
    cache: { get: async () => { throw new Error('redis unavailable'); }, set: async () => undefined },
    fetchImpl: async () => { throw new Error('must not probe after cache failure'); }
  });
  assert.equal(failedProbe, false);
});

test('uncertain pre-name jobs recover only when no provider work was created', () => {
  assert.equal(shouldRecoverUncertainTtsJob({
    assetStatus: 'unavailable', jobStatus: 'uncertain', providerJobName: null,
    providerMetadata: { providerSubmissionState: 'never_submitted' }
  }), true);
  assert.equal(shouldRecoverUncertainTtsJob({
    assetStatus: 'unavailable', jobStatus: 'uncertain', providerJobName: null,
    errorMessage: 'Gemini Batch API 404: unsupported operation'
  }), true);
  assert.equal(shouldRecoverUncertainTtsJob({
    assetStatus: 'unavailable', jobStatus: 'uncertain', providerJobName: null,
    providerMetadata: { providerSubmissionState: 'unknown' }
  }), false);
  assert.equal(shouldRecoverUncertainTtsJob({
    assetStatus: 'unavailable', jobStatus: 'uncertain', providerJobName: 'batches/123',
    providerMetadata: { providerSubmissionState: 'never_submitted' }
  }), false);
});
