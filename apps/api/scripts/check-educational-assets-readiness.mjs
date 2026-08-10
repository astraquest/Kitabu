import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

const { Pool } = pg;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(currentDir, '..');
const sqlDir = path.resolve(apiDir, 'sql');
const requiredTables = [
  'educational_asset_providers',
  'educational_assets',
  'educational_asset_provenance',
  'educational_asset_import_runs',
  'curriculum_units',
];

loadEnv({ path: path.resolve(apiDir, '.env'), override: false });

const destructiveChecks = [
  { pattern: /\bDROP\s+(TABLE|SCHEMA|DATABASE)\b/i, label: 'DROP TABLE/SCHEMA/DATABASE' },
  { pattern: /\bTRUNCATE\b/i, label: 'TRUNCATE' },
  { pattern: /\bDELETE\s+FROM\s+[a-z0-9_."`]+\s*;/i, label: 'DELETE without a WHERE clause' },
  { pattern: /\bDELETE\s+FROM\s+users\b/i, label: 'DELETE FROM users' },
];

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
    path.resolve(process.cwd(), 'apps', 'api', 'certs', 'supabase-root-2021-ca.pem'),
  ];
  const certPath = candidates.find(candidate => existsSync(candidate));
  return certPath ? readFileSync(certPath, 'utf8') : undefined;
}

function databaseConnectionString(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) parsed.searchParams.delete(key);
    return parsed.toString();
  } catch {
    return databaseUrl;
  }
}

function databaseSslOptions(databaseUrl) {
  const sslMode = process.env.KITABU_DATABASE_SSL_MODE?.trim() || 'auto';
  if (sslMode === 'disable') return undefined;
  if (sslMode === 'require') return { rejectUnauthorized: false };
  if (sslMode === 'verify-full') return { ca: loadDatabaseCa(), rejectUnauthorized: true };
  return isLocalDatabaseUrl(databaseUrl)
    ? undefined
    : { ca: loadDatabaseCa(), rejectUnauthorized: true };
}

export function listMigrationFiles(files) {
  return [...files]
    .filter(file => /^\d+.*\.sql$/i.test(file))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

export function inspectPendingMigrations(migrationFiles, appliedFilenames, readSql) {
  const applied = new Set(appliedFilenames);
  return listMigrationFiles(migrationFiles)
    .filter(filename => !applied.has(filename))
    .map(filename => {
      const sql = readSql(filename);
      const blockers = destructiveChecks
        .filter(check => check.pattern.test(sql))
        .map(check => check.label);
      return { filename, destructiveBlockers: [...new Set(blockers)] };
    });
}

export function buildReadinessReport({
  databaseReachable,
  schemaMigrationsPresent,
  appliedFilenames,
  pendingMigrations,
  tables,
  storageRoot,
  storageRootConfigured,
  databaseErrorCode = null,
}) {
  const destructivePending = pendingMigrations.filter(item => item.destructiveBlockers.length > 0);
  const missingTables = requiredTables.filter(table => tables[table] !== true);
  const blockers = [];
  if (!databaseReachable) blockers.push('Database is unreachable; verify local database configuration and availability.');
  if (databaseReachable && !schemaMigrationsPresent) blockers.push('schema_migrations is absent; run the documented migration command after the approved safety decision.');
  if (destructivePending.length) blockers.push('Pending migrations include destructive safety patterns; review backup/restore evidence before any migration run.');
  if (databaseReachable && schemaMigrationsPresent && missingTables.length) blockers.push(`Required tables are missing: ${missingTables.join(', ')}.`);

  return {
    checkedAt: new Date().toISOString(),
    database: {
      reachable: databaseReachable,
      schemaMigrationsPresent,
      appliedMigrationCount: appliedFilenames.length,
      errorCode: databaseErrorCode,
    },
    migrations: {
      sqlDirectory: 'apps/api/sql',
      pending: pendingMigrations,
      destructivePending: destructivePending.map(item => item.filename),
    },
    schema: Object.fromEntries(requiredTables.map(table => [table, tables[table] === true])),
    storage: { configured: storageRootConfigured, root: storageRoot },
    status: blockers.length ? 'blocked' : 'ready',
    blockers,
    actionable: blockers.length
      ? 'Resolve the reported blockers, then rerun npm.cmd run assets:preflight -w apps/api. This command never applies migrations or writes assets.'
      : 'Readiness preflight passed; migration/import commands remain separate and require their own safety checks.',
  };
}

function help() {
  console.log('Read-only educational-assets migration and storage readiness check.');
  console.log('Usage: npm.cmd run assets:preflight -w apps/api');
  console.log('The command never creates schema_migrations, applies SQL, writes storage, or downloads assets.');
}

async function readDatabaseReadiness(databaseUrl) {
  if (!databaseUrl?.trim()) {
    return { databaseReachable: false, schemaMigrationsPresent: false, appliedFilenames: [], tables: {}, databaseErrorCode: 'DATABASE_URL_MISSING' };
  }
  const pool = new Pool({
    connectionString: databaseConnectionString(databaseUrl),
    ssl: databaseSslOptions(databaseUrl),
    connectionTimeoutMillis: 5_000,
  });
  try {
    const migrationTable = await pool.query("SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present");
    const schemaMigrationsPresent = migrationTable.rows[0]?.present === true;
    const applied = schemaMigrationsPresent
      ? await pool.query('SELECT filename FROM schema_migrations ORDER BY filename')
      : { rows: [] };
    const tableResult = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [requiredTables],
    );
    const existingTables = new Set(tableResult.rows.map(row => row.table_name));
    return {
      databaseReachable: true,
      schemaMigrationsPresent,
      appliedFilenames: applied.rows.map(row => row.filename),
      tables: Object.fromEntries(requiredTables.map(table => [table, existingTables.has(table)])),
      databaseErrorCode: null,
    };
  } catch (error) {
    return {
      databaseReachable: false,
      schemaMigrationsPresent: false,
      appliedFilenames: [],
      tables: {},
      databaseErrorCode: typeof error?.code === 'string' ? error.code : 'DATABASE_CHECK_FAILED',
    };
  } finally {
    await pool.end().catch(() => {});
  }
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    help();
    return;
  }

  const database = await readDatabaseReadiness(process.env.KITABU_DATABASE_URL);
  const pendingMigrations = inspectPendingMigrations(
    readdirSync(sqlDir),
    database.appliedFilenames,
    filename => readFileSync(path.join(sqlDir, filename), 'utf8'),
  );
  const storageRoot = process.env.KITABU_EDUCATIONAL_ASSET_STORAGE_ROOT?.trim() || './var/educational-assets';
  const report = buildReadinessReport({
    ...database,
    pendingMigrations,
    storageRoot,
    storageRootConfigured: Boolean(process.env.KITABU_EDUCATIONAL_ASSET_STORAGE_ROOT?.trim()),
  });
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'ready') process.exitCode = 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) await main();
