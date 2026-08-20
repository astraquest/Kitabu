import { buildLearningCompletionEvent } from '../src/services/learningAnalytics';

test('builds a minimized completion event from an authoritative ID', () => {
  expect(buildLearningCompletionEvent({
    completionId: 'attempt-123',
    subject: 'Mathematics',
    grade: 'Grade 6',
    durationSeconds: 91.4,
    completed: true,
    score: 99,
    answers: ['secret answer'],
  } as never)).toEqual({
    onceKey: 'learning:attempt-123',
    properties: {
      subject: 'Mathematics',
      grade: 'Grade 6',
      duration_seconds: 91,
      completed: true,
    },
  });
});

test('does not create a completion event without a confirmed ID or success', () => {
  expect(buildLearningCompletionEvent({ completionId: 'attempt-123', completed: false })).toBeNull();
  expect(buildLearningCompletionEvent({ completionId: null, completed: true })).toBeNull();
});

test('drops invalid duration values and never forwards answer or score fields', () => {
  const event = buildLearningCompletionEvent({
    completionId: 'lesson-123',
    subject: 'Science',
    grade: 'Grade 9',
    durationSeconds: 999_999,
    completed: true,
  });
  expect(event?.properties).toEqual({ subject: 'Science', grade: 'Grade 9', completed: true });
  expect(event?.properties).not.toHaveProperty('answers');
  expect(event?.properties).not.toHaveProperty('score');
});
