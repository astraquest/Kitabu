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
  repairMissingOnboardingTts,
  spokenCuesFromQuestions,
  TTS_AVATAR_VOICES
} =
  await import('./speechQueue.js');
const { PARENT_ONBOARDING_TTS_CUES } = await import('./onboardingTts.js');
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

test('parent onboarding catalog contains exactly the short semantic copy', () => {
  assert.equal(PARENT_ONBOARDING_TTS_CUES.length, 31);
  for (const cue of PARENT_ONBOARDING_TTS_CUES) {
    assert.ok(cue.text.length <= 140);
    assert.doesNotMatch(cue.text, /option\s+[a-d]|answer choices|checkbox|question\s+\d+/i);
  }
  assert.ok(PARENT_ONBOARDING_TTS_CUES.some(cue => cue.id === 'parent-role' && cue.text === 'Are you a parent or a teacher?'));
  assert.ok(PARENT_ONBOARDING_TTS_CUES.some(cue => cue.id === 'parent-microphone' && cue.text.includes('microphone access')));
  assert.equal(PARENT_ONBOARDING_TTS_CUES.some(cue => cue.text.includes('How should your tutor sound?')), false);
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

  assert.equal(first.total, 31);
  assert.equal(first.ready, 0);
  assert.equal(first.enqueued, 31);
  assert.equal(second.total, 31);
  assert.equal(second.ready, 31);
  assert.equal(second.enqueued, 0);
  assert.equal(enqueues, 31);
  assert.equal(reads, 62);
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

test('storage repair requeues only missing English curated artifacts', async () => {
  const targetCue = PARENT_ONBOARDING_TTS_CUES[0];
  const targetIdentity = buildTtsArtifactKey({ text: targetCue.text, language: 'en', voice: 'Bella' });
  const unrelatedIdentity = buildTtsArtifactKey({ text: 'Legacy unrelated cue', language: 'en', voice: 'Bella' });
  const requested: string[] = [];
  const requeued: Array<Record<string, unknown>> = [];
  const result = await repairMissingOnboardingTts({
    getArtifact: async cacheKey => {
      requested.push(cacheKey);
      if (cacheKey === targetIdentity.cacheKey) {
        return {
          status: 'ready',
          audio_data: Buffer.alloc(0),
          storage_key: 'tts/missing.wav',
          mime_type: 'audio/wav',
          content_hash: 'hash'
        } as any;
      }
      if (cacheKey === unrelatedIdentity.cacheKey) {
        return {
          status: 'ready',
          audio_data: Buffer.alloc(0),
          storage_key: 'tts/unrelated.wav',
          mime_type: 'audio/wav',
          content_hash: 'hash'
        } as any;
      }
      return null;
    },
    storage: {
      backend: 'local',
      put: async () => ({ storageKey: 'unused', byteSize: 0 }),
      read: async () => new Uint8Array(0),
      publicUrl: () => null
    },
    enqueue: async input => { requeued.push(input); }
  });

  assert.equal(result.total, 31);
  assert.equal(result.ready, 1);
  assert.equal(result.present, 0);
  assert.equal(result.missing, 1);
  assert.equal(result.requeued, 1);
  assert.equal(result.failed, 0);
  assert.equal(requeued[0].provider, 'cartesia');
  assert.equal(requeued[0].voice, 'Bella');
  assert.equal(requeued[0].repairReadyMissingStorage, true);
  assert.equal(requested.includes(unrelatedIdentity.cacheKey), false);
});

test('storage repair reconfigures pending parent jobs for Cartesia unless they are processing', async () => {
  const englishCues = PARENT_ONBOARDING_TTS_CUES;
  const staleCue = englishCues[0];
  const processingCue = englishCues[1];
  const staleIdentity = buildTtsArtifactKey({ text: staleCue.text, language: 'en', voice: 'Bella' });
  const processingIdentity = buildTtsArtifactKey({ text: processingCue.text, language: 'en', voice: 'Bella' });
  const jobs: string[] = [];
  const requeued: Array<Record<string, unknown>> = [];
  const result = await repairMissingOnboardingTts({
    getArtifact: async cacheKey => {
      if (cacheKey === staleIdentity.cacheKey) {
        return { id: 'stale-pending', status: 'pending', audio_data: Buffer.alloc(0), storage_key: 'tts/stale.wav' } as any;
      }
      if (cacheKey === processingIdentity.cacheKey) {
        return { id: 'processing-pending', status: 'pending', audio_data: Buffer.alloc(0), storage_key: 'tts/processing.wav' } as any;
      }
      return null;
    },
    getJob: async artifactId => {
      jobs.push(artifactId);
      return artifactId === 'processing-pending'
        ? { status: 'processing', available_at: new Date(0) }
        : { status: 'pending', available_at: new Date(0) };
    },
    storage: {
      backend: 'local',
      put: async () => ({ storageKey: 'unused', byteSize: 0 }),
      read: async () => new Uint8Array(0),
      publicUrl: () => null
    },
    enqueue: async input => { requeued.push(input); }
  });

  assert.equal(result.total, 31);
  assert.equal(result.missing, 1);
  assert.equal(result.requeued, 1);
  assert.deepEqual(jobs, ['stale-pending', 'processing-pending']);
  assert.equal(requeued[0].repairPendingArtifact, true);
  assert.equal(requeued[0].provider, 'cartesia');
  assert.equal(requeued[0].model, 'sonic-3');
});

test('durable speech treats a missing ready object as a miss and requests repair', async () => {
  const readyArtifact = {
    status: 'ready',
    audio_data: Buffer.alloc(0),
    storage_key: 'tts/missing.wav',
    mime_type: 'audio/wav',
    content_hash: 'hash',
    gemini_model: 'tts-v1',
    gemini_voice: 'Puck'
  } as any;
  let repaired = 0;
  let synthesized = 0;
  const result = await getOrCreateDurableSpeech(
    { text: 'Missing storage cue', avatarVoice: 'Samora' },
    {
      getArtifact: async () => readyArtifact,
      storage: {
        backend: 'local',
        put: async () => ({ storageKey: 'unused', byteSize: 0 }),
        read: async () => { throw new Error('missing'); },
        publicUrl: () => null
      },
      repairReadyMissingStorage: async () => { repaired += 1; },
      synthesize: async () => {
        synthesized += 1;
        return { base64Audio: Buffer.from([1]).toString('base64'), mimeType: 'audio/wav', model: 'tts-v1', voice: 'Puck' };
      },
      persist: async () => undefined
    }
  );
  assert.equal(result.cacheHit, false);
  assert.equal(result.audio?.base64Audio, Buffer.from([1]).toString('base64'));
  assert.equal(repaired, 1);
  assert.equal(synthesized, 1);
});
