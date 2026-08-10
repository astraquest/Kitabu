import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../sql/045_remove_production_demo_data.sql', import.meta.url), 'utf8');
const supportedAccounts = [
  'student@kitabu.ai',
  'parent@kitabu.ai',
  'teacher@kitabu.ai',
  'admin@kitabu.ai',
];
const allowlistClauses = [...migration.matchAll(/WHERE\s+lower\(email\)\s+NOT\s+IN\s*\(([^)]*)\)/gi)];

assert.equal(allowlistClauses.length, 2, 'migration 045 must use the supported-account allowlist for cleanup and final validation');
for (const clause of allowlistClauses) {
  const accounts = [...clause[1].matchAll(/'([^']+@kitabu\.ai)'/gi)].map(match => match[1].toLowerCase());
  assert.deepEqual(accounts, supportedAccounts, 'each allowlist must contain exactly the applied operational QA accounts');
}
assert.match(migration, /CREATE TEMP TABLE cleanup_removed_users ON COMMIT DROP AS/i);
assert.match(migration, /CREATE TEMP TABLE cleanup_removed_schools ON COMMIT DROP AS/i);
assert.match(migration, /IF remaining_users <> 4 THEN/i);
assert.match(migration, /expected exactly 4 retained users/i);
assert.match(migration, /left non-approved users behind/i);
assert.match(migration, /DELETE FROM users\s+WHERE id IN \(SELECT id FROM cleanup_removed_users\);/i);
assert.match(migration, /DELETE FROM schools\s+WHERE id IN \(SELECT id FROM cleanup_removed_schools\);/i);
assert.match(migration, /DO \$\$/i);
assert.match(migration, /Demo cleanup left a demonstration school behind/i);
assert.doesNotMatch(migration, /INSERT\s+INTO\s+users/i, 'migration 045 must not create test accounts');

console.log(JSON.stringify({ status: 'ok', migration: '045_remove_production_demo_data.sql' }));
