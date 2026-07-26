import assert from 'node:assert/strict';
import test from 'node:test';

import {
  accepted,
  compatibilityRejection,
  prefixIssuePath,
  rejected,
  runtimeIssue,
  snapshotRejection,
  tipRejection,
  validationIssue,
} from '../../src/interactive-learning/errors.ts';

test('issues and results remain plain serializable data', () => {
  const result = rejected(
    validationIssue('required', 'componentId is required', ['componentId']),
  );

  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  assert.deepEqual(accepted({ sceneId: 'fractions-1' }), {
    ok: true,
    value: { sceneId: 'fractions-1' },
  });
});

test('an issue exposes stable area, code and path fields', () => {
  const issue = runtimeIssue(
    'compatibility',
    'unsupported-component-version',
    'Component version 2 is unavailable',
    ['component', 'version'],
  );

  assert.equal(issue.area, 'compatibility');
  assert.equal(issue.code, 'unsupported-component-version');
  assert.deepEqual(issue.path, ['component', 'version']);
});

test('rejection factories assign the correct subsystem', () => {
  const compatibility = compatibilityRejection(
    'renderer-unavailable',
    'No compatible renderer is installed',
  );
  const tip = tipRejection(
    'action-not-permitted-by-scene',
    'The scene does not permit reveal',
    ['tutor', 'action'],
  );
  const snapshot = snapshotRejection(
    'BINDING_MISMATCH',
    'Snapshot belongs to another attempt',
    ['attemptId'],
  );

  assert.equal(compatibility.issues[0]?.area, 'compatibility');
  assert.equal(tip.issues[0]?.area, 'tip');
  assert.equal(snapshot.issues[0]?.area, 'snapshot');
  assert.equal(snapshot.issues[0]?.code, 'BINDING_MISMATCH');
});

test('prefixIssuePath locates nested issues without mutating the originals', () => {
  const original = [
    validationIssue('invalid-type', 'Expected a string', ['label']),
    validationIssue('required', 'answer is required'),
  ];

  const prefixed = prefixIssuePath(['fallback', 'props'], original);

  assert.deepEqual(prefixed.map((issue) => issue.path), [
    ['fallback', 'props', 'label'],
    ['fallback', 'props'],
  ]);
  assert.deepEqual(original.map((issue) => issue.path), [['label'], []]);
  assert.notEqual(prefixed, original);
});

test('prefixIssuePath returns a new collection even for an empty prefix', () => {
  const original = [validationIssue('invalid', 'Invalid value')];
  const prefixed = prefixIssuePath([], original);

  assert.deepEqual(prefixed, original);
  assert.notEqual(prefixed, original);
});
