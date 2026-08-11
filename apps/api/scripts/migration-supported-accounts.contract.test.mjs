import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const supportedAccounts = [
  'demoaccount@kitabu.ai',
  'admin@kitabu.ai',
];
const historicalMigrationSql = new Set([
  '001_init.sql',
  '009_normalize_test_users.sql',
  '014_parent_dashboard.sql',
  '015_phone_google_auth.sql',
  '023_expand_supported_grades.sql',
  '038_seed_school_county_distribution.sql',
  '045_remove_production_demo_data.sql',
  '071_consolidate_demo_account.sql',
]);
const archivalOnlyFixtures = new Set([
  'migration-045.contract.test.mjs',
  'migration-071.integration.mjs',
]);
const accountPattern = /['"]([a-z0-9._%+-]+@kitabu\.ai)['"]/gi;

function kitabuAccounts(source) {
  return [...source.matchAll(accountPattern)].map(match => match[1].toLowerCase());
}

function assertSupportedOnly(file, accounts) {
  const unsupported = [...new Set(accounts.filter(account => !supportedAccounts.includes(account)))];
  assert.deepEqual(
    unsupported,
    [],
    `${file} is current migration policy and must not reference unsupported Kitabu accounts`,
  );

  if (accounts.length > 0) {
    assert.deepEqual(
      [...new Set(accounts)].sort(),
      [...supportedAccounts].sort(),
      `${file} must use exactly the supported operational test accounts when it names Kitabu accounts`,
    );
  }
}

const sqlDirectory = new URL('../sql/', import.meta.url);
const scriptsDirectory = new URL('./', import.meta.url);
const sqlFiles = await readdir(sqlDirectory);
const scriptFiles = await readdir(scriptsDirectory);

for (const file of sqlFiles.filter(file => file.endsWith('.sql'))) {
  if (historicalMigrationSql.has(file)) {
    continue; // Archival-only applied migration retained as historical consolidation evidence.
  }

  assertSupportedOnly(`sql/${file}`, kitabuAccounts(await readFile(new URL(`../sql/${file}`, import.meta.url), 'utf8')));
}

for (const file of scriptFiles.filter(file => /^migration-.*\.(?:contract(?:\.test)?|integration)\.mjs$/i.test(file))) {
  if (archivalOnlyFixtures.has(file)) {
    continue; // Archival-only fixture; migration 071 verifies historical consolidation behavior.
  }

  assertSupportedOnly(`scripts/${file}`, kitabuAccounts(await readFile(new URL(file, import.meta.url), 'utf8')));
}

console.log(JSON.stringify({
  status: 'ok',
  supportedAccounts,
  archivalOnly: {
    sql: [...historicalMigrationSql],
    fixtures: [...archivalOnlyFixtures],
  },
}));
