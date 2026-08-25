import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoSource = await readFile(new URL('./repositories.ts', import.meta.url), 'utf8');
const serverSource = await readFile(new URL('./server.ts', import.meta.url), 'utf8');
const migrationSource = await readFile(new URL('../sql/106_quiz_me_sessions.sql', import.meta.url), 'utf8');
const importerSource = await readFile(new URL('../scripts/quiz-bank/import-quiz-bank.mjs', import.meta.url), 'utf8');

test('QuizMe persistence records served questions and immutable answers', () => {
  assert.match(migrationSource, /quiz_me_session_questions/);
  assert.match(migrationSource, /UNIQUE \(session_id, session_question_id\)/);
  assert.match(repoSource, /a\.is_correct = TRUE/);
  assert.match(repoSource, /INTERVAL '24 hours'/);
  assert.match(repoSource, /ON CONFLICT \(session_id, session_question_id\) DO NOTHING/);
});

test('QuizMe generation is persisted before the session response and initial payload is safe', () => {
  assert.match(serverSource, /insertQuizMeGeneratedQuestions\(client/);
  assert.match(serverSource, /questions: questions\.map\(serializeQuizMeQuestion\)/);
  const serializerStart = serverSource.indexOf('function serializeQuizMeQuestion');
  const serializerEnd = serverSource.indexOf('function findDiagnosticQuestion', serializerStart);
  const serializerSource = serverSource.slice(serializerStart, serializerEnd);
  assert.doesNotMatch(serializerSource, /correctAnswer|correct_answer|explanation/);
  assert.match(serverSource, /return \{ sessionQuestionId: params\.questionId, isCorrect: answer\.is_correct, score: answer\.score, feedback: answer\.feedback, correctAnswer: question\.correct_answer/);
  assert.match(serverSource, /feature: 'quiz_generation'/);
});

test('QuizMe start is idempotent by authenticated user and client session id', () => {
  assert.match(migrationSource, /UNIQUE \(user_id, client_session_id\)/);
  assert.match(serverSource, /findQuizMeSessionByClientId\(request\.user!\.id, body\.clientSessionId\)/);
});

test('QuizBank importer protects AI rows without leaking the predicate into TTS SQL', () => {
  const ttsSection = importerSource.slice(importerSource.indexOf('async function enqueueQuestionTts'), importerSource.indexOf('async function importFile'));
  assert.doesNotMatch(ttsSection, /quiz_bank_questions/);
  const quizBankUpsert = importerSource.slice(importerSource.indexOf('INSERT INTO quiz_bank_questions'), importerSource.indexOf('const manifest ='));
  assert.match(quizBankUpsert, /DO UPDATE SET[\s\S]*WHERE quiz_bank_questions\.source <> 'quizme-ai'/);
  assert.match(quizBankUpsert, /AND quiz_bank_questions\.source <> 'assignment-ai'/);
});

test('QuizMe generated inserts recheck canonical prompt identity inside the advisory lock', () => {
  assert.match(repoSource, /pg_advisory_xact_lock\(hashtext\(\$1\)\)/);
  assert.match(repoSource, /q\.source = 'quizme-ai'[\s\S]*regexp_replace\(lower\(btrim\(q\.prompt\)\)/);
  assert.match(repoSource, /if \(duplicate\.rows\[0\]\) \{[\s\S]*inserted\.push\(duplicate\.rows\[0\]\.id\)/);
});
