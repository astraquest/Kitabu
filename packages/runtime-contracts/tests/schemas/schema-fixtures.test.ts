import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const schemasRoot = resolve(packageRoot, 'schemas/interactive-learning');
const fixturesRoot = resolve(packageRoot, 'fixtures');

const schemaFiles = [
  'asset-manifest.schema.json',
  'capability-profile.schema.json',
  'component-manifest.schema.json',
  'content-bundle.schema.json',
  'evidence-envelope.schema.json',
  'message-envelope.schema.json',
  'scene-definition.schema.json',
  'snapshot.schema.json',
] as const;

type SchemaName = (typeof schemaFiles)[number];

const validFixtures: ReadonlyArray<readonly [SchemaName, string]> = [
  ['asset-manifest.schema.json', 'grade-6/whole-numbers.assets.json'],
  ['component-manifest.schema.json', 'installed-registry/structured-response.manifest.json'],
  ['component-manifest.schema.json', 'installed-registry/classify-sort-match-rank.manifest.json'],
  ['content-bundle.schema.json', 'grade-6/whole-numbers.bundle.json'],
  ['scene-definition.schema.json', 'grade-6/whole-numbers-structured-response.scene.json'],
  ['scene-definition.schema.json', 'grade-6/whole-numbers-rank.scene.json'],
];

// These fixtures deliberately violate the standalone JSON Schema. Other files
// under fixtures/invalid exercise cross-document or runtime validation instead.
const invalidStructuralFixtures: ReadonlyArray<readonly [SchemaName, string]> = [
  ['asset-manifest.schema.json', 'invalid/assets/javascript-uri.json'],
  ['asset-manifest.schema.json', 'invalid/assets/malformed-hash-and-mime.json'],
  ['asset-manifest.schema.json', 'invalid/assets/missing-licence-and-provenance.json'],
  ['component-manifest.schema.json', 'invalid/registry/missing-component-version.json'],
  ['component-manifest.schema.json', 'invalid/registry/missing-renderer-binding.json'],
  ['component-manifest.schema.json', 'invalid/registry/roadmap-only-maturity.json'],
  ['component-manifest.schema.json', 'invalid/registry/unsupported-capability-tier.json'],
  ['component-manifest.schema.json', 'invalid/registry/unsupported-renderer.json'],
  ['snapshot.schema.json', 'invalid/snapshots/invalid-sequence.json'],
  ['snapshot.schema.json', 'invalid/snapshots/malformed-identity.json'],
  ['snapshot.schema.json', 'invalid/snapshots/missing-state.json'],
];

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function fixturePath(relativePath: string): string {
  return resolve(fixturesRoot, relativePath);
}

function formatErrors(validate: ValidateFunction): string {
  return (validate.errors ?? [])
    .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
    .join('; ');
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
addFormats(ajv);

const validators = new Map<SchemaName, ValidateFunction>();
for (const schemaFile of schemaFiles) {
  validators.set(schemaFile, ajv.compile(readJson(resolve(schemasRoot, schemaFile))));
}

test('every interactive-learning schema parses and compiles', () => {
  assert.equal(validators.size, schemaFiles.length);
  for (const schemaFile of schemaFiles) {
    assert.equal(typeof validators.get(schemaFile), 'function', schemaFile);
  }
});

for (const [schemaFile, relativeFixturePath] of validFixtures) {
  test(`${relativeFixturePath} satisfies ${schemaFile}`, () => {
    const validate = validators.get(schemaFile);
    assert.ok(validate, `missing validator for ${schemaFile}`);

    const valid = validate(readJson(fixturePath(relativeFixturePath)));
    assert.equal(valid, true, formatErrors(validate));
  });
}

for (const [schemaFile, relativeFixturePath] of invalidStructuralFixtures) {
  test(`${relativeFixturePath} is rejected by ${schemaFile}`, () => {
    const validate = validators.get(schemaFile);
    assert.ok(validate, `missing validator for ${schemaFile}`);

    const valid = validate(readJson(fixturePath(relativeFixturePath)));
    assert.equal(valid, false, `${relativeFixturePath} unexpectedly passed ${schemaFile}`);
    assert.ok(validate.errors?.length, 'rejection should include at least one schema error');
  });
}
