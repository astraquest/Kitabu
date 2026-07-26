import assert from 'node:assert/strict';
import test from 'node:test';

import type { ComponentManifest } from '../../src/interactive-learning/contract.ts';
import {
  ComponentRegistryError,
  createInstalledComponentRegistry,
} from '../../src/interactive-learning/registry.ts';

function manifest(
  componentId = 'structured-response',
  componentVersion: `${number}.${number}.${number}` = '1.0.0',
): ComponentManifest {
  return {
    identity: { componentId, componentVersion, specVersion: '1.0.1' },
    displayName: 'Structured response',
    kind: 'primitive',
    maturity: 'build-now',
    owner: 'kitabu',
    rendererBindings: [{ renderer: 'native', bindingId: 'structured-response/native' }],
    capabilityTiers: ['lite'],
    propsSchemaBindingId: 'structured-response/props/1.0.0',
    stateSchemaVersion: '1.0.0',
    supportedTutorActions: ['highlight'],
    emittedEvents: ['READY', 'SUBMITTED', 'EVIDENCE'],
    evidenceTypes: ['answer'],
    privacyClasses: ['ordinary-learning-event'],
  };
}

const parseManifest = (value: unknown): ComponentManifest => value as ComponentManifest;

function expectRegistryError(action: () => unknown, code: ComponentRegistryError['code']): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof ComponentRegistryError);
    assert.equal(error.code, code);
    return true;
  });
}

test('creates a registry from validated manifests and lists installed versions', () => {
  const first = manifest();
  const second = manifest('structured-response', '1.1.0');
  const registry = createInstalledComponentRegistry([first, second], parseManifest);

  assert.equal(registry.size, 2);
  assert.deepEqual(registry.list(), [first, second]);
});

test('runs the manifest validation hook and identifies its failing input', () => {
  const rejected = new Error('missing renderer binding');

  assert.throws(
    () => createInstalledComponentRegistry([manifest(), { invalid: true }], (value) => {
      if (!('identity' in (value as Record<string, unknown>))) throw rejected;
      return value as ComponentManifest;
    }),
    (error: unknown) => {
      assert.ok(error instanceof ComponentRegistryError);
      assert.equal(error.code, 'invalid-manifest');
      assert.match(error.message, /index 1/);
      assert.equal(error.cause, rejected);
      return true;
    },
  );
});

test('rejects duplicate component IDs at the same exact version', () => {
  expectRegistryError(
    () => createInstalledComponentRegistry([manifest(), manifest()], parseManifest),
    'duplicate-component-version',
  );
});

test('looks up only an exact installed component version', () => {
  const installed = manifest();
  const registry = createInstalledComponentRegistry([installed], parseManifest);

  assert.equal(registry.has('structured-response', '1.0.0'), true);
  assert.equal(registry.get('structured-response', '1.0.0'), installed);
  assert.equal(registry.resolve('structured-response', '1.0.0'), installed);
  assert.equal(registry.has('structured-response', '1.0.1'), false);
  assert.equal(registry.get('structured-response', '1.0.1'), undefined);
});

test('reports a missing exact version', () => {
  const registry = createInstalledComponentRegistry([manifest()], parseManifest);

  expectRegistryError(
    () => registry.resolve('structured-response', '2.0.0'),
    'component-version-not-installed',
  );
});

test('registry and listing are immutable snapshots of the supplied values', () => {
  const values: unknown[] = [manifest()];
  const registry = createInstalledComponentRegistry(values, parseManifest);
  values.push(manifest('classify-sort-match-rank'));

  assert.equal(Object.isFrozen(registry), true);
  assert.equal(Object.isFrozen(registry.list()), true);
  assert.equal(registry.size, 1);
  assert.equal(registry.has('classify-sort-match-rank', '1.0.0'), false);
  assert.throws(() => (registry.list() as ComponentManifest[]).push(manifest()));
});

test('does not interpret latest tags or semantic-version ranges', () => {
  const registry = createInstalledComponentRegistry([manifest()], parseManifest);

  for (const version of ['latest', '^1.0.0', '1.x', '>=1.0.0']) {
    assert.equal(registry.get('structured-response', version), undefined);
    expectRegistryError(
      () => registry.resolve('structured-response', version),
      'component-version-not-installed',
    );
  }
});
