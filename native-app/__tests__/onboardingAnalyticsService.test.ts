import {
  buildOnboardingEventPayload,
  ONBOARDING_ANALYTICS_VERSION,
} from '../src/services/onboardingAnalyticsService';

describe('onboarding analytics event mapping', () => {
  test('keeps legacy selection events compatible while adding versioned defaults', () => {
    expect(
      buildOnboardingEventPayload({
        sessionId: 'onboarding-session',
        stepKey: 'goal',
        optionKey: 'confidence',
        optionLabel: 'Feel more confident in class.',
      }),
    ).toMatchObject({
      eventType: 'selection',
      eventVersion: ONBOARDING_ANALYTICS_VERSION,
      stepIndex: 0,
    });
  });

  test('preserves funnel event metadata for screen and permission events', () => {
    expect(
      buildOnboardingEventPayload({
        sessionId: 'onboarding-session',
        stepKey: 'reminder',
        optionKey: 'permission_result',
        optionLabel: 'denied',
        eventType: 'permission_result',
        eventVersion: 1,
        stepIndex: 21,
        metadata: { granted: false },
      }),
    ).toMatchObject({
      eventType: 'permission_result',
      eventVersion: 1,
      stepIndex: 21,
      metadata: { granted: false },
    });
  });
});
