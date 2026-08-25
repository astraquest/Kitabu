import { apiRequest } from './apiClient';

export type QuizMeSessionQuestion = {
  id: number;
  sessionQuestionId: string;
  bankId: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  text: string;
  options: string[];
  difficulty: number;
  strand: string;
  subStrand: string;
};

export type QuizMeSession = {
  sessionId: string;
  grade: string;
  subjectId: string;
  subjectName: string;
  strand: string;
  subStrand: string;
  questionCount: number;
  questions: QuizMeSessionQuestion[];
};

export type QuizMeAnswerResult = {
  sessionQuestionId: string;
  isCorrect: boolean;
  score: number;
  feedback: string;
  correctAnswer?: string;
  alreadySubmitted: boolean;
};

function clientSessionId() {
  const cryptoSource = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoSource?.randomUUID) return cryptoSource.randomUUID();
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`;
}

export function startQuizMeSession(input: {
  grade: string;
  subjectId: string;
  subjectName: string;
  strand: string;
  subStrand: string;
  questionCount: number;
}) {
  return apiRequest<QuizMeSession>('/quiz-me/sessions', {
    method: 'POST',
    body: JSON.stringify({ ...input, clientSessionId: clientSessionId() }),
  });
}

export function submitQuizMeAnswer(sessionId: string, sessionQuestionId: string, answer: string) {
  return apiRequest<QuizMeAnswerResult>(
    `/quiz-me/sessions/${sessionId}/questions/${sessionQuestionId}/answer`,
    { method: 'POST', body: JSON.stringify({ answer }) },
  );
}
