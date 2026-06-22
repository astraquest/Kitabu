import { apiRequest } from './apiClient';

export type SubjectEngagementFeature = 'lets_learn' | 'library' | 'take_quiz' | 'quizme';

export async function recordSubjectEngagement(input: {
  grade: string;
  subjectId: string;
  subjectName: string;
  feature: SubjectEngagementFeature;
  eventType?: string;
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
}) {
  return apiRequest<{ accepted: boolean }>('/analytics/subject-engagement', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      eventType: input.eventType ?? 'interaction',
      durationSeconds: input.durationSeconds ?? 0,
      metadata: input.metadata ?? {},
    }),
  });
}
