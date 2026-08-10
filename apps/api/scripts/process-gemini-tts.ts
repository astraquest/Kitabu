import { db, redis } from '../src/db.js';
import { processGeminiTtsQueue } from '../src/ttsWorker.js';

try {
  const rawLimit = process.env.KITABU_TTS_MANUAL_LIMIT;
  const limit = rawLimit ? Math.max(1, Number.parseInt(rawLimit, 10)) : undefined;
  const result = await processGeminiTtsQueue({ limit });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await redis.quit().catch(() => undefined);
  await db.end().catch(() => undefined);
}
