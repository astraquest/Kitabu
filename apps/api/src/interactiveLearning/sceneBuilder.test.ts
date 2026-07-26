import assert from 'node:assert/strict';
import test from 'node:test';

import { buildStructuredResponseScene } from './sceneBuilder.js';

test('builds a pinned structured-response scene with safe defaults', () => {
  const scene = buildStructuredResponseScene({
    sceneId: 'ken.cbc.g6.math.place-value.1',
    prompt: 'What is the value of the digit 7?',
    inputLabel: 'Enter the value',
    evidenceClaim: {
      claimId: 'place-value',
      description: 'Uses place value correctly',
    },
    graderId: 'kitabu.sealed-place-value',
    mode: 'numeric',
  });

  assert.deepEqual(scene.component, {
    componentId: 'structured-response',
    componentVersion: '1.0.0',
  });
  assert.deepEqual(scene.grader, {
    graderId: 'kitabu.sealed-place-value',
    graderVersion: '1.0.0',
    mode: 'exact',
  });
  assert.deepEqual(scene.completion.requiredClaimIds, ['place-value']);
  assert.equal(scene.props.normalization.allowThousandsSeparators, true);
  assert.deepEqual(scene.attemptPolicy, {
    maxAttempts: 1,
    feedbackTiming: 'after-attempts',
    revealAnswer: 'never',
  });
});

test('never copies private grading or answer fields into learner output', () => {
  const input = {
    sceneId: 'safe-scene',
    prompt: 'Respond briefly',
    inputLabel: 'Your response',
    evidenceClaim: { claimId: 'claim-1', description: 'Provides a response' },
    graderId: 'kitabu.opaque-grader',
    correctAnswer: 'private',
    answerKey: { accepted: ['private'] },
    gradingConfig: { strategy: 'secret' },
  };

  const serialized = JSON.stringify(buildStructuredResponseScene(input));

  assert.equal(serialized.includes('correctAnswer'), false);
  assert.equal(serialized.includes('answerKey'), false);
  assert.equal(serialized.includes('gradingConfig'), false);
  assert.deepEqual(Object.keys(JSON.parse(serialized).grader).sort(), [
    'graderId',
    'graderVersion',
    'mode',
  ]);
});

test('preserves localized learner text without sharing caller-owned objects', () => {
  const prompt = { default: 'Name the process', key: 'science.process.prompt' };
  const scene = buildStructuredResponseScene({
    sceneId: 'localized-scene',
    prompt,
    inputLabel: { default: 'Process name', key: 'science.process.input' },
    evidenceClaim: { claimId: 'process', description: 'Names the process' },
    graderId: 'kitabu.sealed-process',
  });

  prompt.default = 'changed later';

  assert.equal(scene.prompt.default, 'Name the process');
  assert.equal(scene.props.mode, 'short-text');
  assert.equal(scene.props.normalization.allowThousandsSeparators, false);
});
