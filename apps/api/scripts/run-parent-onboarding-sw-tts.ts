import { createHash, randomUUID } from 'node:crypto';

import { appConfig } from '../src/config.js';
import { db } from '../src/db.js';
import { PARENT_ONBOARDING_SW_TTS_CUES } from '../src/onboardingTts.js';
import { getTtsArtifact, getTtsJobForArtifact } from '../src/repositories.js';
import {
  PARENT_ONBOARDING_TTS_VOICE,
  buildTtsArtifactKey,
  prepareOnboardingTtsCatalog,
  repairMissingOnboardingTtsCatalog
} from '../src/speechQueue.js';
import { createTtsAssetStorage } from '../src/ttsStorage.js';
import { processCartesiaTtsJobsForArtifacts } from '../src/ttsWorker.js';

const endpointBaseUrl = (process.env.KITABU_PARENT_TTS_ENDPOINT_BASE_URL ?? 'http://localhost:4001').replace(/\/$/, '');
const verifyEndpoint = process.argv.includes('--verify-endpoint') || process.env.KITABU_PARENT_TTS_VERIFY_ENDPOINT === '1';

function configuredCartesiaVoice(voice: string) {
  let configured: unknown;
  try {
    configured = JSON.parse(appConfig.KITABU_CARTESIA_VOICE_MAP);
  } catch {
    throw new Error('KITABU_CARTESIA_VOICE_MAP must be valid JSON');
  }
  if (!configured || typeof configured !== 'object' || Array.isArray(configured)) return false;
  const map = configured as Record<string, unknown>;
  const value = map[voice] ?? map.default ?? appConfig.KITABU_CARTESIA_DEFAULT_VOICE;
  return typeof value === 'string' ? Boolean(value.trim()) : Boolean(value && typeof value === 'object' && 'id' in value && typeof value.id === 'string' && value.id.trim());
}

function assertWav(bytes: Uint8Array, cueId: string) {
  const header = Buffer.from(bytes.subarray(0, 12)).toString('ascii');
  if (bytes.byteLength < 44 || header.slice(0, 4) !== 'RIFF' || header.slice(8, 12) !== 'WAVE') {
    throw new Error(`${cueId}: Supabase object is not a non-empty WAV file`);
  }
}

try {
  if (appConfig.KITABU_TTS_STORAGE_BACKEND !== 'supabase') {
    throw new Error('Kiswahili parent TTS runner requires KITABU_TTS_STORAGE_BACKEND=supabase');
  }
  if (!appConfig.KITABU_SUPABASE_URL || !appConfig.KITABU_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Kiswahili parent TTS runner requires Supabase URL and service-role key');
  }
  if (!appConfig.KITABU_CARTESIA_API_KEY || !configuredCartesiaVoice(PARENT_ONBOARDING_TTS_VOICE)) {
    throw new Error(`Kiswahili parent TTS runner requires Cartesia API key and a ${PARENT_ONBOARDING_TTS_VOICE} voice mapping`);
  }

  const storage = createTtsAssetStorage();
  const preparation = await prepareOnboardingTtsCatalog(PARENT_ONBOARDING_SW_TTS_CUES, 'sw');
  const repair = await repairMissingOnboardingTtsCatalog(PARENT_ONBOARDING_SW_TTS_CUES, 'sw');
  const identities = PARENT_ONBOARDING_SW_TTS_CUES.map(cue => ({
    cue,
    identity: buildTtsArtifactKey({ text: cue.text, language: 'sw', voice: PARENT_ONBOARDING_TTS_VOICE })
  }));
  const beforeProcessing = await Promise.all(identities.map(({ identity }) => getTtsArtifact(db, identity.cacheKey)));
  if (beforeProcessing.some(artifact => !artifact)) {
    throw new Error(`Kiswahili parent TTS runner could not resolve all ${identities.length} prepared artifacts`);
  }

  const pendingArtifactIds = beforeProcessing
    .filter((artifact): artifact is NonNullable<typeof artifact> => artifact?.status !== 'ready')
    .map(artifact => artifact.id);
  const processing = { claimed: 0, completed: 0, deferred: 0, failed: 0, errors: [] as Array<{ jobId: string; message: string }> };
  while (processing.completed < pendingArtifactIds.length) {
    const batch = await processCartesiaTtsJobsForArtifacts(pendingArtifactIds, {
      limit: 1,
      workerId: `parent-sw-tts-${process.pid}-${randomUUID()}`
    });
    processing.claimed += batch.claimed;
    processing.completed += batch.completed;
    processing.deferred += batch.deferred;
    processing.failed += batch.failed;
    processing.errors.push(...batch.errors);
    if (batch.deferred || batch.failed || batch.claimed !== 1 || batch.completed !== 1) {
      throw new Error(`Kiswahili parent-only Cartesia processing incomplete: ${JSON.stringify(processing)}`);
    }
  }

  const verified = [] as Array<{ cueId: string; artifactId: string; bytes: number; sha256: string }>;
  for (const { cue, identity } of identities) {
    const artifact = await getTtsArtifact(db, identity.cacheKey);
    if (!artifact || artifact.status !== 'ready' || artifact.language !== 'sw' || artifact.provider !== 'cartesia' || artifact.avatar_voice !== PARENT_ONBOARDING_TTS_VOICE || artifact.storage_backend !== 'supabase' || !artifact.storage_key || !artifact.content_hash) {
      throw new Error(`${cue.id}: artifact is not ready with Kiswahili Cartesia/Supabase metadata`);
    }
    const job = await getTtsJobForArtifact(db, artifact.id);
    if (job?.status !== 'completed' || job.provider !== 'cartesia') throw new Error(`${cue.id}: Cartesia TTS job is not completed`);
    const bytes = await storage.read(artifact.storage_key);
    assertWav(bytes, cue.id);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (sha256 !== artifact.content_hash) throw new Error(`${cue.id}: Supabase object hash does not match content_hash`);
    verified.push({ cueId: cue.id, artifactId: artifact.id, bytes: bytes.byteLength, sha256 });
  }

  const endpointResults = [] as Array<{ cueId: string; status: number; bytes: number; latencyMs: number }>;
  if (verifyEndpoint) {
    for (const { cue } of identities) {
      const started = performance.now();
      const response = await fetch(`${endpointBaseUrl}/landing/synthesize-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cueId: cue.id, voice: PARENT_ONBOARDING_TTS_VOICE, language: 'sw' })
      });
      const body = await response.arrayBuffer();
      const latencyMs = Math.round(performance.now() - started);
      if (response.status !== 200 || !body.byteLength) {
        throw new Error(`${cue.id}: endpoint returned ${response.status} with ${body.byteLength} bytes`);
      }
      endpointResults.push({ cueId: cue.id, status: response.status, bytes: body.byteLength, latencyMs });
    }
  }

  console.log(JSON.stringify({
    catalog: 'parent-onboarding-sw',
    cueCount: identities.length,
    voice: PARENT_ONBOARDING_TTS_VOICE,
    language: 'sw',
    provider: 'cartesia',
    storageBackend: storage.backend,
    preparation,
    repair,
    processing,
    verified,
    endpointResults: verifyEndpoint ? endpointResults : undefined
  }, null, 2));
} finally {
  await db.end();
}
