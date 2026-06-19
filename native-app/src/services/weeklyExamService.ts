import { WeeklyExamPayload } from '../types/app';
import { apiJsonRequest } from './requestHelpers';

export function getWeeklyExam() {
  return apiJsonRequest<WeeklyExamPayload>('/learning/weekly-exam');
}

export function startWeeklyExam(examId: string) {
  return apiJsonRequest<{ attempt: { id: string; status: 'in_progress' | 'completed'; startedAt: string } }>(
    `/learning/weekly-exam/${examId}/start`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export function submitWeeklyExam(
  examId: string,
  input: {
    attemptId: string;
    answers: Array<{ questionId: string; answer: string }>;
    timedOut?: boolean;
  },
) {
  return apiJsonRequest<Pick<WeeklyExamPayload, 'exam' | 'attempt'>>(
    `/learning/weekly-exam/${examId}/submit`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}
