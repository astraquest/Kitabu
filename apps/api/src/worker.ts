import { checkRedisHealth, db } from './db.js';
import { fulfillDueAccountDeletionRequests, withTransaction } from './repositories.js';

const ACCOUNT_DELETION_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

async function sweepDueAccountDeletions() {
  const deletedCount = await withTransaction(client => fulfillDueAccountDeletionRequests(client));
  if (deletedCount > 0) {
    console.info('[worker] fulfilled due account deletion requests', { deletedCount });
  }
}

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

  await sweepDueAccountDeletions();
  setInterval(() => {
    sweepDueAccountDeletions().catch(error => {
      console.error('[worker] account deletion sweep failed', error);
    });
  }, ACCOUNT_DELETION_SWEEP_INTERVAL_MS);
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
