import {
  accepted,
  rejected,
  validationIssue,
  type RuntimeResult,
} from './errors.js';

export interface SchemaValidator<T = unknown> {
  (input: unknown): RuntimeResult<T>;
}

/** A compiled schema supplied by the host. No filesystem or validator is assumed. */
export interface SchemaRegistration<T = unknown> {
  readonly schemaId: string;
  readonly schemaVersion: string;
  readonly validate: SchemaValidator<T>;
}

export interface SchemaLoader {
  resolve<T = unknown>(schemaId: string, schemaVersion: string): RuntimeResult<SchemaValidator<T>>;
  validate<T = unknown>(schemaId: string, schemaVersion: string, input: unknown): RuntimeResult<T>;
  validateDeclared<T = unknown>(schemaId: string, input: unknown): RuntimeResult<T>;
}

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function major(version: string): number | undefined {
  const match = SEMVER.exec(version);
  return match ? Number(match[1]) : undefined;
}

function key(schemaId: string, schemaVersion: string): string {
  return `${schemaId}\u0000${schemaVersion}`;
}

/**
 * Creates an immutable registry over validators compiled by the host (AJV, Zod,
 * or a hand-written parser). Resolution is exact: content is never silently
 * upgraded to another patch or minor version.
 */
export function createSchemaLoader(
  registrations: readonly SchemaRegistration[],
): SchemaLoader {
  const validators = new Map<string, SchemaValidator>();
  const knownMajors = new Map<string, Set<number>>();

  for (const registration of registrations) {
    if (!registration.schemaId.trim()) {
      throw new Error('Schema registration requires a non-empty schemaId.');
    }
    const schemaMajor = major(registration.schemaVersion);
    if (schemaMajor === undefined) {
      throw new Error(`Schema "${registration.schemaId}" has invalid version "${registration.schemaVersion}".`);
    }
    const registrationKey = key(registration.schemaId, registration.schemaVersion);
    if (validators.has(registrationKey)) {
      throw new Error(`Duplicate schema registration: ${registration.schemaId}@${registration.schemaVersion}.`);
    }
    validators.set(registrationKey, registration.validate);
    const majors = knownMajors.get(registration.schemaId) ?? new Set<number>();
    majors.add(schemaMajor);
    knownMajors.set(registration.schemaId, majors);
  }

  function resolve<T = unknown>(
    schemaId: string,
    schemaVersion: string,
  ): RuntimeResult<SchemaValidator<T>> {
    const schemaMajor = major(schemaVersion);
    if (schemaMajor === undefined) {
      return rejected(validationIssue(
        'schema.version_invalid',
        `Schema version "${schemaVersion}" is not valid semantic versioning.`,
        ['schemaVersion'],
      ));
    }

    const majors = knownMajors.get(schemaId);
    if (!majors) {
      return rejected(validationIssue(
        'schema.unknown_id',
        `Schema "${schemaId}" is not registered.`,
        ['schemaId'],
      ));
    }
    if (!majors.has(schemaMajor)) {
      return rejected(validationIssue(
        'schema.major_unsupported',
        `Schema "${schemaId}" major version ${schemaMajor} is not supported.`,
        ['schemaVersion'],
      ));
    }

    const validator = validators.get(key(schemaId, schemaVersion));
    if (!validator) {
      return rejected(validationIssue(
        'schema.version_unavailable',
        `Exact schema version "${schemaId}@${schemaVersion}" is not registered.`,
        ['schemaVersion'],
      ));
    }
    return accepted(validator as SchemaValidator<T>);
  }

  function validate<T = unknown>(
    schemaId: string,
    schemaVersion: string,
    input: unknown,
  ): RuntimeResult<T> {
    const resolved = resolve<T>(schemaId, schemaVersion);
    return resolved.ok ? resolved.value(input) : resolved;
  }

  function validateDeclared<T = unknown>(schemaId: string, input: unknown): RuntimeResult<T> {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      return rejected(validationIssue(
        'schema.declaration_missing',
        'Input must be an object with a declared schemaVersion.',
        ['schemaVersion'],
      ));
    }
    const schemaVersion = (input as { schemaVersion?: unknown }).schemaVersion;
    if (typeof schemaVersion !== 'string') {
      return rejected(validationIssue(
        'schema.declaration_missing',
        'Input must declare schemaVersion as a string.',
        ['schemaVersion'],
      ));
    }
    return validate<T>(schemaId, schemaVersion, input);
  }

  return Object.freeze({ resolve, validate, validateDeclared });
}
