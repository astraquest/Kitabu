import assert from 'node:assert/strict';
import test from 'node:test';

import { GRADE_6_WHOLE_NUMBERS_SCENE } from './grade6WholeNumbersScene.js';
import { buildStructuredResponseScene } from './sceneBuilder.js';

test('exposes the learner-facing structured-response scene contract', () => {
  const scene = GRADE_6_WHOLE_NUMBERS_SCENE;

  assert.equal(scene.identity.sceneId, 'ken.cbc.g6.math.whole-numbers.total-value.diagnostic-1');
  assert.equal(scene.purpose, 'assessment');
  assert.equal(scene.component.componentId, 'structured-response');
  assert.equal(scene.props.mode, 'numeric');
  assert.equal(scene.props.normalization.locale, 'en-KE');
  assert.deepEqual(scene.evidenceClaims.map(({ claimId }) => claimId), [
    'g6-math-whole-numbers-total-value',
  ]);
  assert.deepEqual(scene.completion.requiredClaimIds, [
    'g6-math-whole-numbers-total-value',
  ]);
  assert.deepEqual(scene.tutorPermissions, []);
  assert.equal(scene.attemptPolicy.revealAnswer, 'never');
});

test('keeps answers and private grader configuration out of public scenes', () => {
  const privateFields = {
    correctAnswer: 700_000,
    acceptedAnswers: ['700000', '700,000'],
    gradingConfig: { tolerance: 0 },
    graderConfig: { strategy: 'numeric' },
  };
  const scene = buildStructuredResponseScene({
    sceneId: 'public-contract-test',
    prompt: 'What is the value of the digit 7?',
    inputLabel: 'Enter the value',
    evidenceClaim: {
      claimId: 'place-value',
      description: 'Uses place value correctly',
    },
    graderId: 'kitabu.sealed-numeric-answer',
    mode: 'numeric',
    ...privateFields,
  });
  const payload = JSON.stringify(scene);

  assert.doesNotMatch(
    payload,
    /"(?:answer|answerKey|correctAnswer|expectedAnswer|acceptedAnswers|gradingConfig|graderConfig|gradingRules?)"\s*:/i,
  );
  assert.doesNotMatch(payload, /700[,.]?000/);
  assert.deepEqual(Object.keys(scene.grader).sort(), ['graderId', 'graderVersion', 'mode']);
});

test('pins public schema, component, and grader versions', () => {
  const builtScene = buildStructuredResponseScene({
    sceneId: 'version-contract-test',
    prompt: 'Respond with a number',
    inputLabel: 'Number',
    evidenceClaim: { claimId: 'numeric-response', description: 'Provides a number' },
    graderId: 'kitabu.sealed-numeric-answer',
    mode: 'numeric',
  });

  for (const scene of [GRADE_6_WHOLE_NUMBERS_SCENE, builtScene]) {
    assert.equal(scene.identity.schemaVersion, '1.0.1');
    assert.equal(scene.component.componentVersion, '1.0.0');
    assert.equal(scene.grader.graderVersion, '1.0.0');
  }
});
