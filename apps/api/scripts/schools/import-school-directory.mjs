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

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
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

function normalizeNullable(value) {
  return typeof value === 'string' && value.trim() === '' ? null : value ?? null;
}

export function validateRow(row, manifest) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Every source line must be a JSON object.');
  for (const field of textFields) {
    if (field !== 'county' && field !== 'subCounty' && field !== 'schoolType' && field !== 'dayBoarding' && field !== 'gender' && field !== 'sponsor' && typeof row[field] !== 'string') throw new Error(`Missing or invalid ${field}.`);
  }
  const normalized = Object.fromEntries(textFields.map(field => [field, normalizeNullable(row[field])]));
  if (!normalized.schoolName || !normalized.level || !normalized.schoolCode || !normalized.dataSource) throw new Error('Required school directory field is blank.');
  if (!/^\d{1,9}$/.test(normalized.schoolCode)) throw new Error(`Invalid school code: ${normalized.schoolCode}`);
  if (!/^(?:knec:\d{1,9}|source:[0-9a-f]{64})$/.test(row.sourceRecordKey ?? '')) throw new Error(`Invalid source record key: ${row.sourceRecordKey}`);
  if (row.sourceWorkbookSha256 !== manifest.sourceWorkbookSha256) throw new Error(`Workbook fingerprint mismatch at row ${row.sourceRowNumber}.`);
  if (!Number.isInteger(row.sourceRowNumber) || row.sourceRowNumber < 2) throw new Error(`Invalid source row number: ${row.sourceRowNumber}`);
  if (!Number.isFinite(row.latitude) || row.latitude < -5 || row.latitude > 5.5) throw new Error(`Invalid latitude at row ${row.sourceRowNumber}.`);
  if (!Number.isFinite(row.longitude) || row.longitude < 33.5 || row.longitude > 42.5) throw new Error(`Invalid longitude at row ${row.sourceRowNumber}.`);
  if (sourceRowFingerprint({ ...normalized, sourceRowNumber: row.sourceRowNumber, latitude: row.latitude, longitude: row.longitude }) !== row.sourceRowSha256) throw new Error(`Source row fingerprint mismatch at row ${row.sourceRowNumber}.`);
  return { ...normalized, sourceRecordKey: row.sourceRecordKey, sourceWorkbookSha256: row.sourceWorkbookSha256, sourceRowNumber: row.sourceRowNumber, sourceRowSha256: row.sourceRowSha256, latitude: row.latitude, longitude: row.longitude };
}

export function sourceRowFingerprint(row) {
  const normalized = Object.fromEntries(textFields.map(field => [field, normalizeNullable(row[field])]));
  return sha256(canonicalJson({ ...normalized, sourceRowNumber: row.sourceRowNumber, latitude: row.latitude, longitude: row.longitude }));
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

async function loadManifest(manifestPath) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.schema !== 1 || !/^[0-9a-f]{64}$/.test(manifest.sourceWorkbookSha256) || !/^[0-9a-f]{64}$/.test(manifest.artifactSha256) || !Number.isInteger(manifest.artifactBytes) || manifest.artifactBytes < 1) throw new Error('Invalid school directory manifest.');
  return manifest;
}

async function* readRows(sourcePath, manifest) {
  const digest = createHash('sha256');
  let compressedBytes = 0;
  const compressedInput = createReadStream(sourcePath);
  compressedInput.on('data', chunk => { digest.update(chunk); compressedBytes += chunk.length; });
  const input = compressedInput.pipe(createGunzip());
  const reader = readline.createInterface({ input, crlfDelay: Infinity });
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
  if (digest.digest('hex') !== manifest.artifactSha256) throw new Error('School directory artifact fingerprint mismatch.');
  if (compressedBytes !== manifest.artifactBytes) throw new Error(`Manifest artifactBytes=${manifest.artifactBytes}, artifact bytes=${compressedBytes}.`);
  if (accepted !== manifest.acceptedRows) throw new Error(`Manifest acceptedRows=${manifest.acceptedRows}, artifact rows=${accepted}.`);
}

async function existingRows(client, keys) {
  const result = await client.query('SELECT source_record_key, source_row_sha256 FROM school_directory_records WHERE source_record_key = ANY($1::text[])', [keys]);
  return new Map(result.rows.map(row => [row.source_record_key, row]));
}

const insertColumns = ['source_record_key', 'school_name', 'level', 'county', 'sub_county', 'school_type', 'day_boarding', 'gender', 'sponsor', 'school_code', 'latitude', 'longitude', 'data_source', 'source_workbook_sha256', 'source_row_number', 'source_row_sha256'];
const rowValues = row => [row.sourceRecordKey, row.schoolName, row.level, row.county, row.subCounty, row.schoolType, row.dayBoarding, row.gender, row.sponsor, row.schoolCode, row.latitude, row.longitude, row.dataSource, row.sourceWorkbookSha256, row.sourceRowNumber, row.sourceRowSha256];

async function upsertBatch(client, rows) {
  if (!rows.length) return { inserts: 0, updates: 0 };
  const values = rows.flatMap(rowValues);
  const placeholders = rows.map((_, rowIndex) => `(${insertColumns.map((_, columnIndex) => `$${rowIndex * insertColumns.length + columnIndex + 1}`).join(',')})`).join(',');
  const result = await client.query(
    `INSERT INTO school_directory_records (${insertColumns.join(',')}) VALUES ${placeholders}
     ON CONFLICT (source_record_key) DO UPDATE SET
       school_name = EXCLUDED.school_name, level = EXCLUDED.level, county = EXCLUDED.county,
       sub_county = EXCLUDED.sub_county, school_type = EXCLUDED.school_type, day_boarding = EXCLUDED.day_boarding,
       gender = EXCLUDED.gender, sponsor = EXCLUDED.sponsor, school_code = EXCLUDED.school_code,
       latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, data_source = EXCLUDED.data_source,
       source_workbook_sha256 = EXCLUDED.source_workbook_sha256, source_row_number = EXCLUDED.source_row_number,
       source_row_sha256 = EXCLUDED.source_row_sha256, updated_at = NOW()
     WHERE school_directory_records.source_row_sha256 IS DISTINCT FROM EXCLUDED.source_row_sha256
     RETURNING (xmax = 0) AS inserted`,
    values,
  );
  return result.rows.reduce((counts, row) => { counts[row.inserted ? 'inserts' : 'updates'] += 1; return counts; }, { inserts: 0, updates: 0 });
}

export async function runImport({ sourcePath = defaultSourcePath, manifestPath = defaultManifestPath, batchSize = 500, dryRun = false, client }) {
  const manifest = await loadManifest(manifestPath);
  const pool = client ? null : new Pool({ connectionString: process.env.KITABU_DATABASE_URL });
  const dbClient = client ?? await pool.connect();
  const totals = { inserts: 0, updates: 0, unchanged: 0, rows: 0 };
  let inTransaction = false;
  try {
    if (!dryRun) { await dbClient.query('BEGIN'); inTransaction = true; }
    let batch = [];
    for await (const row of readRows(sourcePath, manifest)) {
      batch.push(row);
      if (batch.length < batchSize) continue;
      const existing = await existingRows(dbClient, batch.map(item => item.sourceRecordKey));
      const classified = classifyExisting(batch, existing);
      totals.inserts += classified.inserts; totals.updates += classified.updates; totals.unchanged += classified.unchanged; totals.rows += batch.length;
      if (!dryRun) {
        const changed = batch.filter(item => !existing.has(item.sourceRecordKey) || existing.get(item.sourceRecordKey).source_row_sha256 !== item.sourceRowSha256);
        const written = await upsertBatch(dbClient, changed);
        if (written.inserts !== classified.inserts || written.updates !== classified.updates) throw new Error('Import write count differed from the read-only plan.');
      }
      batch = [];
    }
    if (batch.length) {
      const existing = await existingRows(dbClient, batch.map(item => item.sourceRecordKey));
      const classified = classifyExisting(batch, existing);
      totals.inserts += classified.inserts; totals.updates += classified.updates; totals.unchanged += classified.unchanged; totals.rows += batch.length;
      if (!dryRun) {
        const changed = batch.filter(item => !existing.has(item.sourceRecordKey) || existing.get(item.sourceRecordKey).source_row_sha256 !== item.sourceRowSha256);
        const written = await upsertBatch(dbClient, changed);
        if (written.inserts !== classified.inserts || written.updates !== classified.updates) throw new Error('Import write count differed from the read-only plan.');
      }
    }
    if (totals.rows !== manifest.acceptedRows) throw new Error(`Expected ${manifest.acceptedRows} accepted rows, read ${totals.rows}.`);
    if (inTransaction) await dbClient.query('COMMIT');
    return { ...totals, writes: totals.inserts + totals.updates, dryRun };
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
  console.log(`SCHOOL_DIRECTORY_IMPORT_${result.dryRun ? 'PLAN' : 'RESULT'}:${JSON.stringify(result)}`);
}
