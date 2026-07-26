import assert from 'node:assert/strict';
import test from 'node:test';

import {
  accepted,
  createSchemaLoader,
  type RuntimeResult,
  type SchemaValidator,
} from '../../src/interactive-learning/index.ts';

function validator(label: string): SchemaValidator<{ label: string; input: unknown }> {
  return (input) => accepted({ label, input });
}

function expectIssue(result: RuntimeResult<unknown>, code: string): void {
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0]?.area, 'validation');
  assert.equal(result.issues[0]?.code, code);
  assert.deepEqual(result.issues[0]?.path, ['schemaVersion']);
}

test('resolves and validates only the exact registered schema version', () => {
  const versionOne = validator('1.0.0');
  const versionTwo = validator('1.1.0');
  const loader = createSchemaLoader([
    { schemaId: 'scene', schemaVersion: '1.0.0', validate: versionOne },
    { schemaId: 'scene', schemaVersion: '1.1.0', validate: versionTwo },
  ]);

  const resolved = loader.resolve('scene', '1.1.0');
  assert.equal(resolved.ok, true);
  if (resolved.ok) assert.equal(resolved.value, versionTwo);

  assert.deepEqual(loader.validate('scene', '1.0.0', { answer: 42 }), {
    ok: true,
    value: { label: '1.0.0', input: { answer: 42 } },
  });
});

test('rejects duplicate registrations for the same schema ID and exact version', () => {
  assert.throws(
    () => createSchemaLoader([
      { schemaId: 'scene', schemaVersion: '1.0.0', validate: validator('first') },
      { schemaId: 'scene', schemaVersion: '1.0.0', validate: validator('second') },
    ]),
    /Duplicate schema registration: scene@1\.0\.0/,
  );
});

test('rejects an invalid schemaVersion declared by content', () => {
  const loader = createSchemaLoader([
    { schemaId: 'scene', schemaVersion: '1.0.0', validate: validator('1.0.0') },
  ]);

  expectIssue(loader.validateDeclared('scene', { schemaVersion: '1.x' }), 'schema.version_invalid');
});

test('rejects an unknown schema major version', () => {
  const loader = createSchemaLoader([
    { schemaId: 'scene', schemaVersion: '1.0.0', validate: validator('1.0.0') },
  ]);

  expectIssue(loader.resolve('scene', '2.0.0'), 'schema.major_unsupported');
});

test('does not substitute an available schema for an unavailable minor or patch', () => {
  const loader = createSchemaLoader([
    { schemaId: 'scene', schemaVersion: '1.0.0', validate: validator('1.0.0') },
  ]);

  expectIssue(loader.resolve('scene', '1.0.1'), 'schema.version_unavailable');
  expectIssue(loader.resolve('scene', '1.1.0'), 'schema.version_unavailable');
});
