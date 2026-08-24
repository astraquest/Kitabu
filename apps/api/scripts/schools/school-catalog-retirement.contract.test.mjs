import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const apiDir = path.resolve(import.meta.dirname, '..', '..');
const repoDir = path.resolve(apiDir, '..', '..');

test('stage B is fail-closed until all catalog identities are verified in schools', async () => {
  const migration = await readFile(path.join(apiDir, 'sql', '105_school_catalog_retirement.sql'), 'utf8');
  assert.match(migration, /expected_count CONSTANT BIGINT := 37379/);
  assert.match(migration, /source_record_key/);
  assert.match(migration, /DROP TABLE school_directory_records/);
  assert.match(migration, /RAISE EXCEPTION/);
  assert.match(migration, /catalog_count = 0 AND school_count = 0/);

  const deployWorkflow = await readFile(path.join(repoDir, '.github', 'workflows', 'deploy-api.yml'), 'utf8');
  assert.match(
    deployWorkflow,
    /KITABU_ALLOW_DESTRUCTIVE_MIGRATIONS=true\s+\\\s+docker compose run --rm -T api node scripts\/apply-migrations\.mjs/,
  );
});
