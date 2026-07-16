import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSubjectRecommendations } from './subjectRecommendations.js';

const onboardingSubjects = [
  { subjectId: 'math', subjectName: 'Mathematics' },
  { subjectId: 'english', subjectName: 'English' },
  { subjectId: 'science', subjectName: 'Science' },
  { subjectId: 'kiswahili', subjectName: 'Kiswahili' },
  { subjectId: 'social', subjectName: 'Social Studies' }
];

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
