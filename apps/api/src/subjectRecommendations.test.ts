import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSubjectRecommendations,
  isExactSubjectSelection,
  requiredSubjectCountForGrade,
} from './subjectRecommendations.js';

const onboardingSubjects = [
  { subjectId: 'math', subjectName: 'Mathematics' },
  { subjectId: 'english', subjectName: 'English' },
  { subjectId: 'science', subjectName: 'Science' },
  { subjectId: 'kiswahili', subjectName: 'Kiswahili' },
  { subjectId: 'social', subjectName: 'Social Studies' }
];

test('uses the learner subject-count contract at grade boundaries', () => {
  assert.deepEqual(
    ['Grade 1', 'Grade 3', 'Grade 4', 'Grade 6', 'Grade 7', 'Grade 9', 'Grade 10', 'Grade 12']
      .map(grade => requiredSubjectCountForGrade(grade)),
    [7, 7, 8, 8, 9, 9, 7, 7],
  );
  assert.equal(requiredSubjectCountForGrade('not-a-grade'), 5);
  assert.equal(isExactSubjectSelection('Grade 1', Array.from({ length: 7 }, (_, i) => `s-${i}`)), true);
  assert.equal(isExactSubjectSelection('Grade 1', ['s-1', 's-1', 's-2', 's-3', 's-4', 's-5', 's-6']), false);
  assert.equal(isExactSubjectSelection('Grade 1', undefined), false);
});

test('keeps all seven saved subjects in a Grade 10 dashboard recommendation', () => {
  const saved = Array.from({ length: 7 }, (_, index) => ({
    subjectId: `subject-${index + 1}`,
    subjectName: `Subject ${index + 1}`,
  }));
  const result = buildSubjectRecommendations({
    userId: 'learner-1',
    dateKey: '2026-07-16',
    grade: 'Grade 10',
    onboardingSubjects: saved,
    manualSubjectIds: [],
    mode: 'automatic',
    personalSelections: {},
    gradeSelections: {},
    cohortUserCount: 0,
    assignmentPerformance: [],
  });

  assert.deepEqual(result.dashboard.map(item => item.subjectId), saved.map(item => item.subjectId));
});

test('uses onboarding subjects in their saved order when signals are insufficient', () => {
  const result = buildSubjectRecommendations({
    userId: 'learner-1',
    dateKey: '2026-07-16',
    onboardingSubjects,
    manualSubjectIds: [],
    mode: 'automatic',
    personalSelections: {},
    gradeSelections: {},
    cohortUserCount: 0,
    assignmentPerformance: []
  });

  assert.equal(result.insufficientData, true);
  assert.deepEqual(result.dashboard.map(item => item.subjectId), onboardingSubjects.map(item => item.subjectId));
  assert.deepEqual(result.chat.map(item => item.subjectId), ['math', 'english', 'science', 'kiswahili']);
});

test('reserves the last card for the lowest reliable assignment average', () => {
  const result = buildSubjectRecommendations({
    userId: 'learner-1',
    dateKey: '2026-07-16',
    onboardingSubjects,
    manualSubjectIds: [],
    mode: 'automatic',
    personalSelections: { math: 8, english: 4, science: 2 },
    gradeSelections: {},
    cohortUserCount: 0,
    assignmentPerformance: [
      { subjectId: 'social', averageScore: 42, gradedCount: 2 },
      { subjectId: 'math', averageScore: 70, gradedCount: 3 }
    ]
  });

  assert.equal(result.chat.at(-1)?.subjectId, 'social');
  assert.equal(result.dashboard.at(-1)?.subjectId, 'social');
  assert.equal(result.dashboard.at(-1)?.reason, 'lowest_assignment_average');
});

test('keeps five manually selected subjects as the eligible set', () => {
  const result = buildSubjectRecommendations({
    userId: 'learner-1',
    dateKey: '2026-07-16',
    onboardingSubjects,
    manualSubjectIds: ['social', 'science', 'english', 'math', 'agriculture'],
    mode: 'manual',
    personalSelections: {},
    gradeSelections: {},
    cohortUserCount: 0,
    assignmentPerformance: []
  });

  assert.equal(result.mode, 'manual');
  assert.deepEqual(result.dashboard.map(item => item.subjectId), [
    'social', 'science', 'english', 'math', 'agriculture'
  ]);
});
