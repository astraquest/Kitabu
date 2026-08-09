import { apiRequest } from './apiClient';

export const ONBOARDING_ANALYTICS_VERSION = 1;

export type OnboardingEventType =
  | 'view'
  | 'selection'
  | 'skip'
  | 'back'
  | 'complete'
  | 'permission_result'
  | 'drop_off';

export interface OnboardingSelectionEventInput {
  sessionId: string;
  stepKey: string;
  optionKey: string;
  optionLabel: string;
  eventType?: OnboardingEventType;
  eventVersion?: number;
  stepIndex?: number;
  role?: string | null;
  county?: string | null;
  grade?: string | null;
  countryCode?: string | null;
  curriculumCode?: string | null;
  metadata?: Record<string, unknown>;
}

export function buildOnboardingEventPayload(
  input: OnboardingSelectionEventInput,
): OnboardingSelectionEventInput {
  return {
    ...input,
    eventType: input.eventType ?? 'selection',
    eventVersion: input.eventVersion ?? ONBOARDING_ANALYTICS_VERSION,
    stepIndex: input.stepIndex ?? 0,
  };
}

export async function postOnboardingSelectionEvent(input: OnboardingSelectionEventInput) {
  try {
    await apiRequest<{ accepted: boolean }>('/onboarding/selection-events', {
      method: 'POST',
      body: JSON.stringify(buildOnboardingEventPayload(input)),
    });
  } catch {
    // Analytics should never block onboarding.
  }
}
