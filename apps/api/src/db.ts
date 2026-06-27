import { Pool } from 'pg';
import Redis from 'ioredis';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appConfig } from './config.js';

export type DependencyHealth = {
  status: 'ok' | 'degraded';
  message?: string;
  checkedAt: string;
};

let redisLastError: string | undefined;
let redisLastErrorAt: Date | undefined;
let redisLastLogAt = 0;

function isLocalDatabaseUrl(databaseUrl: string) {
  try {
    const host = new URL(databaseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === 'postgres';
  } catch {
    return false;
  }
}

function loadDatabaseCa() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(process.cwd(), 'certs', 'supabase-root-2021-ca.pem'),
    join(process.cwd(), 'apps', 'api', 'certs', 'supabase-root-2021-ca.pem'),
    join(currentDir, '..', 'certs', 'supabase-root-2021-ca.pem')
  ];

  const certPath = candidates.find(candidate => existsSync(candidate));
  return certPath ? readFileSync(certPath, 'utf8') : undefined;
}

function databaseConnectionString(databaseUrl: string) {
  try {
    const parsed = new URL(databaseUrl);
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
      parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return databaseUrl;
  }
}

function databaseSslOptions(databaseUrl: string) {
  if (appConfig.KITABU_DATABASE_SSL_MODE === 'disable') {
    return undefined;
  }

  if (appConfig.KITABU_DATABASE_SSL_MODE === 'require') {
    return { rejectUnauthorized: false };
  }

  if (appConfig.KITABU_DATABASE_SSL_MODE === 'verify-full') {
    return {
      ca: loadDatabaseCa(),
      rejectUnauthorized: true
    };
  }

  return isLocalDatabaseUrl(databaseUrl)
    ? undefined
    : {
        ca: loadDatabaseCa(),
        rejectUnauthorized: true
      };
}

export const db = new Pool({
  connectionString: databaseConnectionString(appConfig.KITABU_DATABASE_URL),
  ssl: databaseSslOptions(appConfig.KITABU_DATABASE_URL),
  max: appConfig.KITABU_DATABASE_POOL_MAX,
  idleTimeoutMillis: appConfig.KITABU_DATABASE_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: appConfig.KITABU_DATABASE_CONNECTION_TIMEOUT_MS,
  statement_timeout: appConfig.KITABU_DATABASE_STATEMENT_TIMEOUT_MS,
  query_timeout: appConfig.KITABU_DATABASE_STATEMENT_TIMEOUT_MS
});

export const redis = new Redis(appConfig.KITABU_REDIS_URL, {
  connectTimeout: 5_000,
  commandTimeout: 5_000,
  maxRetriesPerRequest: 2
});

redis.on('connect', () => {
  redisLastError = undefined;
  redisLastErrorAt = undefined;
});

redis.on('error', error => {
  redisLastError = error.message;
  redisLastErrorAt = new Date();

  const now = Date.now();
  if (now - redisLastLogAt > 60_000) {
    redisLastLogAt = now;
    console.warn('[redis] connection degraded', {
      message: error.message,
      status: redis.status
    });
  }
});

export async function checkDatabaseHealth(): Promise<DependencyHealth> {
  try {
    await db.query('SELECT 1');
    return {
      status: 'ok',
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'degraded',
      message: error instanceof Error ? error.message : 'Database health check failed',
      checkedAt: new Date().toISOString()
    };
  }
}

export async function checkRedisHealth(): Promise<DependencyHealth> {
  try {
    await redis.ping();
    return {
      status: 'ok',
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : redisLastError || 'Redis health check failed';
    return {
      status: 'degraded',
      message: redisLastErrorAt
        ? `${message}; last error at ${redisLastErrorAt.toISOString()}`
        : message,
      checkedAt: new Date().toISOString()
    };
  }
}
