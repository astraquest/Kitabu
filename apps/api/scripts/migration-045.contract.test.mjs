import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../sql/045_remove_production_demo_data.sql', import.meta.url), 'utf8');
const supportedAccounts = [
  'demoaccount@kitabu.ai',
  'admin@kitabu.ai',
];
const retiredAccounts = [
  'student@kitabu.ai',
  'parent@kitabu.ai',
  'teacher@kitabu.ai',
];
const allowlistClauses = [...migration.matchAll(/WHERE\s+lower\(email\)\s+NOT\s+IN\s*\(([^)]*)\)/gi)];

assert.equal(allowlistClauses.length, 2, 'migration 045 must use the supported-account allowlist for cleanup and final validation');
for (const clause of allowlistClauses) {
  const accounts = [...clause[1].matchAll(/'([^']+@kitabu\.ai)'/gi)].map(match => match[1].toLowerCase());
  assert.deepEqual(accounts, supportedAccounts, 'each allowlist must contain exactly the supported operational test accounts');
}
for (const email of retiredAccounts) {
  assert.doesNotMatch(migration, new RegExp(email, 'i'), `${email} must not appear in migration 045`);
}

assert.match(migration, /CREATE TEMP TABLE cleanup_users_outside_supported_test_accounts ON COMMIT DROP AS/i);
assert.match(migration, /CREATE TEMP TABLE cleanup_demonstration_schools ON COMMIT DROP AS/i);
assert.match(migration, /IF remaining_users <> 2 THEN/i);
assert.match(migration, /expected exactly 2 supported operational test accounts/i);
assert.match(migration, /left a user outside the supported operational test accounts/i);
assert.match(migration, /DELETE FROM users\s+WHERE id IN \(SELECT id FROM cleanup_users_outside_supported_test_accounts\);/i);
assert.match(migration, /DELETE FROM schools\s+WHERE id IN \(SELECT id FROM cleanup_demonstration_schools\);/i);
assert.match(migration, /DO \$\$/i);
assert.match(migration, /Demo cleanup left a demonstration school behind/i);
assert.doesNotMatch(migration, /INSERT\s+INTO\s+users/i, 'migration 045 must not create test accounts');

console.log(JSON.stringify({ status: 'ok', migration: '045_remove_production_demo_data.sql' }));
