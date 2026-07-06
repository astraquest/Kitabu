import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(currentDir, '..');
const envPath = path.resolve(apiDir, '.env');
const sqlDir = path.resolve(apiDir, 'sql');

loadEnv({ path: envPath });

function isLocalDatabaseUrl(databaseUrl) {
  try {
    const host = new URL(databaseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === 'postgres';
  } catch {
    return false;
  }
}

function loadDatabaseCa() {
  const candidates = [
    path.resolve(apiDir, 'certs', 'supabase-root-2021-ca.pem'),
    path.resolve(process.cwd(), 'certs', 'supabase-root-2021-ca.pem'),
    path.resolve(process.cwd(), 'apps', 'api', 'certs', 'supabase-root-2021-ca.pem')
  ];

  const certPath = candidates.find(candidate => existsSync(candidate));
  return certPath ? readFileSync(certPath, 'utf8') : undefined;
}

function databaseConnectionString(databaseUrl) {
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

function databaseSslOptions(databaseUrl) {
  const sslMode = process.env.KITABU_DATABASE_SSL_MODE?.trim() || 'auto';

  if (sslMode === 'disable') {
    return undefined;
  }

  if (sslMode === 'require') {
    return { rejectUnauthorized: false };
  }

  if (sslMode === 'verify-full') {
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

function checksum(sql) {
  return createHash('sha256').update(sql).digest('hex');
}

function checksumSql(sql) {
  return checksum(sql.replace(/\r\n/g, '\n'));
}

if (!process.env.KITABU_DATABASE_URL) {
  console.error('KITABU_DATABASE_URL is not set.');
  process.exit(1);
}

const sqlFiles = readdirSync(sqlDir)
  .filter(file => /^\d+.*\.sql$/i.test(file))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (sqlFiles.length === 0) {
  console.log('No SQL migrations found.');
  process.exit(0);
}

const pool = new Pool({
  connectionString: databaseConnectionString(process.env.KITABU_DATABASE_URL),
  ssl: databaseSslOptions(process.env.KITABU_DATABASE_URL)
});

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  if (process.env.KITABU_MIGRATIONS_BASELINE === 'true') {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM schema_migrations');
    if (rows[0]?.count > 0) {
      throw new Error('KITABU_MIGRATIONS_BASELINE=true was set, but schema_migrations already has rows.');
    }

    for (const file of sqlFiles) {
      const fullPath = path.join(sqlDir, file);
      const sql = readFileSync(fullPath, 'utf8');
      await pool.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)', [file, checksumSql(sql)]);
      console.log(`Baselined ${file}`);
    }

    console.log('Migration baseline recorded successfully.');
  } else {
    for (const file of sqlFiles) {
      const fullPath = path.join(sqlDir, file);
      const sql = readFileSync(fullPath, 'utf8');
      const sqlChecksum = checksumSql(sql);
      const rawChecksum = checksum(sql);
      const existing = await pool.query('SELECT checksum FROM schema_migrations WHERE filename = $1', [file]);

      if (existing.rowCount) {
        if (existing.rows[0].checksum !== sqlChecksum) {
          if (existing.rows[0].checksum === rawChecksum) {
            await pool.query('UPDATE schema_migrations SET checksum = $2 WHERE filename = $1', [file, sqlChecksum]);
            console.log(`Normalized checksum for ${file}`);
            continue;
          }

          throw new Error(`${file} checksum changed after it was applied.`);
        }

        console.log(`Skipping ${file}`);
        continue;
      }

      console.log(`Applying ${file}`);
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)', [file, sqlChecksum]);
        await pool.query('COMMIT');
      } catch (error) {
        await pool.query('ROLLBACK').catch(() => {});
        throw error;
      }
    }

    console.log('All migrations applied successfully.');
  }
} catch (error) {
  console.error('Migration failed.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
