import * as Crypto from 'expo-crypto';

import { apiJsonRequest } from '../../../services/requestHelpers';
import type {
  ProgressiveCompletionResult,
  ProgressiveLesson,
  ProgressiveStepResult,
  SubjectLearningPath,
} from '../types';

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
  return apiJsonRequest<{
    attemptId: string;
    status: string;
    currentStepId: string | null;
    lesson: ProgressiveLesson;
  }>('/learning/lesson-attempts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function checkProgressiveLessonStep(input: {
  attemptId: string;
  stepId: string;
  response: string;
  responseLatencyMs: number;
}) {
  return apiJsonRequest<ProgressiveStepResult>(
    `/learning/lesson-attempts/${encodeURIComponent(input.attemptId)}/steps/${encodeURIComponent(input.stepId)}/check`,
    {
      method: 'POST',
      body: JSON.stringify({
        clientEventId: createProgressiveClientId(),
        response: input.response,
        responseLatencyMs: input.responseLatencyMs,
      }),
    },
  );
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
