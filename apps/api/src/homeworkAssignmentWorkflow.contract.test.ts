import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveQuizBankSubjectIds } from './quizBank.js';

const root = join(import.meta.dirname, '..');
const server = readFileSync(join(root, 'src', 'server.ts'), 'utf8');
const repositories = readFileSync(join(root, 'src', 'repositories.ts'), 'utf8');
const migration = readFileSync(join(root, 'sql', '107_homework_quizbank_workflow.sql'), 'utf8');

test('homework workflow has server-owned draft and append-only usage storage', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS homework_assignment_drafts/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS assignment_question_usage/);
  assert.match(migration, /UNIQUE \(author_user_id, quiz_bank_question_id\)/);
  assert.match(repositories, /publishHomeworkAssignmentDraft/);
  assert.match(repositories, /pg_advisory_xact_lock\(hashtext\(\$1\)\)/);
});

test('draft generation selects homework QuizBank questions and computes only the exact deficit', () => {
  assert.match(repositories, /q\.feature_tags \? 'homework'/);
  assert.match(repositories, /NOT EXISTS \([\s\S]*assignment_question_usage used/);
  assert.match(server, /const deficit = body\.requestedCount - bank\.length/);
  assert.match(server, /questionCount: deficit/);
});

test('draft generation canonicalizes display subjects and queries every bank alias', () => {
  assert.deepEqual(resolveQuizBankSubjectIds('social_studies'), ['social_studies']);
  assert.deepEqual(resolveQuizBankSubjectIds('science'), ['science_technology', 'integrated_science', 'general_science', 'science']);
  assert.match(server, /normalizedSubjectId = body\.subject\.trim\(\)\.toLowerCase\(\)/);
  assert.match(server, /subjectIds/);
  assert.match(repositories, /q\.subject_id = ANY\(\$4::text\[\]\)/);
  assert.match(repositories, /draft\.subject_id/);
});

test('students receive a public question projection and submissions are server graded', () => {
  assert.match(server, /questions: item\.questions\.map\(question => \(\{/);
  assert.match(server, /options: question\.options \?\? \[\]/);
  assert.match(repositories, /const gradedAnswers = assignment\.questions\.map/);
  assert.match(repositories, /const score = assignment\.questions\.length/);
  assert.match(repositories, /JSON\.stringify\(gradedAnswers\)/);
  assert.match(repositories, /submittedAnswer: answer/);
  assert.match(server, /grading: submission\.grading/);
});

test('native scored view treats the server score as a percentage', () => {
  const nativeQuiz = readFileSync(join(root, '..', '..', 'native-app', 'src', 'screens', 'HomeworkQuizScreen.tsx'), 'utf8');
  assert.match(nativeQuiz, /const percentage = Math\.round\(score\)/);
  assert.match(nativeQuiz, /You scored \{percentage\}%/);
});

test('reviewed edits are validated, persisted privately, and published as the exact snapshot', () => {
  assert.match(repositories, /validateHomeworkDraftEdits/);
  assert.match(repositories, /ai_candidates = \$6::jsonb/);
  assert.match(repositories, /input\.questions/);
  assert.match(server, /questions: z\.array\(homeworkDraftQuestionEditSchema\)/);
});

test('publication records creator-scoped ownership even when another staff user publishes', () => {
  assert.match(repositories, /draft\.author_user_id, title, description/);
  assert.match(repositories, /draft\.author_user_id, question\.bankId/);
});

test('legacy arbitrary-key publish route is retired', () => {
  assert.match(server, /Direct assignment publishing has been retired/);
  assert.match(repositories, /Every AI candidate must be explicitly approved before publishing/);
});

test('draft and publish routes enforce staff roles and class ownership', () => {
  assert.match(server, /app\.post\('\/teacher\/assignment-drafts'/);
  assert.match(server, /requireRoles\(request, reply, \['teacher', 'school_admin', 'platform_admin'\]\)/);
  assert.match(server, /class_teachers WHERE class_id = \$1 AND teacher_id = \$2/);
  assert.match(server, /app\.get\('\/teacher\/classes'/);
  assert.match(server, /if \(!request\.user!\.schoolId\) return \{ classes: \[\] \};/);
  assert.match(server, /onCreated: \(transactionClient, created\) => createAuditLog/);
});
