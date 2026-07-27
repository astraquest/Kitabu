import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLowerPrimaryPracticeVariant, validateLowerPrimaryPracticeVariant } from './lowerPrimaryAi.js';

const validPictureChoice = {
  id: 'count-berries-2',
  mode: 'picture-choice',
  prompt: 'Choose the group with 4 berries.',
  choices: ['3', '4', '5'],
  answer: '4',
  feedback: 'Yes! That group has 4 berries.',
  retryHint: 'Touch and count each berry once.',
  progressionLevel: 3
};

test('accepts an allowed, deterministic Grade 1 practice variant', () => {
  const variant = validateLowerPrimaryPracticeVariant(validPictureChoice, {
    outcomeId: 'outcome-3',
    allowedModes: ['picture-choice'],
    maxValue: 10
  });

  assert.equal(variant.answer, '4');
});

test('rejects a picture choice whose answer is unavailable to the learner', () => {
  assert.throws(
    () => validateLowerPrimaryPracticeVariant({ ...validPictureChoice, choices: ['3', '5'] }, { outcomeId: 'outcome-3' }),
    /include its answer/
  );
});

test('rejects values beyond the outcome bound and repeated answers', () => {
  assert.throws(
    () => validateLowerPrimaryPracticeVariant({ ...validPictureChoice, initialValue: 12 }, { outcomeId: 'outcome-3', maxValue: 10 }),
    /exceeds the curriculum limit/
  );
  assert.throws(
    () => validateLowerPrimaryPracticeVariant(validPictureChoice, { outcomeId: 'outcome-3', recentAnswers: ['4'] }),
    /duplicates a recent attempt/
  );
});

test('keeps generated practice to runtime-ready modes and deterministic numeric targets', () => {
  assert.throws(
    () => validateLowerPrimaryPracticeVariant({ ...validPictureChoice, mode: 'trace-construct' }, { outcomeId: 'outcome-3' }),
    /not allowed/
  );
  assert.throws(
    () => validateLowerPrimaryPracticeVariant({ ...validPictureChoice, mode: 'number-manipulatives', target: 5 }, { outcomeId: 'outcome-3' }),
    /numeric target/
  );
});

test('parses JSON only after it meets the lower-primary safety gate', () => {
  const practice = parseLowerPrimaryPracticeVariant(JSON.stringify(validPictureChoice), { outcomeId: 'outcome-3' });
  assert.equal(practice.mode, 'picture-choice');
  assert.throws(() => parseLowerPrimaryPracticeVariant('not json', { outcomeId: 'outcome-3' }), /valid JSON/);
});
