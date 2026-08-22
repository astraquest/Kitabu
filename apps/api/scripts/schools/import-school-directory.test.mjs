import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { classifyExisting, runImport, sourceRowFingerprint, validateRow } from './import-school-directory.mjs';

const manifestBase = { schema: 1, sourceWorkbookSha256: 'a'.repeat(64), acceptedRows: 1 };

function fixtureRow() {
  const row = {
    sourceRecordKey: 'knec:123456', sourceWorkbookSha256: manifestBase.sourceWorkbookSha256,
    schoolName: 'Example Primary', level: 'Primary', county: 'Kisii', subCounty: null,
    schoolType: 'Public', dayBoarding: null, gender: 'Mixed', sponsor: null, schoolCode: '123456',
    latitude: -0.68, longitude: 34.77, dataSource: 'Test source', sourceRowNumber: 2,
  };
  return { ...row, sourceRowSha256: sourceRowFingerprint(row) };
}

test('validates mappings and rejects invalid identifiers and coordinates', () => {
  const row = fixtureRow();
  assert.deepEqual(validateRow(row, manifestBase), row);
  assert.throws(() => validateRow({ ...row, schoolCode: 'not-a-code' }, manifestBase), /Invalid school code/);
  assert.throws(() => validateRow({ ...row, longitude: 0 }, manifestBase), /Invalid longitude/);
});

test('classifies inserts, changed records, and exact rerun no-ops', () => {
  const row = fixtureRow();
  const changed = { ...row, sourceRowSha256: 'b'.repeat(64) };
  assert.deepEqual(classifyExisting([row, changed], new Map([
    [row.sourceRecordKey, { source_row_sha256: row.sourceRowSha256 }],
  ])), { inserts: 0, updates: 1, unchanged: 1 });
  assert.deepEqual(classifyExisting([row], new Map()), { inserts: 1, updates: 0, unchanged: 0 });
});

test('first apply writes accepted rows and exact rerun performs zero writes', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'kitabu-school-directory-'));
  const row = fixtureRow();
  const content = `${JSON.stringify(row)}\n`;
  const compressed = gzipSync(Buffer.from(content), { level: 9, mtime: 0 });
  const sourcePath = path.join(directory, 'schools.ndjson.gz');
  const manifestPath = path.join(directory, 'manifest.json');
  await writeFile(sourcePath, compressed);
  await writeFile(manifestPath, JSON.stringify({ ...manifestBase, artifactSha256: createHash('sha256').update(compressed).digest('hex'), artifactBytes: compressed.length }));
  const calls = [];
  const existing = new Map();
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql.startsWith('SELECT')) return { rows: [...existing.entries()].map(([source_record_key, source_row_sha256]) => ({ source_record_key, source_row_sha256 })) };
      if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
      if (sql.startsWith('INSERT')) { existing.set(row.sourceRecordKey, row.sourceRowSha256); return { rows: [{ inserted: true }] }; }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  assert.deepEqual(await runImport({ sourcePath, manifestPath, client }), { inserts: 1, updates: 0, unchanged: 0, rows: 1, writes: 1, dryRun: false });
  const insertCount = calls.filter(sql => sql.startsWith('INSERT')).length;
  assert.deepEqual(await runImport({ sourcePath, manifestPath, client }), { inserts: 0, updates: 0, unchanged: 1, rows: 1, writes: 0, dryRun: false });
  assert.equal(calls.filter(sql => sql.startsWith('INSERT')).length, insertCount);
});
