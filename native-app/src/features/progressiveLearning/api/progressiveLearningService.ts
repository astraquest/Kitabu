import * as Crypto from 'expo-crypto';

import {
  ApiRequestError,
  apiJsonRequest,
} from '../../../services/requestHelpers';
import type {
  ProgressiveCompletionResult,
  ProgressiveLesson,
  ProgressiveStepResult,
  SubjectLearningPath,
} from '../types';
import {
  cacheLessonStart,
  enqueueCheck,
  loadCachedLessonStart,
  loadQueuedChecks,
  replaceQueuedChecks,
} from './offlineLearningStore';

export type LessonStartErrorCode =
  | 'AUTH_REQUIRED'
  | 'LESSON_NOT_FOUND'
  | 'LESSON_VERSION_STALE'
  | 'MISSION_NOT_PUBLISHED'
  | 'NETWORK_UNAVAILABLE'
  | 'PREREQUISITE_LOCKED'
  | 'SERVICE_UNAVAILABLE'
  | 'UNKNOWN';

export class LessonStartError extends Error {
  readonly code: LessonStartErrorCode;
  readonly retryable: boolean;
  readonly status: number | null;

  constructor(input: {
    code: LessonStartErrorCode;
    message: string;
    retryable?: boolean;
    status?: number | null;
  }) {
    super(input.message);
    this.name = 'LessonStartError';
    this.code = input.code;
    this.retryable = input.retryable ?? false;
    this.status = input.status ?? null;
    Object.setPrototypeOf(this, LessonStartError.prototype);
  }
}

const LESSON_START_MESSAGES: Record<LessonStartErrorCode, string> = {
  AUTH_REQUIRED: 'Please sign in again to continue learning.',
  LESSON_NOT_FOUND:
    'This lesson is no longer available. Return to the learning path for the latest lesson.',
  LESSON_VERSION_STALE:
    'This lesson has been updated. Return to the learning path to open the new version.',
  MISSION_NOT_PUBLISHED:
    'This lesson is still being prepared. Choose another lesson for now.',
  NETWORK_UNAVAILABLE:
    'We could not connect to Kitabu. Check your connection and try again.',
  PREREQUISITE_LOCKED: 'Finish the lesson before this one to unlock it.',
  SERVICE_UNAVAILABLE:
    'Kitabu is taking a little longer than usual. Please try again.',
  UNKNOWN: 'We could not start this lesson. Please try again.',
};

function matchesAny(value: string, candidates: string[]) {
  return candidates.some(candidate => value.includes(candidate));
}

export function normalizeLessonStartError(error: unknown): LessonStartError {
  if (error instanceof LessonStartError) return error;

  const apiError = error instanceof ApiRequestError ? error : null;
  const rawCode = apiError?.code?.trim().toUpperCase() ?? '';
  const rawMessage = error instanceof Error ? error.message.toLowerCase() : '';
  const status = apiError?.status ?? null;
  let code: LessonStartErrorCode = 'UNKNOWN';

  if (
    status === 401 ||
    status === 403 ||
    matchesAny(rawCode, [
      'AUTH_REQUIRED',
      'AUTHENTICATION_REQUIRED',
      'UNAUTHORIZED',
    ])
  ) {
    code = 'AUTH_REQUIRED';
  } else if (
    matchesAny(rawCode, [
      'LESSON_VERSION_STALE',
      'STALE_LESSON_VERSION',
      'CONTENT_VERSION_STALE',
    ]) ||
    (status === 409 && matchesAny(rawMessage, ['version', 'updated', 'stale']))
  ) {
    code = 'LESSON_VERSION_STALE';
  } else if (
    matchesAny(rawCode, [
      'PREREQUISITE_LOCKED',
      'LESSON_LOCKED',
      'MISSION_LOCKED',
    ]) ||
    status === 423 ||
    matchesAny(rawMessage, ['prerequisite', 'lesson is locked'])
  ) {
    code = 'PREREQUISITE_LOCKED';
  } else if (
    matchesAny(rawCode, [
      'MISSION_NOT_PUBLISHED',
      'LESSON_NOT_PUBLISHED',
      'CONTENT_NOT_PUBLISHED',
    ]) ||
    matchesAny(rawMessage, ['not published', 'still being prepared'])
  ) {
    code = 'MISSION_NOT_PUBLISHED';
  } else if (
    matchesAny(rawCode, [
      'LESSON_NOT_FOUND',
      'LESSON_NOT_IN_PATH',
      'MISSION_NOT_FOUND',
    ]) ||
    status === 404 ||
    matchesAny(rawMessage, ['lesson not found', 'mission not found'])
  ) {
    code = 'LESSON_NOT_FOUND';
  } else if (
    rawCode === 'NETWORK_UNAVAILABLE' ||
    (!apiError &&
      matchesAny(rawMessage, ['network request failed', 'failed to fetch']))
  ) {
    code = 'NETWORK_UNAVAILABLE';
  } else if (
    (status !== null && status >= 500) ||
    matchesAny(rawCode, ['SERVICE_UNAVAILABLE', 'UPSTREAM_UNAVAILABLE'])
  ) {
    code = 'SERVICE_UNAVAILABLE';
  }

  return new LessonStartError({
    code,
    message: LESSON_START_MESSAGES[code],
    retryable:
      code === 'NETWORK_UNAVAILABLE' ||
      code === 'SERVICE_UNAVAILABLE' ||
      code === 'UNKNOWN',
    status,
  });
}

export function createProgressiveClientId() {
  return Crypto.randomUUID();
}

export async function getSubjectLearningPath(grade: string, subjectId: string) {
  const query = new URLSearchParams({ grade });
  return apiJsonRequest<SubjectLearningPath>(
    `/learning-paths/${encodeURIComponent(subjectId)}?${query.toString()}`,
    { method: 'GET' },
  );
}

export async function getProgressiveLesson(lessonKey: string) {
  return apiJsonRequest<{ lesson: ProgressiveLesson }>(
    `/learning/lessons/${encodeURIComponent(lessonKey)}`,
    { method: 'GET' },
  );
}

export async function startProgressiveLesson(input: {
  clientAttemptId: string;
  lessonKey: string;
  lessonVersion: number;
  grade: string;
}) {
  type StartResult = {
    attemptId: string;
    status: string;
    currentStepId: string | null;
    lesson: ProgressiveLesson;
  };
  const cacheKey = `${input.lessonKey}:${input.lessonVersion}`;
  try {
    const result = await apiJsonRequest<StartResult>(
      '/learning/lesson-attempts',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
    await cacheLessonStart(cacheKey, result).catch(() => undefined);
    flushQueuedProgressiveChecks().catch(() => undefined);
    return result;
  } catch (error) {
    const lessonError = normalizeLessonStartError(error);
    if (
      lessonError.code === 'NETWORK_UNAVAILABLE' ||
      lessonError.code === 'SERVICE_UNAVAILABLE'
    ) {
      const cached = await loadCachedLessonStart<StartResult>(cacheKey);
      if (cached) return cached;
    }
    throw lessonError;
  }
}

export async function flushQueuedProgressiveChecks() {
  const queue = await loadQueuedChecks();
  if (queue.length === 0) return;
  const remaining = [] as typeof queue;
  for (const item of queue) {
    try {
      await apiJsonRequest(item.endpoint, { method: 'POST', body: item.body });
    } catch {
      remaining.push(item);
    }
  }
  await replaceQueuedChecks(remaining);
}

export async function checkProgressiveLessonStep(input: {
  attemptId: string;
  stepId: string;
  response: string;
  responseLatencyMs: number;
}) {
  const clientEventId = createProgressiveClientId();
  const endpoint = `/learning/lesson-attempts/${encodeURIComponent(
    input.attemptId,
  )}/steps/${encodeURIComponent(input.stepId)}/check`;
  const body = JSON.stringify({
    clientEventId,
    response: input.response,
    responseLatencyMs: input.responseLatencyMs,
  });
  try {
    return await apiJsonRequest<ProgressiveStepResult>(endpoint, {
      method: 'POST',
      body,
    });
  } catch (error) {
    await enqueueCheck({ endpoint, body, clientEventId }).catch(
      () => undefined,
    );
    throw error;
  }
}

export async function completeProgressiveLesson(attemptId: string) {
  return apiJsonRequest<ProgressiveCompletionResult>(
    `/learning/lesson-attempts/${encodeURIComponent(attemptId)}/complete`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}
