import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import test from 'node:test';
import { operationDefinitions } from '../deployment/run-data-operations.mjs';

const apiDir = path.resolve(import.meta.dirname, '..', '..');

test('forward migration defines a separate provenance-preserving directory table', async () => {
  const migration = await readFile(path.join(apiDir, 'sql', '095_school_directory.sql'), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS school_directory_records/i);
  assert.match(migration, /source_record_key TEXT NOT NULL UNIQUE/i);
  assert.match(migration, /source_workbook_sha256 TEXT NOT NULL/i);
  assert.match(migration, /source_row_sha256 TEXT NOT NULL/i);
  assert.match(migration, /latitude NUMERIC\(8,6\).*CHECK \(latitude BETWEEN -5 AND 5\.5\)/s);
  assert.match(migration, /longitude NUMERIC\(9,6\).*CHECK \(longitude BETWEEN 33\.5 AND 42\.5\)/s);
  assert.doesNotMatch(migration, /DROP\s+TABLE|TRUNCATE/i);
});

test('data-operation planner includes the school directory with auditable inputs and preview/apply phases', () => {
  const operation = operationDefinitions().find(item => item.key === 'school-directory-import');
  assert.ok(operation);
  assert.deepEqual(operation.inputs, [
    'data/school-directory/kenya-schools-master.ndjson.gz',
    'data/school-directory/manifest.json',
    'scripts/schools/import-school-directory.mjs',
  ]);
  assert.deepEqual(operation.preview, [['scripts/schools/import-school-directory.mjs', '--dry-run']]);
  assert.deepEqual(operation.apply, [['scripts/schools/import-school-directory.mjs']]);
});

test('tracked source artifact matches its manifest fingerprint and row count', async () => {
  const artifactPath = path.join(apiDir, 'data', 'school-directory', 'kenya-schools-master.ndjson.gz');
  const manifest = JSON.parse(await readFile(path.join(apiDir, 'data', 'school-directory', 'manifest.json'), 'utf8'));
  const artifact = await readFile(artifactPath);
  assert.equal(artifact.length, manifest.artifactBytes);
  assert.equal(createHash('sha256').update(artifact).digest('hex'), manifest.artifactSha256);
  const uncompressed = gunzipSync(artifact);
  assert.equal(createHash('sha256').update(uncompressed).digest('hex'), manifest.artifactUncompressedSha256);
  assert.equal(uncompressed.toString('utf8').trimEnd().split('\n').length, manifest.acceptedRows);
  assert.equal(manifest.sourceRows, manifest.acceptedRows + manifest.rejectedRows);
});
