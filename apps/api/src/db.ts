import { Pool } from 'pg';
import Redis from 'ioredis';
import { appConfig } from './config.js';

export const db = new Pool({
  connectionString: appConfig.KITABU_DATABASE_URL,
  max: appConfig.KITABU_DATABASE_POOL_MAX,
  idleTimeoutMillis: appConfig.KITABU_DATABASE_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: appConfig.KITABU_DATABASE_CONNECTION_TIMEOUT_MS,
  statement_timeout: appConfig.KITABU_DATABASE_STATEMENT_TIMEOUT_MS,
  query_timeout: appConfig.KITABU_DATABASE_STATEMENT_TIMEOUT_MS
});

export const redis = new Redis(appConfig.KITABU_REDIS_URL, {
  maxRetriesPerRequest: 2
});
