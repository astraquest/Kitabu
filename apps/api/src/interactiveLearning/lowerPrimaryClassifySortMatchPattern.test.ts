import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateLowerPrimaryInteraction,
  isLowerPrimaryInteractionDefinition,
  type LowerPrimaryInteractionDefinition,
} from './lowerPrimaryClassifySortMatchPattern.js';

const definition: LowerPrimaryInteractionDefinition = {
  mode: 'classify',
  expected: { mango: 'fruit', carrot: 'vegetable' },
  feedback: 'Yes! You put each food in the right group.',
  retryHint: 'Look at one food at a time, then try again.',
};

test('grades an exact lower-primary classification response', () => {
  assert.deepEqual(evaluateLowerPrimaryInteraction(definition, { mango: 'fruit', carrot: 'vegetable' }), {
    correct: true,
    answeredCount: 2,
    expectedCount: 2,
    feedback: definition.feedback,
  });
});

test('requires every item and returns a gentle retry hint', () => {
  const result = evaluateLowerPrimaryInteraction(definition, { mango: 'fruit' });
  assert.equal(result.correct, false);
  assert.equal(result.answeredCount, 1);
  assert.equal(result.retryHint, definition.retryHint);
});

test('accepts only complete authored lower-primary interaction definitions', () => {
  assert.equal(isLowerPrimaryInteractionDefinition(definition), true);
  assert.equal(isLowerPrimaryInteractionDefinition({ ...definition, mode: 'ranked-list' }), false);
  assert.equal(isLowerPrimaryInteractionDefinition({ ...definition, expected: {} }), false);
});

test('supports every Grade 1 concrete-object mode', () => {
  const cases: Array<[LowerPrimaryInteractionDefinition['mode'], Record<string, string | number>]> = [
    ['classify', { button: 'round', book: 'rectangle' }],
    ['sort', { shortStick: 1, longStick: 2 }],
    ['match', { sockOne: 'sockTwo', gloveOne: 'gloveTwo' }],
    ['pattern', { blankOne: 'red-circle', blankTwo: 'blue-square' }],
  ];

  for (const [mode, expected] of cases) {
    const interaction = { ...definition, mode, expected };
    assert.equal(isLowerPrimaryInteractionDefinition(interaction), true, `${mode} should validate`);
    assert.equal(evaluateLowerPrimaryInteraction(interaction, expected).correct, true, `${mode} should grade`);
  }
});

test('rejects an answer with extra items', () => {
  const result = evaluateLowerPrimaryInteraction(definition, {
    mango: 'fruit', carrot: 'vegetable', banana: 'fruit',
  });
  assert.equal(result.correct, false);
  assert.equal(result.feedback, definition.retryHint);
});
