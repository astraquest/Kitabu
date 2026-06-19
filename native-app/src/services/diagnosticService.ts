import {
  DiagnosticQuestion,
  DiagnosticResult,
  DiagnosticSession,
} from '../types/app';
import { apiRequest } from './apiClient';

export async function getOnboardingDiagnosticStatus() {
  return apiRequest<{
    required: boolean;
    completed: boolean;
    activeSession: {
      id: string;
      startedAt: string;
      questions: DiagnosticQuestion[];
    } | null;
    result: DiagnosticResult | null;
  }>('/diagnostics/onboarding/status');
}

export async function startOnboardingDiagnostic(): Promise<DiagnosticSession> {
  const payload = await apiRequest<{
    completed: boolean;
    sessionId: string;
    result?: DiagnosticResult;
    questions: DiagnosticQuestion[];
  }>('/diagnostics/onboarding/start', {
    method: 'POST',
  });

  return {
    sessionId: payload.sessionId,
    questions: payload.questions,
  };
}

export async function getProgressiveDiagnosticStatus(subjectId: string) {
  return apiRequest<{
    required: boolean;
    completed: boolean;
    activeSession: {
      id: string;
      startedAt: string;
      questions: DiagnosticQuestion[];
    } | null;
    result: DiagnosticResult | null;
  }>(`/diagnostics/progressive/${subjectId}/status`);
}

export async function startProgressiveDiagnostic(subjectId: string): Promise<DiagnosticSession> {
  const payload = await apiRequest<{
    completed: boolean;
    sessionId: string;
    result?: DiagnosticResult;
    questions: DiagnosticQuestion[];
  }>(`/diagnostics/progressive/${subjectId}/start`, {
    method: 'POST',
  });

  return {
    sessionId: payload.sessionId,
    questions: payload.questions,
  };
}

export async function submitDiagnosticAnswer(
  sessionId: string,
  input: {
    questionId: string;
    answer: string;
    confidenceScore: number;
    responseLatencyMs: number;
  },
) {
  return apiRequest<{ recorded: boolean; isCorrect: boolean }>(
    `/diagnostics/onboarding/${sessionId}/answer`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function submitProgressiveDiagnosticAnswer(
  subjectId: string,
  sessionId: string,
  input: {
    questionId: string;
    answer: string;
    confidenceScore: number;
    responseLatencyMs: number;
  },
) {
  return apiRequest<{ recorded: boolean; isCorrect: boolean }>(
    `/diagnostics/progressive/${subjectId}/${sessionId}/answer`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function completeOnboardingDiagnostic(sessionId: string) {
  return apiRequest<{ completed: true; result: DiagnosticResult }>(
    `/diagnostics/onboarding/${sessionId}/complete`,
    {
      method: 'POST',
    },
  );
}

export async function completeProgressiveDiagnostic(subjectId: string, sessionId: string) {
  return apiRequest<{ completed: true; result: DiagnosticResult }>(
    `/diagnostics/progressive/${subjectId}/${sessionId}/complete`,
    {
      method: 'POST',
    },
  );
}
