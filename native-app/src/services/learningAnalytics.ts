import {
  mobileAnalytics,
  normalizeGrade,
} from './mobileAnalytics';

export interface LearningCompletionInput {
  completionId?: string | null;
  subject?: string | null;
  grade?: string | null;
  durationSeconds?: number | null;
  completed?: boolean;
}

export interface LearningCompletionEvent {
  onceKey: string;
  properties: {
    subject?: string;
    grade?: string;
    duration_seconds?: number;
    completed: true;
  };
}

/** Builds the minimized completion payload only after a server-confirmed success. */
export function buildLearningCompletionEvent(
  input: LearningCompletionInput,
): LearningCompletionEvent | null {
  const completionId = typeof input.completionId === 'string' ? input.completionId.trim() : '';
  if (!completionId || input.completed !== true) {
    return null;
  }

  const properties: LearningCompletionEvent['properties'] = { completed: true };
  if (typeof input.subject === 'string' && input.subject.trim()) {
    properties.subject = input.subject.trim().slice(0, 120);
  }
  const grade = normalizeGrade(input.grade);
  if (grade) {
    properties.grade = grade;
  }
  if (
    typeof input.durationSeconds === 'number' &&
    Number.isFinite(input.durationSeconds) &&
    input.durationSeconds >= 0 &&
    input.durationSeconds <= 86_400
  ) {
    properties.duration_seconds = Math.round(input.durationSeconds);
  }

  return {
    onceKey: `learning:${completionId}`,
    properties,
  };
}

export async function trackLearningCompletion(input: LearningCompletionInput) {
  const event = buildLearningCompletionEvent(input);
  if (!event) {
    return false;
  }
  await mobileAnalytics.trackOnce('learning_session_completed', event.onceKey, event.properties);
  return true;
}
