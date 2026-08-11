import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../sql/077_dual_provider_tts.sql', import.meta.url), 'utf8');
const dropIndex = migration.indexOf('DROP CONSTRAINT IF EXISTS tts_artifacts_ready_storage_check');
const addIndex = migration.indexOf('ADD CONSTRAINT tts_artifacts_ready_storage_check CHECK');

assert.ok(dropIndex >= 0, 'migration 077 must safely replace a previously installed ready-storage constraint');
assert.ok(addIndex > dropIndex, 'migration 077 must validate the replacement constraint after dropping it');

console.log(JSON.stringify({ status: 'ok', migration: '077_dual_provider_tts.sql' }));
