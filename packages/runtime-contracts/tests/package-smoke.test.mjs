import assert from 'node:assert/strict';
import test from 'node:test';

test('built ESM package exposes the Wave 0 runtime API', async () => {
  const runtime = await import('../dist/index.js');

  assert.equal(runtime.INTERACTIVE_LEARNING_PROTOCOL_VERSION, '1.0.1');

  for (const exportName of [
    'checkBundleCompatibility',
    'createInstalledComponentRegistry',
    'createTutorInterventionDispatcher',
    'RuntimeEnvelopeDuplicateGuard',
    'selectRenderCapability',
    'validateAssetManifest',
    'validateComponentScene',
    'validateRuntimeEnvelope',
    'validateSnapshot',
  ]) {
    assert.equal(
      typeof runtime[exportName],
      'function',
      `Expected ${exportName} to be a public function`,
    );
  }
});
