import { apiRequest } from './apiClient';
import type { SpeechSynthesisPayload } from './aiService';

export type StudentWelcomeSpeechResponse =
  | { status: 'ready'; audio: SpeechSynthesisPayload }
  | { status: 'pending'; audio: null }
  | { status: 'unavailable'; audio: null; reason?: string };

export async function getStudentWelcomeSpeech(): Promise<StudentWelcomeSpeechResponse> {
  return apiRequest<StudentWelcomeSpeechResponse>('/me/student-welcome-speech');
}
