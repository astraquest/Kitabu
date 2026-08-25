import {
  Assignment,
  StudentPerformance,
  StudentSubmission,
  SubmittedAssignment,
} from '../types/app';
import { apiRequest } from './apiClient';

export async function getTeacherStudents() {
  const payload = await apiRequest<{ students: StudentPerformance[] }>('/teacher/students', {
    method: 'GET',
  });
  return payload.students;
}

export async function getTeacherAssignments() {
  return apiRequest<{
    assignments: SubmittedAssignment[];
    submissionsByAssignment: Record<string, StudentSubmission[]>;
  }>('/teacher/assignments', {
    method: 'GET',
  });
}

export async function createTeacherAssignment(input: Omit<Assignment, 'id' | 'status'>) {
  return apiRequest<{ assignmentId: string }>('/teacher/assignments', {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      subject: input.subject,
      description: input.description,
      gradeLevel: input.gradeLevel,
      dueDate: input.dueDate,
      questions: input.questions,
    }),
  });
}

export interface TeacherClassOption {
  id: string;
  name: string;
  gradeLevel: string;
}

export async function getTeacherClasses() {
  const payload = await apiRequest<{ classes: TeacherClassOption[] }>('/teacher/classes', {
    method: 'GET',
  });
  return payload.classes;
}

export interface TeacherAssignmentDraft {
  draftId: string;
  status: 'review' | 'published' | 'abandoned';
  title: string;
  description: string;
  dueDate: string | null;
  gradeLevel: string;
  subject: string;
  requestedCount: number;
  questions: Assignment['questions'];
  aiCandidates: Assignment['questions'];
}

function toDraftQuestion(question: any, index: number): Assignment['questions'][number] {
  return {
    id: index + 1,
    bankId: question.bankId,
    source: question.source,
    candidateId: question.candidateId,
    type: question.type,
    text: question.text,
    options: question.options || [],
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
  };
}

export async function createTeacherAssignmentDraft(input: {
  title?: string;
  description?: string;
  gradeLevel: string;
  subject: string;
  strand?: string;
  subStrand?: string;
  classId?: string | null;
  dueDate?: string | null;
  requestedCount?: number;
}) {
  const payload = await apiRequest<any>('/teacher/assignment-drafts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return {
    ...payload,
    dueDate: payload.dueDate || null,
    questions: (payload.questions || []).map((question: any, index: number) => toDraftQuestion(question, index)),
    aiCandidates: (payload.aiCandidates || []).map((question: any, index: number) => toDraftQuestion(question, (payload.questions || []).length + index)),
  } as TeacherAssignmentDraft;
}

export async function publishTeacherAssignmentDraft(input: {
  draftId: string;
  title?: string;
  description?: string;
  dueDate?: string | null;
  approvedAiQuestionIds: string[];
  questions: Assignment['questions'];
}) {
  return apiRequest<{ success: boolean; assignmentId: string }>(`/teacher/assignment-drafts/${input.draftId}/publish`, {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      approvedAiQuestionIds: input.approvedAiQuestionIds,
      questions: input.questions.map(question => ({
        bankId: question.bankId,
        candidateId: question.candidateId,
        source: question.source,
        type: question.type,
        text: question.text,
        options: question.options || [],
        correctAnswer: String(question.correctAnswer ?? ''),
        explanation: question.explanation || '',
      })),
    }),
  });
}

export interface TeacherParentContact {
  id: string;
  name: string;
  email: string;
  phone_number?: string | null;
  child_count: number;
}

export interface TeacherParentMessage {
  id: string;
  teacher_user_id: string;
  parent_user_id: string;
  grade_level: string;
  sender_user_id: string;
  sender_name: string;
  body: string;
  created_at: string;
}

export async function saveTeacherScope(input: {
  grades: string[];
  subjects: string[];
  subjectsByGrade?: Record<string, string[]>;
  countryCode?: string;
  curriculumCode?: string;
}) {
  return apiRequest<{ saved: boolean; scopeCount: number }>('/teacher/teaching-scope', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getTeacherParents(gradeLevel: string) {
  const query = new URLSearchParams({ gradeLevel });
  const payload = await apiRequest<{ parents: TeacherParentContact[] }>(`/teacher/parents?${query}`, {
    method: 'GET',
  });
  return payload.parents;
}

export async function getTeacherParentMessages(input: { gradeLevel?: string; parentUserId?: string } = {}) {
  const query = new URLSearchParams();
  if (input.gradeLevel) query.set('gradeLevel', input.gradeLevel);
  if (input.parentUserId) query.set('parentUserId', input.parentUserId);
  const suffix = query.toString() ? `?${query}` : '';
  const payload = await apiRequest<{ messages: TeacherParentMessage[] }>(`/teacher/messages${suffix}`, {
    method: 'GET',
  });
  return payload.messages;
}

export async function sendTeacherParentMessage(input: {
  gradeLevel: string;
  body: string;
  parentUserId?: string | null;
}) {
  return apiRequest<{ sentCount: number }>('/teacher/messages', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function reportTeacherParentMessage(messageId: string) {
  return apiRequest<{ reportId: string; notifiedAdminCount: number; message: string }>(
    `/teacher-parent-messages/${messageId}/report`,
    {
      method: 'POST',
      body: JSON.stringify({ reason: 'abuse' }),
    },
  );
}

export async function saveTeacherLessonPlan(input: {
  gradeLevel: string;
  subject: string;
  topic: string;
  outcome: string;
  durationMinutes: number;
  style: string;
  plan: unknown;
}) {
  return apiRequest<{ lessonPlanId: string }>('/teacher/lesson-plans', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getStudentAssignments() {
  const payload = await apiRequest<{ assignments: Assignment[] }>('/homework/assignments', {
    method: 'GET',
  });
  return payload.assignments.map(item => ({
    ...item,
    dueDate: item.dueDate || '',
  }));
}

export async function submitStudentAssignment(
  assignmentId: string,
  input: {
    score?: number;
    answers: Array<{
      questionId: number;
      question: string;
      answer: string;
      isCorrect?: boolean;
    }>;
  },
) {
  return apiRequest<{ success: boolean; submissionId: string | null; score: number; grading: Array<{ questionId: number; submittedAnswer: string; isCorrect: boolean; correctAnswer: string; explanation: string }> }>(`/homework/assignments/${assignmentId}/submit`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
