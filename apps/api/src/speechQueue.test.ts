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

const {
  buildTtsArtifactKey,
  getOrCreateDurableSpeech,
  isReadyTtsArtifact,
  normalizeSpokenText,
  prepareOnboardingTts,
  spokenCuesFromQuestions,
  TTS_AVATAR_VOICES
} =
  await import('./speechQueue.js');
const { LANDING_ONBOARDING_TTS_CUES } = await import('./onboardingTts.js');
const { db, redis } = await import('./db.js');

test.after(async () => {
  await redis.quit().catch(() => undefined);
  await db.end().catch(() => undefined);
});

test('TTS identity normalizes text and is independent of provider model', () => {
  const first = buildTtsArtifactKey({ text: '  Choose\n the   best answer. ', language: 'en', voice: 'Samora' });
  const same = buildTtsArtifactKey({ text: 'Choose the best answer.', language: 'en', voice: 'Samora' });
  const otherVoice = buildTtsArtifactKey({ text: 'Choose the best answer.', language: 'en', voice: 'Bella' });
  const otherLanguage = buildTtsArtifactKey({ text: 'Choose the best answer.', language: 'sw', voice: 'Samora' });

  assert.equal(first.normalizedText, 'Choose the best answer.');
  assert.equal(first.cacheKey, same.cacheKey);
  assert.notEqual(first.cacheKey, otherVoice.cacheKey);
  assert.notEqual(first.cacheKey, otherLanguage.cacheKey);
  assert.equal(first.cacheKey, buildTtsArtifactKey('Choose the best answer.', 'Samora', 'different-model').cacheKey);
  assert.equal(normalizeSpokenText('  one\t two  '), 'one two');
});

test('spoken question cues exclude options and question metadata', () => {
  assert.deepEqual(
    spokenCuesFromQuestions([
      { text: 'What is evaporation?', explanation: 'Water changes state.' },
      { text: 'Choose one', explanation: 'Only the prompt is spoken.' }
    ]),
    ['What is evaporation?', 'Choose one']
  );
  assert.equal(TTS_AVATAR_VOICES.length, 4);
});

test('landing and onboarding catalog contains only short semantic copy', () => {
  assert.equal(LANDING_ONBOARDING_TTS_CUES.length, 22);
  for (const cue of LANDING_ONBOARDING_TTS_CUES) {
    assert.ok(cue.text.length <= 110);
    assert.doesNotMatch(cue.text, /option\s+[a-d]|answer choices|checkbox|question\s+\d+/i);
  }
  assert.ok(LANDING_ONBOARDING_TTS_CUES.some(cue => cue.id === 'onboarding-role' && cue.text === 'Who are you?'));
  assert.ok(LANDING_ONBOARDING_TTS_CUES.some(cue => cue.id === 'onboarding-microphone' && cue.text.includes('Microphone access enables')));
  assert.equal(LANDING_ONBOARDING_TTS_CUES.some(cue => cue.text.includes('How should your tutor sound?')), false);
});

test('durable speech returns a ready artifact without calling Gemini, and persists misses', async () => {
  const audio = Buffer.from([1, 2, 3]).toString('base64');
  const readyArtifact = {
    status: 'ready',
    audio_data: Buffer.from([1, 2, 3]),
    mime_type: 'audio/wav',
    content_hash: 'hash-1',
    gemini_model: 'tts-v1',
    gemini_voice: 'Puck'
  } as any;
  let syntheses = 0;
  let persisted = 0;

  const hit = await getOrCreateDurableSpeech(
    { text: 'A cached cue', avatarVoice: 'Samora' },
    {
      getArtifact: async () => readyArtifact,
      synthesize: async () => {
        syntheses += 1;
        throw new Error('cache hit must not synthesize');
      }
    }
  );
  assert.equal(hit.cacheHit, true);
  assert.ok(hit.audio);
  assert.equal(hit.audio.base64Audio, audio);
  assert.equal(syntheses, 0);

  const miss = await getOrCreateDurableSpeech(
    { text: 'A new cue', avatarVoice: 'Bella' },
    {
      getArtifact: async () => null,
      synthesize: async () => ({ base64Audio: audio, mimeType: 'audio/wav', model: 'tts-v1', voice: 'Kore' }),
      persist: async () => {
        persisted += 1;
      }
    }
  );
  assert.equal(miss.cacheHit, false);
  assert.equal(persisted, 1);
});

test('durable speech waits for a worker-owned artifact instead of racing Gemini', async () => {
  const readyArtifact = {
    status: 'ready',
    audio_data: Buffer.from([9, 8, 7]),
    mime_type: 'audio/wav',
    content_hash: 'hash-2',
    gemini_model: 'tts-v1',
    gemini_voice: 'Puck'
  } as any;
  let reads = 0;
  let syntheses = 0;
  const result = await getOrCreateDurableSpeech(
    { text: 'Worker-owned cue', avatarVoice: 'Samora' },
    {
      getArtifact: async () => {
        reads += 1;
        return reads === 1 ? ({ status: 'processing' } as any) : readyArtifact;
      },
      synthesize: async () => {
        syntheses += 1;
        throw new Error('worker completion should win');
      }
    }
  );
  assert.equal(result.cacheHit, true);
  assert.equal(syntheses, 0);
  assert.equal(reads, 2);
});

test('onboarding preparation reads ready artifacts before enqueueing and is idempotent', async () => {
  const artifacts = new Map<string, any>();
  let reads = 0;
  let enqueues = 0;
  const dependencies = {
    getArtifact: async (cacheKey: string) => {
      reads += 1;
      return artifacts.get(cacheKey) ?? null;
    },
    enqueue: async (input: { cacheKey: string }) => {
      enqueues += 1;
      artifacts.set(input.cacheKey, {
        status: 'ready',
        audio_data: Buffer.from([1]),
        mime_type: 'audio/wav',
        content_hash: 'hash'
      });
    }
  };

  const first = await prepareOnboardingTts(dependencies);
  const second = await prepareOnboardingTts(dependencies);

  assert.equal(first.total, 88);
  assert.equal(first.ready, 0);
  assert.equal(first.enqueued, 88);
  assert.equal(second.total, 88);
  assert.equal(second.ready, 88);
  assert.equal(second.enqueued, 0);
  assert.equal(enqueues, 88);
  assert.equal(reads, 176);
  assert.equal(isReadyTtsArtifact({
    status: 'ready',
    audio_data: Buffer.from([1]),
    mime_type: 'audio/wav',
    content_hash: 'hash'
  } as any), true);
  assert.equal(isReadyTtsArtifact({
    status: 'ready',
    audio_data: Buffer.alloc(0),
    mime_type: 'audio/wav',
    content_hash: 'hash'
  } as any), false);
});
