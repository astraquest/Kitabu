import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type ComponentSnapshot,
  type ComponentSnapshotMigration,
  type SnapshotBinding,
  canRestoreSnapshot,
  restoreSnapshot,
  validateSnapshot,
} from '../../src/interactive-learning/snapshot.ts';

interface CounterState {
  count: number;
  label?: string;
}

const snapshot = (overrides: Partial<ComponentSnapshot<CounterState>> = {}): ComponentSnapshot<CounterState> => ({
  snapshotSchemaVersion: '1.0.1',
  attemptId: 'attempt-1',
  bundleId: 'grade-6-math',
  bundleRevision: 'release-001',
  sceneId: 'fractions-1',
  sceneRevision: 'scene-001',
  componentId: 'structured-response',
  componentVersion: '1.0.0',
  stateVersion: '1.0.0',
  sequence: 4,
  state: { count: 2 },
  savedAt: '2026-07-26T16:00:00.000Z',
  ...overrides,
});

const target = (overrides: Partial<SnapshotBinding> = {}): SnapshotBinding => ({
  attemptId: 'attempt-1',
  bundleId: 'grade-6-math',
  bundleRevision: 'release-001',
  sceneId: 'fractions-1',
  sceneRevision: 'scene-001',
  componentId: 'structured-response',
  componentVersion: '1.0.0',
  stateVersion: '1.0.0',
  ...overrides,
});

test('validates a complete snapshot and rejects malformed snapshots', () => {
  assert.equal(validateSnapshot(snapshot()).ok, true);

  const result = validateSnapshot({
    ...snapshot(),
    snapshotSchemaVersion: '2.0.0',
    attemptId: ' ',
    sequence: -1,
    savedAt: 'not-a-date',
    unexpected: true,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(
      result.issues.map((issue) => issue.path),
      ['snapshotSchemaVersion', 'attemptId', 'sequence', 'savedAt', 'unexpected'],
    );
  }
});

test('rejects non-semver versions and state that cannot be serialized as JSON', () => {
  const result = validateSnapshot({
    ...snapshot(),
    componentVersion: 'latest',
    state: { count: Number.NaN },
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(result.issues.map((issue) => issue.path), ['componentVersion', 'state']);
  }
});

test('restores state only when all identities and versions match exactly', () => {
  const result = restoreSnapshot<CounterState>(snapshot(), target());

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.state, { count: 2 });
    assert.equal(result.migrated, false);
  }
});

for (const [field, replacement] of [
  ['attemptId', 'attempt-2'],
  ['bundleId', 'different-bundle'],
  ['bundleRevision', 'release-002'],
  ['sceneId', 'different-scene'],
  ['sceneRevision', 'scene-002'],
  ['componentId', 'different-component'],
] as const) {
  test(`rejects a ${field} identity mismatch`, () => {
    const result = canRestoreSnapshot(snapshot(), target({ [field]: replacement }));

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, 'BINDING_MISMATCH');
      assert.equal(result.issues?.[0]?.path, field);
    }
  });
}

test('requires a migration when the component or state version differs', () => {
  const result = canRestoreSnapshot(
    snapshot(),
    target({ componentVersion: '2.0.0', stateVersion: '2.0.0' }),
  );

  assert.deepEqual(result, {
    ok: false,
    code: 'MIGRATION_REQUIRED',
    message: 'Component and state versions must match exactly unless a direct migration is supplied.',
  });
});

const directMigration: ComponentSnapshotMigration<CounterState, CounterState> = {
  componentId: 'structured-response',
  fromComponentVersion: '1.0.0',
  fromStateVersion: '1.0.0',
  toComponentVersion: '2.0.0',
  toStateVersion: '2.0.0',
  migrate: (state) => ({ count: state.count, label: 'migrated' }),
};

test('applies one direct component-owned migration', () => {
  const result = restoreSnapshot<CounterState>(
    snapshot(),
    target({ componentVersion: '2.0.0', stateVersion: '2.0.0' }),
    [directMigration],
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.migrated, true);
    assert.deepEqual(result.state, { count: 2, label: 'migrated' });
    assert.equal(result.snapshot.componentVersion, '2.0.0');
    assert.equal(result.snapshot.stateVersion, '2.0.0');
  }
});

test('rejects a supplied migration table when no direct entry matches', () => {
  const result = restoreSnapshot(
    snapshot(),
    target({ componentVersion: '3.0.0', stateVersion: '3.0.0' }),
    [directMigration],
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'MIGRATION_NOT_FOUND');
});

test('reports a component migration failure without restoring partial state', () => {
  const failed: ComponentSnapshotMigration = {
    ...directMigration,
    migrate: () => {
      throw new Error('invalid old state');
    },
  };

  const result = restoreSnapshot(
    snapshot(),
    target({ componentVersion: '2.0.0', stateVersion: '2.0.0' }),
    [failed],
  );

  assert.deepEqual(result, {
    ok: false,
    code: 'MIGRATION_FAILED',
    message: 'invalid old state',
  });
});

test('does not chain migrations through intermediate versions', () => {
  const first: ComponentSnapshotMigration = directMigration;
  const second: ComponentSnapshotMigration = {
    componentId: 'structured-response',
    fromComponentVersion: '2.0.0',
    fromStateVersion: '2.0.0',
    toComponentVersion: '3.0.0',
    toStateVersion: '3.0.0',
    migrate: (state) => state,
  };

  const result = restoreSnapshot(
    snapshot(),
    target({ componentVersion: '3.0.0', stateVersion: '3.0.0' }),
    [first, second],
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'MIGRATION_NOT_FOUND');
});
