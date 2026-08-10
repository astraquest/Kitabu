import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReadinessReport,
  inspectPendingMigrations,
  listMigrationFiles,
} from './check-educational-assets-readiness.mjs';

test('migration files are numerically ordered and pending destructive patterns are reported', () => {
  assert.deepEqual(listMigrationFiles(['100_later.sql', '075_assets.sql', 'note.txt', '076_seed.sql']), [
    '075_assets.sql', '076_seed.sql', '100_later.sql',
  ]);
  const pending = inspectPendingMigrations(
    ['075_assets.sql', '076_seed.sql', '077_safe.sql'],
    ['075_assets.sql'],
    filename => filename === '076_seed.sql' ? 'DELETE FROM users;' : 'CREATE TABLE example (id uuid);',
  );
  assert.deepEqual(pending, [
    { filename: '076_seed.sql', destructiveBlockers: ['DELETE without a WHERE clause', 'DELETE FROM users'] },
    { filename: '077_safe.sql', destructiveBlockers: [] },
  ]);
});

test('readiness report is actionable for missing schema and destructive pending migrations', () => {
  const report = buildReadinessReport({
    databaseReachable: true,
    schemaMigrationsPresent: true,
    appliedFilenames: ['074_previous.sql'],
    pendingMigrations: [{ filename: '075_assets.sql', destructiveBlockers: ['TRUNCATE'] }],
    tables: { educational_assets: true, curriculum_units: false },
    storageRoot: './var/educational-assets',
    storageRootConfigured: false,
  });
  assert.equal(report.status, 'blocked');
  assert.deepEqual(report.migrations.destructivePending, ['075_assets.sql']);
  assert.match(report.blockers.join(' '), /curriculum_units/);
  assert.match(report.blockers.join(' '), /destructive safety patterns/);
  assert.equal(report.storage.root, './var/educational-assets');
});

test('database-unreachable report avoids connection details', () => {
  const report = buildReadinessReport({
    databaseReachable: false,
    schemaMigrationsPresent: false,
    appliedFilenames: [],
    pendingMigrations: [],
    tables: {},
    storageRoot: './var/educational-assets',
    storageRootConfigured: false,
    databaseErrorCode: 'ECONNREFUSED',
  });
  assert.equal(report.status, 'blocked');
  assert.equal(report.database.errorCode, 'ECONNREFUSED');
  assert.equal(JSON.stringify(report).includes('postgres://'), false);
});
