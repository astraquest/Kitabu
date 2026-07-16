import { apiRequest } from './apiClient';

export type SubjectRecommendationReason =
  | 'onboarding_default'
  | 'manual_preference'
  | 'personal_affinity'
  | 'grade_popularity'
  | 'exploration'
  | 'lowest_assignment_average';

export interface SubjectRecommendationItem {
  subjectId: string;
  subjectName: string;
  position: number;
  reason: SubjectRecommendationReason;
}

export interface SubjectRecommendationPayload {
  recommendationId: string;
  strategyVersion: string;
  generatedAt: string;
  mode: 'automatic' | 'manual';
  insufficientData: boolean;
  chat: SubjectRecommendationItem[];
  dashboard: SubjectRecommendationItem[];
}

export async function getSubjectRecommendations(grade: string) {
  return apiRequest<SubjectRecommendationPayload>(
    `/me/subject-recommendations?grade=${encodeURIComponent(grade)}`,
    { method: 'GET' },
  );
}

export async function saveSubjectDisplayPreferences(
  subjectIds: string[],
  mode: 'automatic' | 'manual',
) {
  return apiRequest<{ saved: boolean }>('/me/subject-display-preferences', {
    method: 'PUT',
    body: JSON.stringify({ mode, subjectIds }),
  });
}

export async function recordSubjectRecommendationEvents(
  grade: string,
  events: Array<{
    recommendationId: string;
    surface: 'chat' | 'dashboard';
    eventType: 'impression' | 'selection';
    subjectId: string;
    subjectName: string;
    position: number;
    reason: SubjectRecommendationReason;
    strategyVersion: string;
  }>,
) {
  if (events.length === 0) return { accepted: true };

  return apiRequest<{ accepted: boolean }>('/me/subject-recommendation-events', {
    method: 'POST',
    body: JSON.stringify({ grade, events }),
  });
}
