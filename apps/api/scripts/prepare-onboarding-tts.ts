import { appConfig } from '../src/config.js';
import { db } from '../src/db.js';
import { prepareOnboardingTts } from '../src/speechQueue.js';
import { getTtsArtifact, enqueueTtsJob, withTransaction } from '../src/repositories.js';

function isLocalDatabaseUrl(databaseUrl: string) {
  try {
    const host = new URL(databaseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === 'postgres';
  } catch {
    return false;
  }
}

if (!isLocalDatabaseUrl(appConfig.KITABU_DATABASE_URL)) {
  throw new Error('Refusing onboarding TTS preparation: KITABU_DATABASE_URL is not a local development database.');
}

try {
  const result = await prepareOnboardingTts({
    getArtifact: cacheKey => getTtsArtifact(db, cacheKey),
    enqueue: input => withTransaction(client => enqueueTtsJob(client, input))
  });

  console.log(JSON.stringify({
    ...result,
    voices: 4,
    cueCount: result.total / 4,
    model: appConfig.KITABU_GEMINI_TTS_MODEL,
    retrievalFirst: true,
    readyRequires: 'status=ready, non-empty audio_data, mime_type, and content_hash'
  }, null, 2));
} finally {
  await db.end();
}
