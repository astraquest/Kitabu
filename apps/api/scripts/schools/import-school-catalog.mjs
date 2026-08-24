import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createGunzip } from 'node:zlib';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

const { Pool } = pg;
const apiDir = path.resolve(import.meta.dirname, '..', '..');
loadEnv({ path: path.join(apiDir, '.env') });
export const defaultSourcePath = path.join(apiDir, 'data', 'school-directory', 'kenya-schools-master.ndjson.gz');
export const defaultManifestPath = path.join(apiDir, 'data', 'school-directory', 'manifest.json');
const textFields = ['schoolName', 'level', 'county', 'subCounty', 'schoolType', 'dayBoarding', 'gender', 'sponsor', 'schoolCode', 'dataSource'];
const catalogPlanCodes = ['weekly', 'monthly', 'annual'];

function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function normalizeNullable(value) { return typeof value === 'string' && value.trim() === '' ? null : value ?? null; }

export function sourceRowFingerprint(row) {
  const normalized = Object.fromEntries(textFields.map(field => [field, normalizeNullable(row[field])]));
  return sha256(canonicalJson({ ...normalized, sourceRowNumber: row.sourceRowNumber, latitude: row.latitude, longitude: row.longitude }));
}

export function validateRow(row, manifest) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Every source line must be a JSON object.');
  for (const field of textFields) {
    if (!['county', 'subCounty', 'schoolType', 'dayBoarding', 'gender', 'sponsor'].includes(field) && typeof row[field] !== 'string') throw new Error(`Missing or invalid ${field}.`);
  }
  const normalized = Object.fromEntries(textFields.map(field => [field, normalizeNullable(row[field])]));
  if (!normalized.schoolName || !normalized.level || !normalized.schoolCode || !normalized.dataSource) throw new Error('Required school catalog field is blank.');
  if (!/^\d{1,9}$/.test(normalized.schoolCode)) throw new Error(`Invalid school code: ${normalized.schoolCode}`);
  if (!/^(?:knec:\d{1,9}|source:[0-9a-f]{64})$/.test(row.sourceRecordKey ?? '')) throw new Error(`Invalid source record key: ${row.sourceRecordKey}`);
  if (row.sourceWorkbookSha256 !== manifest.sourceWorkbookSha256) throw new Error(`Workbook fingerprint mismatch at row ${row.sourceRowNumber}.`);
  if (!Number.isInteger(row.sourceRowNumber) || row.sourceRowNumber < 2) throw new Error(`Invalid source row number: ${row.sourceRowNumber}`);
  if (!Number.isFinite(row.latitude) || row.latitude < -5 || row.latitude > 5.5) throw new Error(`Invalid latitude at row ${row.sourceRowNumber}.`);
  if (!Number.isFinite(row.longitude) || row.longitude < 33.5 || row.longitude > 42.5) throw new Error(`Invalid longitude at row ${row.sourceRowNumber}.`);
  if (sourceRowFingerprint({ ...normalized, sourceRowNumber: row.sourceRowNumber, latitude: row.latitude, longitude: row.longitude }) !== row.sourceRowSha256) throw new Error(`Source row fingerprint mismatch at row ${row.sourceRowNumber}.`);
  return { ...normalized, sourceRecordKey: row.sourceRecordKey, sourceWorkbookSha256: row.sourceWorkbookSha256, sourceRowNumber: row.sourceRowNumber, sourceRowSha256: row.sourceRowSha256, latitude: row.latitude, longitude: row.longitude };
}

export function classifyExisting(rows, existingByKey) {
  return rows.reduce((counts, row) => {
    const existing = existingByKey.get(row.sourceRecordKey);
    if (!existing) counts.inserts += 1;
    else if (existing.source_row_sha256 !== row.sourceRowSha256) counts.updates += 1;
    else counts.unchanged += 1;
    return counts;
  }, { inserts: 0, updates: 0, unchanged: 0 });
}

function schoolTypeFromCatalog(value) {
  const normalized = (value ?? '').toLowerCase();
  if (normalized.includes('day') && normalized.includes('boarding')) return 'day_and_boarding';
  if (normalized.includes('boarding')) return 'boarding_school';
  return 'day_school';
}

function slugFor(row) {
  const base = row.schoolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'school';
  return `${base}-${sha256(row.sourceRecordKey).slice(0, 10)}`;
}

async function loadManifest(manifestPath) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.schema !== 1 || !/^[0-9a-f]{64}$/.test(manifest.sourceWorkbookSha256) || !/^[0-9a-f]{64}$/.test(manifest.artifactSha256) || !Number.isInteger(manifest.artifactBytes) || manifest.artifactBytes < 1) throw new Error('Invalid school catalog manifest.');
  return manifest;
}

async function* readRows(sourcePath, manifest) {
  const digest = createHash('sha256');
  let compressedBytes = 0;
  const compressedInput = createReadStream(sourcePath);
  compressedInput.on('data', chunk => { digest.update(chunk); compressedBytes += chunk.length; });
  const reader = readline.createInterface({ input: compressedInput.pipe(createGunzip()), crlfDelay: Infinity });
  let lineNumber = 0;
  let accepted = 0;
  for await (const line of reader) {
    lineNumber += 1;
    if (!line.trim()) continue;
    let raw;
    try { raw = JSON.parse(line); } catch (error) { throw new Error(`Invalid JSON at source line ${lineNumber}: ${error.message}`); }
    yield validateRow(raw, manifest);
    accepted += 1;
  }
  if (digest.digest('hex') !== manifest.artifactSha256) throw new Error('School catalog artifact fingerprint mismatch.');
  if (compressedBytes !== manifest.artifactBytes) throw new Error(`Manifest artifactBytes=${manifest.artifactBytes}, artifact bytes=${compressedBytes}.`);
  if (accepted !== manifest.acceptedRows) throw new Error(`Manifest acceptedRows=${manifest.acceptedRows}, artifact rows=${accepted}.`);
}

async function loadDefaultPlans(client) {
  const result = await client.query(
    `SELECT id, code, price_ksh_cents
       FROM subscription_plans
      WHERE code = ANY($1::text[]) AND is_hidden = FALSE
      ORDER BY CASE code WHEN 'weekly' THEN 1 WHEN 'monthly' THEN 2 WHEN 'annual' THEN 3 END`,
    [catalogPlanCodes],
  );
  const plans = new Map(result.rows.map(row => [row.code, row]));
  if (catalogPlanCodes.some(code => !plans.has(code))) throw new Error('Current weekly/monthly/annual pricing configuration is incomplete.');
  return {
    assignedPlanId: plans.get('monthly').id,
    prices: Object.fromEntries(catalogPlanCodes.map(code => [code, Number(plans.get(code).price_ksh_cents)])),
    availablePlanCodes: catalogPlanCodes,
  };
}

async function resolveBatch(client, rows) {
  const keys = rows.map(row => row.sourceRecordKey);
  const names = [...new Set(rows.map(row => row.schoolName.trim().toLowerCase()))];
  const result = await client.query(
    `SELECT id, source_record_key, source_row_sha256, name, location
       FROM schools
      WHERE source_record_key = ANY($1::text[])
         OR lower(btrim(name)) = ANY($2::text[])`,
    [keys, names],
  );
  const byKey = new Map(result.rows.filter(row => row.source_record_key).map(row => [row.source_record_key, row]));
  const byIdentity = new Map();
  for (const row of result.rows.filter(row => !row.source_record_key)) {
    const identity = `${row.name.trim().toLowerCase()}\u0000${(row.location ?? '').trim().toLowerCase()}`;
    const matches = byIdentity.get(identity) ?? [];
    matches.push(row);
    byIdentity.set(identity, matches);
  }
  const usedIds = new Set();
  const updates = [];
  const inserts = [];
  const unchanged = [];
  for (const row of rows) {
    const sourceMatch = byKey.get(row.sourceRecordKey);
    const identity = `${row.schoolName.trim().toLowerCase()}\u0000${(row.county ?? '').trim().toLowerCase()}`;
    const identityMatches = (byIdentity.get(identity) ?? []).filter(match => !usedIds.has(match.id));
    const match = sourceMatch ?? (identityMatches.length === 1 ? identityMatches[0] : null);
    if (!match) {
      inserts.push(row);
    } else if (match.source_record_key === row.sourceRecordKey && match.source_row_sha256 === row.sourceRowSha256) {
      unchanged.push(row);
      usedIds.add(match.id);
    } else {
      updates.push({ id: match.id, row });
      usedIds.add(match.id);
    }
  }
  return { updates, inserts, unchanged };
}

const catalogColumns = ['source_record_key', 'source_workbook_sha256', 'source_row_number', 'source_row_sha256', 'catalog_level', 'county', 'sub_county', 'catalog_school_type', 'day_boarding', 'gender', 'sponsor', 'school_code', 'latitude', 'longitude', 'data_source'];
function catalogValues(row) {
  return [row.sourceRecordKey, row.sourceWorkbookSha256, row.sourceRowNumber, row.sourceRowSha256, row.level, row.county, row.subCounty, row.schoolType, row.dayBoarding, row.gender, row.sponsor, row.schoolCode, row.latitude, row.longitude, row.dataSource];
}

async function updateBatch(client, updates) {
  if (!updates.length) return;
  const columns = ['id', ...catalogColumns];
  const values = updates.flatMap(item => [item.id, ...catalogValues(item.row)]);
  const placeholders = updates.map((_, rowIndex) => `(${columns.map((_, columnIndex) => `$${rowIndex * columns.length + columnIndex + 1}`).join(',')})`).join(',');
  await client.query(
    `UPDATE schools AS s SET ${catalogColumns.map(column => `${column} = v.${column}${column === 'source_row_number' ? '::integer' : column === 'latitude' || column === 'longitude' ? '::numeric' : ''}`).join(', ')}
       FROM (VALUES ${placeholders}) AS v(${columns.join(',')})
      WHERE s.id = v.id::uuid`,
    values,
  );
}

async function insertBatch(client, rows, defaults) {
  if (!rows.length) return;
  const columns = ['name', 'slug', 'location', 'status', 'school_type', 'available_grades', 'available_plan_codes', 'plan_prices_ksh_cents', 'subscription_price_ksh_cents', 'assigned_plan_id', 'lead_status', ...catalogColumns];
  const values = rows.flatMap(row => [row.schoolName, slugFor(row), row.county ?? 'Kenya', 'active', schoolTypeFromCatalog(row.dayBoarding), [], defaults.availablePlanCodes, JSON.stringify(defaults.prices), defaults.prices.monthly, defaults.assignedPlanId, 'prospect', ...catalogValues(row)]);
  const placeholders = rows.map((_, rowIndex) => `(${columns.map((_, columnIndex) => `$${rowIndex * columns.length + columnIndex + 1}`).join(',')})`).join(',');
  await client.query(
    `INSERT INTO schools (${columns.join(',')}) VALUES ${placeholders}
     ON CONFLICT (source_record_key) WHERE source_record_key IS NOT NULL DO UPDATE SET ${catalogColumns.map(column => `${column} = EXCLUDED.${column}`).join(', ')}`,
    values,
  );
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = { dryRun: false, sourcePath: defaultSourcePath, manifestPath: defaultManifestPath, batchSize: 500 };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--dry-run') options.dryRun = true;
    else if (value === '--source') options.sourcePath = path.resolve(argv[++index]);
    else if (value === '--manifest') options.manifestPath = path.resolve(argv[++index]);
    else if (value === '--batch-size') options.batchSize = Number(argv[++index]);
    else throw new Error(`Unknown option: ${value}`);
  }
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 2000) throw new Error('--batch-size must be an integer from 1 to 2000.');
  return options;
}

export async function runImport({ sourcePath = defaultSourcePath, manifestPath = defaultManifestPath, batchSize = 500, dryRun = false, client }) {
  const manifest = await loadManifest(manifestPath);
  const pool = client ? null : new Pool({ connectionString: process.env.KITABU_DATABASE_URL });
  const dbClient = client ?? await pool.connect();
  const totals = { inserts: 0, updates: 0, unchanged: 0, rows: 0, writes: 0, dryRun };
  let inTransaction = false;
  try {
    const defaults = await loadDefaultPlans(dbClient);
    if (!dryRun) { await dbClient.query('BEGIN'); inTransaction = true; }
    let batch = [];
    const flush = async () => {
      if (!batch.length) return;
      const resolved = await resolveBatch(dbClient, batch);
      totals.inserts += resolved.inserts.length;
      totals.updates += resolved.updates.length;
      totals.unchanged += resolved.unchanged.length;
      totals.rows += batch.length;
      totals.writes += resolved.inserts.length + resolved.updates.length;
      if (!dryRun) { await updateBatch(dbClient, resolved.updates); await insertBatch(dbClient, resolved.inserts, defaults); }
      batch = [];
    };
    for await (const row of readRows(sourcePath, manifest)) {
      batch.push(row);
      if (batch.length >= batchSize) await flush();
    }
    await flush();
    if (totals.rows !== manifest.acceptedRows) throw new Error(`Expected ${manifest.acceptedRows} accepted rows, read ${totals.rows}.`);
    if (inTransaction) await dbClient.query('COMMIT');
    return totals;
  } catch (error) {
    if (inTransaction) await dbClient.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    if (pool) { dbClient.release(); await pool.end(); }
  }
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  if (!process.env.KITABU_DATABASE_URL) throw new Error('KITABU_DATABASE_URL is required.');
  const result = await runImport(parseArgs());
  console.log(`SCHOOL_CATALOG_IMPORT_${result.dryRun ? 'PLAN' : 'RESULT'}:${JSON.stringify(result)}`);
}
