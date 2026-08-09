import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractGeminiPcmFromBatch,
  extractGeminiPcmFromJsonl,
  getGeminiBatchLifecycle,
  getGeminiResponsesFile
} from './ttsGemini.js';
import {
  buildNarrationIdentity,
  composeAssessmentQuestionNarration,
  normalizeNarrationText,
  NARRATION_VOICES
} from './ttsIdentity.js';

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
