import { Question } from '../types/app';
import { apiRequest } from './apiClient';

const SUBJECT_ID_ALIASES: Record<string, string> = {
  math: 'mathematics',
  social: 'social_studies',
  ai_education: 'computer_science',
  computer: 'computer_science',
};

export async function getQuizBankQuestions(input: {
  grade: string;
  subjectId?: string | null;
  limit?: number;
}) {
  const query = new URLSearchParams({
    grade: input.grade,
    limit: String(input.limit ?? 10),
  });

  if (input.subjectId) {
    query.set('subjectId', SUBJECT_ID_ALIASES[input.subjectId] ?? input.subjectId);
  }

  const payload = await apiRequest<{ questions: Question[] }>(`/quiz-bank?${query.toString()}`, {
    method: 'GET',
  });

  return payload.questions;
}
