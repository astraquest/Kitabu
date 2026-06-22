import { checkRedisHealth, db } from './db.js';

async function run() {
  await db.query('SELECT 1');
  const initialRedisHealth = await checkRedisHealth();
  if (initialRedisHealth.status !== 'ok') {
    throw new Error(`Redis is unavailable: ${initialRedisHealth.message ?? 'health check failed'}`);
  }
  setInterval(async () => {
    const redisHealth = await checkRedisHealth();
    if (redisHealth.status !== 'ok') {
      console.warn('[worker] Redis health check degraded', redisHealth);
    }
  }, 30_000);
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
