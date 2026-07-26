import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import {
  validateLearnerRecordPrivacy,
} from '../../src/interactive-learning/privacy.ts';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(resolve(packageRoot, relativePath), 'utf8')) as unknown;
}

function compile(relativePath: string): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  addFormats(ajv);
  return ajv.compile(readJson(relativePath));
}

const validateScene = compile('schemas/interactive-learning/scene-definition.schema.json');
const validateStructuredResponse = compile(
  'schemas/interactive-learning/props/structured-response.schema.json',
);
const validateRankedList = compile(
  'schemas/interactive-learning/props/classify-sort-match-rank.schema.json',
);

const structuredScene = () => readJson(
  'fixtures/grade-6/whole-numbers-structured-response.scene.json',
) as Record<string, unknown>;

const rankedScene = () => readJson(
  'fixtures/grade-6/whole-numbers-rank.scene.json',
) as Record<string, unknown>;

test('learner-facing component props reject answer keys and hidden tests', () => {
  const structuredProps = structuredScene().props as Record<string, unknown>;
  const rankedProps = rankedScene().props as Record<string, unknown>;

  for (const protectedField of ['answer', 'answerKey', 'correctAnswer', 'hiddenTests']) {
    assert.equal(
      validateStructuredResponse({ ...structuredProps, [protectedField]: 'server-only' }),
      false,
      `structured-response unexpectedly exposed ${protectedField}`,
    );
    assert.equal(
      validateRankedList({ ...rankedProps, [protectedField]: 'server-only' }),
      false,
      `ranked-list unexpectedly exposed ${protectedField}`,
    );
  }
});

test('practice scenes require an explicit feedback, retry, and answer-reveal policy', () => {
  const scene = structuredScene();
  delete scene.attemptPolicy;

  assert.equal(validateScene(scene), false, 'practice content must not inherit an implicit policy');

  scene.attemptPolicy = {
    maxAttempts: 3,
    feedbackTiming: 'on-submit',
    revealAnswer: 'after-completion',
  };
  assert.equal(validateScene(scene), true, JSON.stringify(validateScene.errors));
});

test('raw learner media stays outside envelopes and is represented by a blob reference', () => {
  const metadata = {
    recordKind: 'submission',
    privacyClass: 'raw-audio',
    retention: { policyId: 'learner-media', policyVersion: '1.0.0' },
    media: [{
      kind: 'blob-ref',
      blobId: 'attempts/attempt-1/audio/response-1',
      mimeType: 'audio/webm',
      sha256: 'a'.repeat(64),
      sizeBytes: 4_096,
    }],
  };

  assert.equal(validateLearnerRecordPrivacy(metadata).ok, true);
  const embedded = validateLearnerRecordPrivacy(metadata, {
    response: 'data:audio/webm;base64,ZmFrZQ==',
  });
  assert.equal(embedded.ok, false);
  if (!embedded.ok) {
    assert.ok(embedded.issues.some((issue) => issue.code === 'embedded-raw-media'));
  }

  const missingReference = validateLearnerRecordPrivacy({ ...metadata, media: [] });
  assert.equal(missingReference.ok, false);
  if (!missingReference.ok) {
    assert.ok(missingReference.issues.some((issue) => issue.code === 'missing-blob-reference'));
  }
});

test('protected graders are exposed only as pinned opaque references', () => {
  const scene = structuredScene();
  scene.grader = {
    graderId: 'kitabu.grade-6.whole-number-place-value',
    graderVersion: '1.0.0',
    mode: 'exact',
  };
  assert.equal(validateScene(scene), true, JSON.stringify(validateScene.errors));

  scene.grader = {
    graderId: 'kitabu.grade-6.whole-number-place-value',
    graderVersion: '1.0.0',
    mode: 'exact',
    config: {
      correctAnswer: 700_000,
      hiddenTests: [{ input: 'seven hundred thousand', expected: 700_000 }],
    },
  };
  assert.equal(validateScene(scene), false, 'grader implementation details must stay server-side');
});
