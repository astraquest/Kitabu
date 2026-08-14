import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./apply-migrations.mjs', import.meta.url), 'utf8');

test('scoped migrations select exactly one named file and fail closed for invalid flags', () => {
  assert.match(source, /const selectedSqlFiles = onlyMigration \? sqlFiles\.filter\(file => file === onlyMigration\) : sqlFiles/);
  assert.match(source, /onlyArguments\.length > 1/);
  assert.match(source, /--only requires one migration filename/);
  assert.match(source, /if \(onlyMigration && selectedSqlFiles\.length !== 1\)/);
  assert.equal((source.match(/for \(const file of selectedSqlFiles\)/g) ?? []).length, 2);
  assert.doesNotMatch(source, /for \(const file of sqlFiles\)/);
});
