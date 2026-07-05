import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveQuizBankSubjectIds } from './quizBank.js';

test('resolves empty quiz-bank subject filters to no subject filter', () => {
  assert.equal(resolveQuizBankSubjectIds(null), null);
  assert.equal(resolveQuizBankSubjectIds(''), null);
  assert.equal(resolveQuizBankSubjectIds('   '), null);
});

test('resolves legacy dashboard subject ids to canonical quiz-bank subjects', () => {
  assert.deepEqual(resolveQuizBankSubjectIds('math'), ['mathematics']);
  assert.deepEqual(resolveQuizBankSubjectIds('social'), ['social_studies']);
  assert.deepEqual(resolveQuizBankSubjectIds('science'), [
    'science_technology',
    'integrated_science',
    'general_science',
    'science'
  ]);
  assert.deepEqual(resolveQuizBankSubjectIds('creative_arts'), ['creative_arts', 'creative_arts_sports']);
});

test('keeps canonical quiz-bank subject ids intact', () => {
  assert.deepEqual(resolveQuizBankSubjectIds('english'), ['english']);
  assert.deepEqual(resolveQuizBankSubjectIds('pre_technical_studies'), ['pre_technical_studies']);
});

