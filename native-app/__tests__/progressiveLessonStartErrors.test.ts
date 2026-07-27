jest.mock('../src/services/requestHelpers', () => {
  const actual = jest.requireActual('../src/services/requestHelpers');
  return { ...actual, apiJsonRequest: jest.fn() };
});

jest.mock(
  '../src/features/progressiveLearning/api/offlineLearningStore',
  () => ({
    cacheLessonStart: jest.fn(async () => undefined),
    enqueueCheck: jest.fn(async () => undefined),
    loadCachedLessonStart: jest.fn(async () => null),
    loadQueuedChecks: jest.fn(async () => []),
    replaceQueuedChecks: jest.fn(async () => undefined),
  }),
);

import {
  ApiRequestError,
  apiJsonRequest,
} from '../src/services/requestHelpers';
import {
  normalizeLessonStartError,
  startProgressiveLesson,
} from '../src/features/progressiveLearning/api/progressiveLearningService';
import { loadCachedLessonStart } from '../src/features/progressiveLearning/api/offlineLearningStore';
import { getLessonStartErrorPresentation } from '../src/features/progressiveLearning/model/lessonStartErrorPresentation';

const request = apiJsonRequest as jest.Mock;
const loadCached = loadCachedLessonStart as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

test.each([
  [
    'LESSON_VERSION_STALE',
    409,
    'LESSON_VERSION_STALE',
    'A lesson update is ready',
  ],
  [
    'PREREQUISITE_LOCKED',
    423,
    'PREREQUISITE_LOCKED',
    'This lesson is still locked',
  ],
  [
    'MISSION_NOT_PUBLISHED',
    404,
    'MISSION_NOT_PUBLISHED',
    'This lesson is coming soon',
  ],
  ['LESSON_NOT_IN_PATH', 404, 'LESSON_NOT_FOUND', 'This lesson has moved'],
  ['AUTH_REQUIRED', 401, 'AUTH_REQUIRED', 'Let’s sign in again'],
] as const)(
  'maps API code %s to a stable lesson-start state',
  (apiCode, status, expectedCode, expectedTitle) => {
    const error = normalizeLessonStartError(
      new ApiRequestError({
        code: apiCode,
        message: 'Server detail that should not be shown directly.',
        status,
      }),
    );

    expect(error.code).toBe(expectedCode);
    expect(getLessonStartErrorPresentation(error).title).toBe(expectedTitle);
  },
);

test('does not hide semantic lesson failures behind an offline cache entry', async () => {
  request.mockRejectedValue(
    new ApiRequestError({
      code: 'LESSON_NOT_IN_PATH',
      message: 'Lesson not found in this learning path',
      status: 404,
    }),
  );
  loadCached.mockResolvedValue({ attemptId: 'stale-attempt' });

  await expect(
    startProgressiveLesson({
      clientAttemptId: 'client-attempt',
      lessonKey: 'math:g1:1.1:outcome-1',
      lessonVersion: 1,
      grade: 'Grade 1',
    }),
  ).rejects.toMatchObject({ code: 'LESSON_NOT_FOUND' });
  expect(loadCached).not.toHaveBeenCalled();
});

test('uses the matching cached lesson only when the network is unavailable', async () => {
  const cached = {
    attemptId: 'cached-attempt',
    status: 'in_progress',
    currentStepId: null,
    lesson: { lessonKey: 'math:g1:1.1:outcome-1' },
  };
  request.mockRejectedValue(
    new ApiRequestError({
      code: 'NETWORK_UNAVAILABLE',
      message: 'Unable to connect',
    }),
  );
  loadCached.mockResolvedValue(cached);

  await expect(
    startProgressiveLesson({
      clientAttemptId: 'client-attempt',
      lessonKey: 'math:g1:1.1:outcome-1',
      lessonVersion: 1,
      grade: 'Grade 1',
    }),
  ).resolves.toBe(cached);
  expect(loadCached).toHaveBeenCalledWith('math:g1:1.1:outcome-1:1');
});
