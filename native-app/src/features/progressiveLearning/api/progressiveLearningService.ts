import * as Crypto from 'expo-crypto';

import { apiJsonRequest } from '../../../services/requestHelpers';
import type {
  ProgressiveCompletionResult,
  ProgressiveLesson,
  ProgressiveStepResult,
  SubjectLearningPath,
} from '../types';
import { cacheLessonStart, enqueueCheck, loadCachedLessonStart, loadQueuedChecks, replaceQueuedChecks } from './offlineLearningStore';

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
    const result = await apiJsonRequest<StartResult>('/learning/lesson-attempts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    await cacheLessonStart(cacheKey, result).catch(() => undefined);
    flushQueuedProgressiveChecks().catch(() => undefined);
    return result;
  } catch (error) {
    const cached = await loadCachedLessonStart<StartResult>(cacheKey);
    if (cached) return cached;
    throw error;
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
  const endpoint = `/learning/lesson-attempts/${encodeURIComponent(input.attemptId)}/steps/${encodeURIComponent(input.stepId)}/check`;
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
    await enqueueCheck({ endpoint, body, clientEventId }).catch(() => undefined);
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
