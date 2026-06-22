import { CurriculumSubjectBundle, LearningStrand, Question } from '../types/app';
import { apiJsonRequest } from './requestHelpers';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiJsonRequest<T>(path, options);
}

export async function getCurriculumForGrade(grade: string, subjectId?: string) {
  const query = new URLSearchParams({ grade });
  if (subjectId) {
    query.set('subjectId', subjectId);
  }

  return apiRequest<{ grade: string; subjects: CurriculumSubjectBundle[] }>(
    `/curriculum?${query.toString()}`,
    { method: 'GET' },
  );
}

export async function saveCurriculumSubject(input: {
  grade: string;
  subjectId: string;
  subjectName: string;
  strands: LearningStrand[];
}) {
  return apiRequest<{ grade: string; subjects: CurriculumSubjectBundle[] }>(
    `/curriculum/subjects/${encodeURIComponent(input.subjectId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        grade: input.grade,
        subjectName: input.subjectName,
        strands: input.strands.map(strand => ({
          number: strand.number,
          title: strand.title,
          subTitle: strand.subTitle,
          subStrands: strand.subStrands.map(subStrand => ({
            number: subStrand.number,
            title: subStrand.title,
            type: subStrand.type,
            description: subStrand.description,
            pages: subStrand.pages,
            outcomes: subStrand.outcomes ?? [],
            inquiryQuestions: subStrand.inquiryQuestions ?? [],
          })),
        })),
      }),
    },
  );
}

export async function importCurriculumPdf(input: {
  grade: string;
  subjectId: string;
  subjectName: string;
  fileName?: string;
  mimeType?: string;
  base64Data: string;
}) {
  return apiRequest<{ grade: string; subjects: CurriculumSubjectBundle[] }>(
    '/curriculum/import/pdf',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function getSubStrandLesson(subStrandId: string) {
  return apiRequest<{
    subStrandId: string;
    pages: Array<{ title: string; content: string }>;
  }>(`/curriculum/sub-strands/${subStrandId}/lesson`, {
    method: 'POST',
  });
}

export async function generateSubStrandQuiz(subStrandId: string, questionCount = 10) {
  return apiRequest<{
    subStrandId: string;
    questions: Question[];
  }>(`/curriculum/sub-strands/${subStrandId}/quiz`, {
    method: 'POST',
    body: JSON.stringify({ questionCount }),
  });
}

export async function completeSubStrandLearning(subStrandId: string, quizScore?: number, durationSeconds?: number) {
  return apiRequest<{
    completed: boolean;
    needsRemediation: boolean;
    masteryScore: number;
    unlockThreshold: number;
    subStrandId: string;
    grade: string;
    subjectId: string;
  }>(`/curriculum/sub-strands/${subStrandId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ quizScore, durationSeconds }),
  });
}
