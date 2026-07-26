import assert from 'node:assert/strict';
import test from 'node:test';
import { GRADE_6_WHOLE_NUMBERS_SCENE } from './grade6WholeNumbersScene.js';

test('provides the executable Grade 6 whole-numbers structured-response scene', () => {
  const scene = GRADE_6_WHOLE_NUMBERS_SCENE;

  assert.equal(scene.identity.sceneId, 'ken.cbc.g6.math.whole-numbers.total-value.diagnostic-1');
  assert.deepEqual(scene.component, {
    componentId: 'structured-response',
    componentVersion: '1.0.0',
  });
  assert.equal(scene.props.mode, 'numeric');
  assert.equal(scene.props.normalization.locale, 'en-KE');
  assert.equal(scene.props.accessibility.inputLabel.default, 'Total value of the digit 7 in 3,742,815');
  assert.equal(scene.grader.graderId, 'kitabu.sealed-numeric-answer');
  assert.equal(scene.attemptPolicy.revealAnswer, 'never');
});

test('does not expose an answer or grading rule in the learner scene payload', () => {
  const payload = JSON.stringify(GRADE_6_WHOLE_NUMBERS_SCENE);

  assert.doesNotMatch(payload, /"(?:answer|correctAnswer|expectedAnswer|gradingRules?)"\s*:/i);
  assert.doesNotMatch(payload, /700000/);
});
