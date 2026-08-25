import assert from 'node:assert/strict';
import test from 'node:test';
import { parseQuizMeGeneratedQuestions, quizMeQuestionKey } from './quizMe.js';

test('QuizMe validation requires the exact deficit and rejects malformed options', () => {
  const valid = JSON.stringify({ questions: [{ type: 'MCQ', text: '  Which is a mammal? ', options: ['Cat', 'Rock'], correctAnswer: 'Cat', explanation: 'A cat is a mammal.' }] });
  assert.equal(parseQuizMeGeneratedQuestions(valid, 2), null);
  assert.equal(parseQuizMeGeneratedQuestions(JSON.stringify({ questions: [{ type: 'MCQ', text: 'Which?', options: ['A', 'B'], correctAnswer: 'C', explanation: '' }] }), 1), null);
  assert.equal(parseQuizMeGeneratedQuestions(valid, 1)?.[0].prompt, 'Which is a mammal?');
});

test('QuizMe validation rejects duplicate prompts and preserves explicit essay handling', () => {
  const duplicate = JSON.stringify({ questions: [
    { type: 'SHORT_ANSWER', text: 'Name one planet', options: [], correctAnswer: 'Mars', explanation: '' },
    { type: 'SHORT_ANSWER', text: ' name   one planet ', options: [], correctAnswer: 'Venus', explanation: '' }
  ] });
  assert.equal(parseQuizMeGeneratedQuestions(duplicate, 2), null);
  const essay = JSON.stringify({ questions: [{ type: 'ESSAY', text: 'Explain photosynthesis.', options: [], correctAnswer: 'Plants make food using light.', explanation: 'Essay review is bounded.' }] });
  assert.equal(parseQuizMeGeneratedQuestions(essay, 1)?.[0].type, 'ESSAY');
});

test('QuizMe comparison normalization is deterministic for answer scoring', () => {
  assert.equal(quizMeQuestionKey('  True  '), 'true');
  assert.equal(quizMeQuestionKey('Short   answer'), 'short answer');
});
