import assert from 'node:assert/strict';
import test from 'node:test';

import { gradeStructuredResponse } from './structuredResponseGrader.js';

const graderRef = {
  graderId: 'kitabu.sealed-numeric-answer',
  graderVersion: '1.0.0'
};

test('grades equivalent whole-number representations deterministically', () => {
  for (const response of ['700000', '700,000', ' 700,000 ', 700000]) {
    assert.deepEqual(gradeStructuredResponse({ graderRef, response }), {
      accepted: true,
      isCorrect: true,
      misconceptionCode: null,
      message: 'Correct.'
    });
  }
});

test('accepts a valid incorrect response without revealing the sealed answer', () => {
  const result = gradeStructuredResponse({ graderRef, response: '70,000' });

  assert.deepEqual(result, {
    accepted: true,
    isCorrect: false,
    misconceptionCode: 'whole-number.place-value',
    message: 'Review the place value of the digit and try again.'
  });
  assert.equal(JSON.stringify(result).includes('700000'), false);
});

test('rejects blank and malformed responses', () => {
  assert.equal(gradeStructuredResponse({ graderRef, response: '  ' }).misconceptionCode, 'response.required');

  for (const response of ['700,00', '-700000', 'seven hundred thousand', 700000.5, null]) {
    const result = gradeStructuredResponse({ graderRef, response });
    assert.equal(result.accepted, false);
    assert.equal(result.misconceptionCode, 'response.invalid-whole-number');
  }
});

test('fails closed for an unknown opaque grader reference', () => {
  const result = gradeStructuredResponse({
    graderRef: { ...graderRef, graderVersion: '1.0.1' },
    response: '700000'
  });

  assert.deepEqual(result, {
    accepted: false,
    isCorrect: false,
    misconceptionCode: 'grader.unsupported',
    message: 'This response cannot be graded with the requested grader.'
  });
});
