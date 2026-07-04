import { apiRequest } from './apiClient';

export interface OnboardingSelectionEventInput {
  sessionId: string;
  stepKey: string;
  optionKey: string;
  optionLabel: string;
  role?: string | null;
  county?: string | null;
  grade?: string | null;
  countryCode?: string | null;
  curriculumCode?: string | null;
  metadata?: Record<string, unknown>;
}

export async function postOnboardingSelectionEvent(input: OnboardingSelectionEventInput) {
  try {
    await apiRequest<{ accepted: boolean }>('/onboarding/selection-events', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  } catch {
    // Analytics should never block onboarding.
  }
}
