import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { runImport, sourceRowFingerprint, validateRow } from './import-school-catalog.mjs';

const manifestBase = { schema: 1, sourceWorkbookSha256: 'a'.repeat(64), acceptedRows: 1 };

function fixtureRow() {
  const row = {
    sourceRecordKey: 'knec:123456', sourceWorkbookSha256: manifestBase.sourceWorkbookSha256,
    schoolName: 'Example Primary', level: 'Primary', county: 'Kisii', subCounty: null,
    schoolType: 'Public', dayBoarding: 'Day', gender: 'Mixed', sponsor: null, schoolCode: '123456',
    latitude: -0.68, longitude: 34.77, dataSource: 'Test source', sourceRowNumber: 2,
  };
  return { ...row, sourceRowSha256: sourceRowFingerprint(row) };
}

test('validates stable source identity and catalog metadata', () => {
  const row = fixtureRow();
  assert.deepEqual(validateRow(row, manifestBase), row);
  assert.throws(() => validateRow({ ...row, sourceRecordKey: 'not-stable' }, manifestBase), /Invalid source record key/);
  assert.throws(() => validateRow({ ...row, longitude: 0 }, manifestBase), /Invalid longitude/);
});

test('first catalog import writes a prospect and exact rerun performs zero writes', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'kitabu-school-catalog-'));
  const row = fixtureRow();
  const compressed = gzipSync(Buffer.from(`${JSON.stringify(row)}\n`), { level: 9, mtime: 0 });
  const sourcePath = path.join(directory, 'schools.ndjson.gz');
  const manifestPath = path.join(directory, 'manifest.json');
  await writeFile(sourcePath, compressed);
  await writeFile(manifestPath, JSON.stringify({ ...manifestBase, artifactSha256: createHash('sha256').update(compressed).digest('hex'), artifactBytes: compressed.length }));
  const existing = new Map();
  const writes = [];
  const client = {
    async query(sql) {
      if (sql.includes('FROM subscription_plans')) return { rows: [
        { id: 'weekly-id', code: 'weekly', price_ksh_cents: '100' },
        { id: 'monthly-id', code: 'monthly', price_ksh_cents: '200' },
        { id: 'annual-id', code: 'annual', price_ksh_cents: '300' },
      ] };
      if (sql.includes('FROM schools')) return { rows: [...existing.values()] };
      if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
      if (sql.startsWith('INSERT INTO schools')) {
        writes.push(sql);
        existing.set(row.sourceRecordKey, { id: 'school-id', source_record_key: row.sourceRecordKey, source_row_sha256: row.sourceRowSha256, name: row.schoolName, location: row.county });
        return { rows: [] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  assert.equal((await runImport({ sourcePath, manifestPath, client })).writes, 1);
  assert.equal((await runImport({ sourcePath, manifestPath, client })).writes, 0);
  assert.equal(writes.length, 1);
});

test('duplicate name and county rows retain separate source identities across batches', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'kitabu-school-catalog-duplicates-'));
  const first = fixtureRow();
  const secondBase = { ...first, sourceRecordKey: 'knec:123457', sourceRowNumber: 3 };
  const second = { ...secondBase, sourceRowSha256: sourceRowFingerprint(secondBase) };
  const rows = [first, second];
  const compressed = gzipSync(Buffer.from(`${rows.map(row => JSON.stringify(row)).join('\n')}\n`), { level: 9, mtime: 0 });
  const sourcePath = path.join(directory, 'schools.ndjson.gz');
  const manifestPath = path.join(directory, 'manifest.json');
  await writeFile(sourcePath, compressed);
  await writeFile(manifestPath, JSON.stringify({ ...manifestBase, acceptedRows: 2, artifactSha256: createHash('sha256').update(compressed).digest('hex'), artifactBytes: compressed.length }));
  const existing = new Map();
  let insertIndex = 0;
  const client = {
    async query(sql) {
      if (sql.includes('FROM subscription_plans')) return { rows: [
        { id: 'weekly-id', code: 'weekly', price_ksh_cents: '100' },
        { id: 'monthly-id', code: 'monthly', price_ksh_cents: '200' },
        { id: 'annual-id', code: 'annual', price_ksh_cents: '300' },
      ] };
      if (sql.includes('FROM schools')) return { rows: [...existing.values()] };
      if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
      if (sql.startsWith('INSERT INTO schools')) {
        const row = rows[insertIndex++];
        existing.set(row.sourceRecordKey, { id: `school-${insertIndex}`, source_record_key: row.sourceRecordKey, source_row_sha256: row.sourceRowSha256, name: row.schoolName, location: row.county });
        return { rows: [] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const result = await runImport({ sourcePath, manifestPath, batchSize: 1, client });
  assert.equal(result.inserts, 2);
  assert.equal(result.updates, 0);
  assert.equal(existing.size, 2);
});
