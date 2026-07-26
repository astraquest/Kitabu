import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test, { type TestContext } from 'node:test';

import { checkFixtureIntegrity } from '../../src/cli/check-fixture-integrity.ts';

const repositoryRoot = resolve(import.meta.dirname, '../../../..');
const packageRoot = resolve(repositoryRoot, 'packages/runtime-contracts');
const grade6Root = resolve(packageRoot, 'fixtures/grade-6');
const bundlePath = resolve(grade6Root, 'whole-numbers.bundle.json');

interface BundleReference {
  path: string;
}

interface BundleFixture {
  assetManifest: BundleReference;
  scenes: BundleReference[];
}

function temporaryRepository(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), 'kitabu-bundle-integrity-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function copyBundlePayload(root: string): { bundle: string; firstScene: string } {
  const fixture = JSON.parse(readFileSync(bundlePath, 'utf8')) as BundleFixture;
  const targetPackage = resolve(root, 'packages/runtime-contracts');
  const targetBundle = resolve(targetPackage, 'fixtures/grade-6/whole-numbers.bundle.json');
  mkdirSync(dirname(targetBundle), { recursive: true });
  copyFileSync(bundlePath, targetBundle);

  const references = [fixture.assetManifest, ...fixture.scenes];
  for (const reference of references) {
    const source = reference.path.startsWith('fixtures/')
      ? resolve(packageRoot, reference.path)
      : resolve(packageRoot, 'fixtures', reference.path);
    const target = reference.path.startsWith('fixtures/')
      ? resolve(targetPackage, reference.path)
      : resolve(targetPackage, 'fixtures', reference.path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }

  return {
    bundle: targetBundle,
    firstScene: resolve(targetPackage, fixture.scenes[0].path),
  };
}

test('verifies every Grade 6 bundle reference and its composite payload hash locally', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error('bundle integrity verification must not use the network');
  }) as typeof fetch;

  try {
    const result = checkFixtureIntegrity([bundlePath], { repositoryRoot });

    assert.equal(result.ok, true, result.issues.map((issue) => `${issue.code}: ${issue.message}`).join('\n'));
    assert.deepEqual(result.issues, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects a tampered local payload without fetching a replacement', (t) => {
  const root = temporaryRepository(t);
  const copied = copyBundlePayload(root);
  const scene = JSON.parse(readFileSync(copied.firstScene, 'utf8')) as Record<string, unknown>;
  scene.title = 'Tampered after publication';
  writeFileSync(copied.firstScene, `${JSON.stringify(scene, null, 2)}\n`, 'utf8');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error('bundle integrity verification must not use the network');
  }) as typeof fetch;

  try {
    const result = checkFixtureIntegrity([copied.bundle], { repositoryRoot: root });

    assert.equal(result.ok, false);
    assert.ok(result.issues.some((issue) => issue.code === 'bundle.reference_digest_mismatch'));
    assert.ok(result.issues.some((issue) => issue.code === 'bundle.payload_digest_mismatch'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
