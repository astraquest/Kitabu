import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  AuthoredContentRegistryError,
  curriculumLocationKey,
  loadAuthoredContentRegistry,
  type CurriculumLocation,
} from './index.js';

const firstLocation = {
  country: 'KEN',
  curriculum: 'CBC',
  release: '2024',
  grade: 'Grade 1',
  subject: 'mathematics',
  subStrand: 'whole-numbers',
  outcome: 'count-forward',
} as const;

const secondLocation = { ...firstLocation, outcome: 'count-backward' } as const;

function mission(location: CurriculumLocation = firstLocation) {
  return {
    schemaVersion: 1,
    contentVersion: 1,
    location,
    title: 'Count forward',
    objective: 'Count numbers forward.',
    interactions: [{
      id: 'step-1',
      order: 0,
      phase: 'warm-up',
      kind: 'choice',
      prompt: 'What comes after 2?',
      successMessage: 'Correct!',
      retryHint: 'Count one more.',
      public: {
        choices: [
          { id: 'three', label: '3' },
          { id: 'four', label: '4' },
        ],
        selectionLimit: 1,
      },
      private: { acceptedChoiceIds: ['three'] },
    }],
  };
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'kitabu-authored-content-'));
  mkdirSync(join(root, 'missions'));
  writeFileSync(join(root, 'missions', 'first.json'), JSON.stringify(mission()));
  writeFileSync(join(root, 'missions', 'second.json'), JSON.stringify(mission(secondLocation)));
  return root;
}

function writeManifest(root: string, missions: unknown[]) {
  writeFileSync(join(root, 'manifest.json'), JSON.stringify({ schemaVersion: 1, missions }));
}

test('builds a globally unique encoded curriculum location key', () => {
  assert.equal(
    curriculumLocationKey(firstLocation),
    'KEN/CBC/2024/Grade%201/mathematics/whole-numbers/count-forward',
  );
});

test('loads missions deterministically and keeps answers out of published output', t => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeManifest(root, [
    { location: firstLocation, path: 'missions/first.json', position: 20 },
    { location: secondLocation, path: 'missions/second.json', position: 10 },
  ]);

  const registry = loadAuthoredContentRegistry(root);
  assert.equal(registry.size, 2);
  assert.deepEqual(registry.locationKeys(), [
    curriculumLocationKey(secondLocation),
    curriculumLocationKey(firstLocation),
  ]);

  const published = registry.getPublished(curriculumLocationKey(firstLocation));
  assert.ok(published);
  assert.equal('private' in published.interactions[0], false);
  assert.equal(JSON.stringify(published).includes('acceptedChoiceIds'), false);

  const grading = registry.getForGrading(curriculumLocationKey(firstLocation));
  assert.deepEqual(grading?.interactions[0].private, { acceptedChoiceIds: ['three'] });
  assert.equal('prompt' in (grading?.interactions[0] ?? {}), false);
});

test('rejects duplicate curriculum locations', t => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeManifest(root, [
    { location: firstLocation, path: 'missions/first.json' },
    { location: firstLocation, path: 'missions/second.json' },
  ]);

  assert.throws(
    () => loadAuthoredContentRegistry(root),
    (error: unknown) => error instanceof AuthoredContentRegistryError && error.code === 'DUPLICATE_LOCATION',
  );
});

test('rejects path traversal and absolute manifest entries', t => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));

  for (const path of ['../outside.json', 'C:/outside.json', '/outside.json']) {
    writeManifest(root, [{ location: firstLocation, path }]);
    assert.throws(
      () => loadAuthoredContentRegistry(root),
      (error: unknown) => error instanceof AuthoredContentRegistryError && error.code === 'INVALID_MANIFEST_PATH',
    );
  }
});

test('rejects a symlink that escapes the content root', t => {
  const root = fixture();
  const outside = mkdtempSync(join(tmpdir(), 'kitabu-authored-outside-'));
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  });
  writeFileSync(join(outside, 'mission.json'), JSON.stringify(mission()));
  try {
    symlinkSync(join(outside, 'mission.json'), join(root, 'missions', 'escape.json'), 'file');
  } catch {
    t.skip('Creating symlinks is not available in this environment.');
    return;
  }
  writeManifest(root, [{ location: firstLocation, path: 'missions/escape.json' }]);

  assert.throws(
    () => loadAuthoredContentRegistry(root),
    (error: unknown) => error instanceof AuthoredContentRegistryError && error.code === 'PATH_OUTSIDE_ROOT',
  );
});

test('rejects duplicate interaction identity inside a mission', t => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const invalid = mission();
  invalid.interactions.push({ ...invalid.interactions[0] });
  writeFileSync(join(root, 'missions', 'first.json'), JSON.stringify(invalid));
  writeManifest(root, [{ location: firstLocation, path: 'missions/first.json' }]);

  assert.throws(
    () => loadAuthoredContentRegistry(root),
    (error: unknown) => error instanceof AuthoredContentRegistryError && error.code === 'INVALID_MISSION',
  );
});

test('rejects a mission whose location differs from its manifest entry', t => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeManifest(root, [{ location: secondLocation, path: 'missions/first.json' }]);

  assert.throws(
    () => loadAuthoredContentRegistry(root),
    (error: unknown) => error instanceof AuthoredContentRegistryError && error.code === 'LOCATION_MISMATCH',
  );
});

test('rejects private grading references that are absent from public scene data', t => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const invalid = mission();
  invalid.interactions[0].private.acceptedChoiceIds = ['missing-choice'];
  writeFileSync(join(root, 'missions', 'first.json'), JSON.stringify(invalid));
  writeManifest(root, [{ location: firstLocation, path: 'missions/first.json' }]);

  assert.throws(
    () => loadAuthoredContentRegistry(root),
    (error: unknown) => error instanceof AuthoredContentRegistryError && error.code === 'INVALID_MISSION',
  );
});

test('published projections cannot mutate registry-owned mission data', t => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeManifest(root, [{ location: firstLocation, path: 'missions/first.json' }]);
  const registry = loadAuthoredContentRegistry(root);
  const key = curriculumLocationKey(firstLocation);

  const projection = registry.getPublished(key);
  assert.ok(projection);
  projection.title = 'Changed by caller';
  assert.equal(registry.getPublished(key)?.title, 'Count forward');
});
