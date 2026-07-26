import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  AssetManifest,
  ComponentManifest,
  ComponentSnapshot,
  RuntimeEnvelope,
  SceneDefinition,
  TutorActionRequest,
} from '../src/index.ts';

// These aliases are compile-time API checks. If a public Wave 0 type is renamed
// or removed, this test file will stop type-checking before the runtime test runs.
type Wave0PublicTypes = [
  AssetManifest,
  ComponentManifest,
  ComponentSnapshot,
  RuntimeEnvelope,
  SceneDefinition,
  TutorActionRequest,
];

const wave0TypeCount: Wave0PublicTypes['length'] = 6;

const requiredFunctions = [
  'canRestoreSnapshot',
  'checkBundleCompatibility',
  'createInstalledComponentRegistry',
  'createSchemaLoader',
  'createTutorInterventionDispatcher',
  'pinAttemptToBundle',
  'restoreSnapshot',
  'runInteractiveLearningHarness',
  'selectRenderCapability',
  'validateAssetManifest',
  'validateComponentScene',
  'validateLearnerRecordPrivacy',
  'validateRuntimeEnvelope',
  'validateSnapshot',
] as const;

const forbiddenLegacyExports = [
  'FlatScene',
  'createFlatScene',
  'loadScene',
  'parseScene',
  'validateScene',
] as const;

const forbiddenPluginExports = [
  'Plugin',
  'createPluginRegistry',
  'loadPlugin',
  'registerPlugin',
] as const;

test('compiled package root exposes only the intended Wave 0 surface', async () => {
  const runtime: Record<string, unknown> = await import('../dist/index.js');

  assert.equal(wave0TypeCount, 6);
  assert.equal(runtime.INTERACTIVE_LEARNING_PROTOCOL_VERSION, '1.0.1');

  for (const exportName of requiredFunctions) {
    assert.equal(
      typeof runtime[exportName],
      'function',
      `Expected ${exportName} to remain a public function`,
    );
  }

  for (const exportName of [
    ...forbiddenLegacyExports,
    ...forbiddenPluginExports,
  ]) {
    assert.equal(
      Object.hasOwn(runtime, exportName),
      false,
      `Unexpected out-of-scope public export: ${exportName}`,
    );
  }

  const accidentalBroadExports = Object.keys(runtime).filter((exportName) =>
    /(?:flat.?scene|plugin)/i.test(exportName),
  );
  assert.deepEqual(
    accidentalBroadExports,
    [],
    'Flat-scene and plugin APIs are outside the Wave 0 compatibility boundary',
  );
});
