import { CurriculumSubjectBundle, LearningStrand } from '../types/app';
import { apiJsonRequest } from './requestHelpers';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiJsonRequest<T>(path, options);
}

export async function getCurriculumForGrade(
  grade: string,
  subjectId?: string,
  scope?: { countryCode?: string; curriculumCode?: string },
) {
  const query = new URLSearchParams({ grade });
  if (subjectId) {
    query.set('subjectId', subjectId);
  }
  if (scope?.countryCode) {
    query.set('countryCode', scope.countryCode);
  }
  if (scope?.curriculumCode) {
    query.set('curriculumCode', scope.curriculumCode);
  }

  return apiRequest<{
    grade: string;
    countryCode: string;
    curriculumCode: string;
    subjects: CurriculumSubjectBundle[];
  }>(
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
