/**
 * A resumable component state. Identity and version fields are deliberately
 * duplicated here so state can never be restored into a different attempt,
 * content bundle, scene, or component by accident.
 */
export interface ComponentSnapshot<State = unknown> {
  snapshotSchemaVersion: '1.0.1';
  attemptId: string;
  bundleId: string;
  bundleRevision: string;
  sceneId: string;
  sceneRevision: string;
  componentId: string;
  componentVersion: string;
  stateVersion: string;
  sequence: number;
  state: State;
  savedAt: string;
}

export type SnapshotBinding = Omit<
  ComponentSnapshot<never>,
  'snapshotSchemaVersion' | 'sequence' | 'state' | 'savedAt'
>;

export interface SnapshotIssue {
  path: string;
  message: string;
}

export type SnapshotValidationResult<State = unknown> =
  | { ok: true; snapshot: ComponentSnapshot<State> }
  | { ok: false; issues: SnapshotIssue[] };

export type SnapshotRestoreDenialCode =
  | 'INVALID_SNAPSHOT'
  | 'BINDING_MISMATCH'
  | 'MIGRATION_REQUIRED'
  | 'MIGRATION_NOT_FOUND'
  | 'MIGRATION_FAILED';

export interface SnapshotRestoreDenial {
  ok: false;
  code: SnapshotRestoreDenialCode;
  message: string;
  issues?: SnapshotIssue[];
}

export interface SnapshotRestoreSuccess<State = unknown> {
  ok: true;
  state: State;
  snapshot: ComponentSnapshot<State>;
  migrated: boolean;
}

export type SnapshotRestoreResult<State = unknown> =
  | SnapshotRestoreSuccess<State>
  | SnapshotRestoreDenial;

/**
 * A component owns its state migrations. One entry performs one direct step;
 * restore never discovers or chains a migration path.
 */
export interface ComponentSnapshotMigration<FromState = unknown, ToState = unknown> {
  componentId: string;
  fromComponentVersion: string;
  fromStateVersion: string;
  toComponentVersion: string;
  toStateVersion: string;
  migrate(state: FromState): ToState;
}

export type ComponentSnapshotMigrationTable = readonly ComponentSnapshotMigration[];

const STRING_FIELDS = [
  'attemptId',
  'bundleId',
  'bundleRevision',
  'sceneId',
  'sceneRevision',
  'componentId',
  'componentVersion',
  'stateVersion',
  'savedAt',
] as const;
const BINDING_FIELDS = [
  'attemptId',
  'bundleId',
  'bundleRevision',
  'sceneId',
  'sceneRevision',
  'componentId',
] as const;
const ALLOWED_FIELDS: readonly string[] = [
  'snapshotSchemaVersion',
  ...STRING_FIELDS,
  'sequence',
  'state',
];
const SEMVER_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown, ancestors = new Set<object>()): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object') return false;
  if (ancestors.has(value)) return false;

  ancestors.add(value);
  const values = Array.isArray(value) ? value : Object.values(value);
  const valid = values.every((item) => isJsonValue(item, ancestors));
  ancestors.delete(value);
  return valid;
}

export function validateSnapshot<State = unknown>(input: unknown): SnapshotValidationResult<State> {
  if (!isRecord(input)) {
    return { ok: false, issues: [{ path: '$', message: 'Snapshot must be an object.' }] };
  }

  const issues: SnapshotIssue[] = [];
  if (input.snapshotSchemaVersion !== '1.0.1') {
    issues.push({ path: 'snapshotSchemaVersion', message: 'Only snapshot schema version 1.0.1 is supported.' });
  }

  for (const field of STRING_FIELDS) {
    if (typeof input[field] !== 'string' || input[field].trim().length === 0) {
      issues.push({ path: field, message: `${field} must be a non-empty string.` });
    } else if (input[field] !== input[field].trim() || input[field].length > 256) {
      issues.push({ path: field, message: `${field} must be 1-256 characters without outer whitespace.` });
    }
  }

  for (const field of ['componentVersion', 'stateVersion'] as const) {
    if (typeof input[field] === 'string' && !SEMVER_PATTERN.test(input[field])) {
      issues.push({ path: field, message: `${field} must be a semantic version.` });
    }
  }

  if (!Object.prototype.hasOwnProperty.call(input, 'state')) {
    issues.push({ path: 'state', message: 'Snapshot state is required.' });
  } else if (!isJsonValue(input.state)) {
    issues.push({ path: 'state', message: 'Snapshot state must be JSON-safe.' });
  }

  if (!Number.isSafeInteger(input.sequence) || (input.sequence as number) < 0) {
    issues.push({ path: 'sequence', message: 'sequence must be a non-negative safe integer.' });
  }

  if (
    typeof input.savedAt === 'string' &&
    (!DATE_TIME_PATTERN.test(input.savedAt) || Number.isNaN(Date.parse(input.savedAt)))
  ) {
    issues.push({ path: 'savedAt', message: 'savedAt must be a valid ISO date-time string.' });
  }

  for (const field of Object.keys(input)) {
    if (!ALLOWED_FIELDS.includes(field)) {
      issues.push({ path: field, message: `${field} is not allowed in a snapshot.` });
    }
  }

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, snapshot: input as unknown as ComponentSnapshot<State> };
}

const bindingMismatches = (
  snapshot: ComponentSnapshot,
  target: SnapshotBinding,
): SnapshotIssue[] => BINDING_FIELDS.flatMap((field) =>
  snapshot[field] === target[field]
    ? []
    : [{ path: field, message: `Snapshot ${field} does not match the restore target.` }],
);

function findDirectMigration(
  snapshot: ComponentSnapshot,
  target: SnapshotBinding,
  migrations: ComponentSnapshotMigrationTable,
): ComponentSnapshotMigration | undefined {
  return migrations.find(
    (migration) =>
      migration.componentId === target.componentId &&
      migration.fromComponentVersion === snapshot.componentVersion &&
      migration.fromStateVersion === snapshot.stateVersion &&
      migration.toComponentVersion === target.componentVersion &&
      migration.toStateVersion === target.stateVersion,
  );
}

function deny(
  code: SnapshotRestoreDenialCode,
  message: string,
  issues?: SnapshotIssue[],
): SnapshotRestoreDenial {
  return { ok: false, code, message, ...(issues ? { issues } : {}) };
}

export function canRestoreSnapshot(
  input: unknown,
  target: SnapshotBinding,
  migrations: ComponentSnapshotMigrationTable = [],
): SnapshotRestoreResult {
  const validated = validateSnapshot(input);
  if (!validated.ok) {
    return deny('INVALID_SNAPSHOT', 'Snapshot validation failed.', validated.issues);
  }

  const mismatches = bindingMismatches(validated.snapshot, target);
  if (mismatches.length > 0) {
    return deny('BINDING_MISMATCH', 'Snapshot belongs to different content or attempt.', mismatches);
  }

  const exactVersion =
    validated.snapshot.componentVersion === target.componentVersion &&
    validated.snapshot.stateVersion === target.stateVersion;
  if (exactVersion) {
    return { ok: true, state: validated.snapshot.state, snapshot: validated.snapshot, migrated: false };
  }

  if (migrations.length === 0) {
    return deny(
      'MIGRATION_REQUIRED',
      'Component and state versions must match exactly unless a direct migration is supplied.',
    );
  }

  const migration = findDirectMigration(validated.snapshot, target, migrations);
  if (!migration) {
    return deny(
      'MIGRATION_NOT_FOUND',
      'No direct component-owned migration matches this snapshot and restore target.',
    );
  }

  return { ok: true, state: validated.snapshot.state, snapshot: validated.snapshot, migrated: true };
}

export function restoreSnapshot<State = unknown>(
  input: unknown,
  target: SnapshotBinding,
  migrations: ComponentSnapshotMigrationTable = [],
): SnapshotRestoreResult<State> {
  const compatibility = canRestoreSnapshot(input, target, migrations);
  if (!compatibility.ok || !compatibility.migrated) {
    return compatibility as SnapshotRestoreResult<State>;
  }

  const snapshot = compatibility.snapshot;
  const migration = findDirectMigration(snapshot, target, migrations);
  if (!migration) {
    return deny('MIGRATION_NOT_FOUND', 'The direct migration is no longer available.');
  }

  try {
    const state = migration.migrate(snapshot.state) as State;
    return {
      ok: true,
      state,
      migrated: true,
      snapshot: {
        ...snapshot,
        componentVersion: target.componentVersion,
        stateVersion: target.stateVersion,
        state,
      },
    };
  } catch (error) {
    return deny(
      'MIGRATION_FAILED',
      error instanceof Error ? error.message : 'Snapshot migration failed.',
    );
  }
}
