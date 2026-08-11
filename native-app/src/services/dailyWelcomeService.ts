import type { SpeechSynthesisPayload } from './aiService';
import { apiRequest } from './apiClient';

export type DailyStudentWelcomeResponse =
  | { status: 'ready'; text: string; audio: SpeechSynthesisPayload }
  | { status: 'already_delivered'; text: string }
  | { status: 'pending'; text: string }
  | { status: 'unavailable'; reason: string };

export function getLocalCalendarDateKey(date = new Date()): string {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function requestDailyStudentWelcome(
  localDate = getLocalCalendarDateKey(),
): Promise<DailyStudentWelcomeResponse> {
  const response = await apiRequest<DailyStudentWelcomeResponse>('/me/daily-welcome', {
    method: 'POST',
    body: JSON.stringify({ localDate }),
  });

  if (
    response.status === 'ready' &&
    response.text.trim() &&
    response.audio?.base64Audio?.trim() &&
    response.audio.mimeType.trim()
  ) {
    return response;
  }

  if (response.status === 'ready') {
    return { status: 'unavailable', reason: 'invalid_audio_response' };
  }

  return response;
}
