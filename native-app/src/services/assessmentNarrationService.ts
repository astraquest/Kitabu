import { apiRequest } from './apiClient';
import type { OnboardingLanguageCode, OnboardingVoiceName } from '../types/app';

export type AssessmentNarrationSegment = 'question' | 'prompt' | 'choice' | 'feedback' | 'explanation';
export type NarrationResolution =
  | { status: 'ready'; url: string; durationMs: number | null; identitySha256: string }
  | { status: 'pending'; identitySha256: string }
  | { status: 'unavailable'; reason: string; identitySha256?: string };

export async function getNarrationPreference() {
  return apiRequest<{ selectedProfile: OnboardingVoiceName; enabled: boolean }>('/me/narration-preference');
}

export async function saveNarrationPreference(input: { selectedProfile: OnboardingVoiceName; enabled: boolean }) {
  return apiRequest<{ selectedProfile: OnboardingVoiceName; enabled: boolean }>('/me/narration-preference', {
    method: 'PUT',
    body: JSON.stringify(input)
  });
}

export async function resolveAssessmentNarration(input: {
  descriptorId: string;
  segment: AssessmentNarrationSegment;
  choiceIndex?: number;
  languageCode?: OnboardingLanguageCode;
}) {
  return apiRequest<NarrationResolution>('/tts/resolve', {
    method: 'POST',
    body: JSON.stringify({
      descriptorId: input.descriptorId,
      segment: input.segment,
      choiceIndex: input.choiceIndex,
      languageCode: input.languageCode === 'sw' ? 'sw-KE' : 'en-US'
    })
  });
}
