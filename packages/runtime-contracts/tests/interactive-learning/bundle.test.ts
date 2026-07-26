import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type BundleRuntimeSupport,
  type InteractiveLearningBundleManifest,
  checkBundleCompatibility,
  pinAttemptToBundle,
} from '../../src/interactive-learning/bundle.ts';

const manifest = (
  overrides: Partial<InteractiveLearningBundleManifest> = {},
): InteractiveLearningBundleManifest => ({
  manifestVersion: 1,
  bundleId: 'ken-cbc-grade-6-maths',
  revision: '2026-07-26.1',
  sha256: 'a'.repeat(64),
  protocolVersion: '1.0.1',
  sceneSchemaVersion: '1.0.0',
  minimumAppBuild: 123,
  components: [{ componentId: 'structured-response', componentVersion: '1.0.0' }],
  graders: [{ graderId: 'numeric-exact', graderVersion: '1.0.0' }],
  assetManifest: { path: 'assets/manifest.json', sha256: 'b'.repeat(64) },
  scenes: [{
    sceneId: 'whole-numbers-place-value',
    sceneVersion: '1.0.0',
    path: 'scenes/place-value.json',
    sha256: 'c'.repeat(64),
  }],
  release: { channel: 'production', releaseId: 'release-2026-07-26-1' },
  ...overrides,
});

const runtime = (overrides: Partial<BundleRuntimeSupport> = {}): BundleRuntimeSupport => ({
  protocolVersions: ['1.0.1'],
  sceneSchemaVersions: ['1.0.0'],
  appBuild: 123,
  components: [{ componentId: 'structured-response', componentVersion: '1.0.0' }],
  graders: [{ graderId: 'numeric-exact', graderVersion: '1.0.0' }],
  releaseChannel: 'production',
  ...overrides,
});

function issueCodes(
  value: InteractiveLearningBundleManifest,
  support = runtime(),
): string[] {
  const result = checkBundleCompatibility(value, support);
  return result.issues.map((issue) => issue.code);
}

test('accepts an exactly supported immutable bundle identity', () => {
  assert.deepEqual(checkBundleCompatibility(manifest(), runtime()), {
    compatible: true,
    issues: [],
  });
});

test('validates the immutable identity, build range, and unique dependency locks', () => {
  const invalid = manifest({
    bundleId: ' ',
    revision: '',
    sha256: 'NOT-A-DIGEST',
    minimumAppBuild: -1,
    maximumAppBuild: -2,
    components: [
      { componentId: 'structured-response', componentVersion: '1.0.0' },
      { componentId: 'structured-response', componentVersion: '1.1.0' },
    ],
    graders: [
      { graderId: 'numeric-exact', graderVersion: '1.0.0' },
      { graderId: 'numeric-exact', graderVersion: '1.1.0' },
    ],
    release: { channel: 'production', releaseId: '' },
  });

  const result = checkBundleCompatibility(invalid, runtime());
  assert.equal(result.compatible, false);
  assert.ok(result.issues.filter((issue) => issue.code === 'manifest.invalid').length >= 8);
  assert.ok(result.issues.some((issue) => issue.path === 'sha256'));
  assert.ok(result.issues.some((issue) => issue.path === 'components[1].componentId'));
  assert.ok(result.issues.some((issue) => issue.path === 'graders[1].graderId'));
});

test('requires schema-aligned, hash-pinned asset and scene references', () => {
  const invalid = manifest({
    assetManifest: { path: '../assets.json', sha256: 'BAD' },
    scenes: [
      { sceneId: 'same-scene', sceneVersion: 'latest', path: '/scene.json', sha256: 'BAD' },
      { sceneId: 'same-scene', sceneVersion: '1.0.0', path: 'scenes\\scene.json', sha256: 'd'.repeat(64) },
    ],
  });

  const result = checkBundleCompatibility(invalid, runtime());
  assert.equal(result.compatible, false);
  assert.ok(result.issues.some((issue) => issue.path === 'assetManifest.path'));
  assert.ok(result.issues.some((issue) => issue.path === 'assetManifest.sha256'));
  assert.ok(result.issues.some((issue) => issue.path === 'scenes[0].sceneVersion'));
  assert.ok(result.issues.some((issue) => issue.path === 'scenes[0].path'));
  assert.ok(result.issues.some((issue) => issue.path === 'scenes[1].sceneId'));
});

test('rejects unsupported protocol, scene schema, and app builds outside the declared range', () => {
  assert.ok(issueCodes(manifest(), runtime({ protocolVersions: ['2.0.0'] })).includes('protocol.unsupported'));
  assert.ok(issueCodes(manifest(), runtime({ sceneSchemaVersions: ['2.0.0'] })).includes('scene-schema.unsupported'));
  assert.ok(issueCodes(manifest(), runtime({ appBuild: 122 })).includes('app-build.too-old'));
  assert.ok(issueCodes(manifest({ maximumAppBuild: 130 }), runtime({ appBuild: 131 })).includes('app-build.too-new'));
});

test('requires every component and grader at the exact locked version', () => {
  assert.ok(issueCodes(manifest(), runtime({ components: [] })).includes('component.missing'));
  assert.ok(issueCodes(manifest(), runtime({
    components: [{ componentId: 'structured-response', componentVersion: '1.1.0' }],
  })).includes('component.version-mismatch'));

  assert.ok(issueCodes(manifest(), runtime({ graders: [] })).includes('grader.missing'));
  assert.ok(issueCodes(manifest(), runtime({
    graders: [{ graderId: 'numeric-exact', graderVersion: '1.1.0' }],
  })).includes('grader.version-mismatch'));
});

test('prevents a bundle from crossing release channels', () => {
  const result = checkBundleCompatibility(manifest(), runtime({ releaseChannel: 'staging' }));
  assert.equal(result.compatible, false);
  assert.deepEqual(result.issues.map((issue) => issue.code), ['release.channel-mismatch']);
});

test('pins an attempt to the full bundle and release identity', () => {
  const value = manifest();
  const pin = pinAttemptToBundle('attempt-42', value);

  assert.deepEqual(pin, {
    attemptId: 'attempt-42',
    bundleId: value.bundleId,
    revision: value.revision,
    sha256: value.sha256,
    release: value.release,
  });
  assert.equal(checkBundleCompatibility(value, runtime(), pin).compatible, true);
  assert.throws(() => pinAttemptToBundle(' ', value), /attemptId/);
});

test('rejects every kind of drift from a pinned attempt', () => {
  const original = manifest();
  const pin = pinAttemptToBundle('attempt-42', original);
  const drifted = manifest({
    bundleId: 'different-bundle',
    revision: '2026-07-26.2',
    sha256: 'b'.repeat(64),
    release: { channel: 'production', releaseId: 'different-release' },
  });

  const result = checkBundleCompatibility(drifted, runtime(), pin);
  assert.equal(result.compatible, false);
  assert.deepEqual(result.issues.map((issue) => issue.code), [
    'attempt.bundle-mismatch',
    'attempt.revision-mismatch',
    'attempt.hash-mismatch',
    'attempt.release-mismatch',
  ]);
});
