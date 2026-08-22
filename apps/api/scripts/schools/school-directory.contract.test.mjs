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

test('data-operation planner imports the catalog directly into schools with auditable inputs and preview/apply phases', () => {
  const operation = operationDefinitions().find(item => item.key === 'school-catalog-import');
  assert.ok(operation);
  assert.deepEqual(operation.inputs, [
    'data/school-directory/kenya-schools-master.ndjson.gz',
    'data/school-directory/manifest.json',
    'scripts/schools/import-school-catalog.mjs',
  ]);
  assert.deepEqual(operation.preview, [['scripts/schools/import-school-catalog.mjs', '--dry-run']]);
  assert.deepEqual(operation.apply, [['scripts/schools/import-school-catalog.mjs']]);
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

test('catalog search is served from schools and preserves source identity', async () => {
  const server = await readFile(path.join(apiDir, 'src', 'server.ts'), 'utf8');
  const repositories = await readFile(path.join(apiDir, 'src', 'repositories.ts'), 'utf8');
  const importer = await readFile(path.join(apiDir, 'scripts', 'schools', 'import-school-catalog.mjs'), 'utf8');
  assert.match(server, /app\.get\('\/public\/schools'/);
  assert.match(server, /app\.post\('\/public\/schools\/:schoolId\/selection'/);
  assert.match(server, /app\.get\('\/admin\/schools'/);
  assert.match(server, /limit: z\.coerce\.number\(\)\.int\(\)\.min\(1\)\.max\(50\)/);
  assert.match(repositories, /sourceRecordKey: row\.source_record_key/);
  assert.match(repositories, /FROM schools s/);
  assert.match(repositories, /selection_count/);
  assert.match(importer, /FROM subscription_plans/);
  assert.match(importer, /availablePlanCodes/);
  assert.match(importer, /lead_status/);
  assert.match(importer, /ON CONFLICT \(source_record_key\) WHERE source_record_key IS NOT NULL/);
  assert.match(importer, /WHERE s\.id = v\.id::uuid/);
  assert.match(importer, /source_row_number.*::integer/);
  assert.match(importer, /latitude.*::numeric/);
  assert.match(repositories, /WHEN lower\(btrim\(s\.name\)\) = lower\(\$2\) THEN 0/);
  assert.match(repositories, /ORDER BY relevance_tier,[\s\S]*LEAST\(s\.selection_count, 1000\).*LEAST\(COALESCE\(a\.active_enrollment, 0\), 1000\)/);
  assert.match(server, /hasNext: params\.offset \+ schools\.length < total/);
  assert.doesNotMatch(repositories, /FROM school_directory_records/);
  assert.match(repositories, /listSchools\(\{ includeProspects: true, schoolId, limit: 1 \}\)/);
  assert.match(server, /app\.get\('\/schools'/);
});

test('stage A keeps the rollback table and adds the canonical catalog fields', async () => {
  const stageA = await readFile(path.join(apiDir, 'sql', '104_schools_catalog.sql'), 'utf8');
  assert.doesNotMatch(stageA, /DROP\s+TABLE/i);
  assert.match(stageA, /source_record_key TEXT/);
  assert.match(stageA, /selection_count BIGINT/);
});
