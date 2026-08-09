import {
  getOnboardingStepMetadata,
  ONBOARDING_FLOW_REGISTRY,
} from '../src/onboarding/onboardingFlowRegistry';

describe('onboarding flow registry', () => {
  test.each([
    ['student', 25],
    ['other', 25],
    ['teacher', 20],
    ['parent', 20],
  ] as const)('keeps the full %s flow length', (role, totalStepCount) => {
    expect(ONBOARDING_FLOW_REGISTRY[role].totalStepCount).toBe(totalStepCount);
  });

  test('maps learner setup traversal to the existing PRD progress order', () => {
    const state = {
      role: 'student' as const,
      includeIntroChoices: true,
      introStep: 'setup' as const,
      roleStepOneTitle: 'Learner profile',
    };

    expect(getOnboardingStepMetadata({ ...state, setupStep: 2 })).toMatchObject({
      key: 'setup-school',
      title: 'School',
      progressIndex: 10,
      totalStepCount: 25,
    });
    expect(getOnboardingStepMetadata({ ...state, setupStep: 0 })).toMatchObject({
      key: 'setup-grade',
      progressIndex: 11,
    });
    expect(getOnboardingStepMetadata({ ...state, setupStep: 1 })).toMatchObject({
      key: 'setup-subjects',
      progressIndex: 12,
    });
  });

  test.each([
    ['teacher', 'Classes'],
    ['parent', 'Children'],
  ] as const)('keeps %s role-details metadata role-aware', (role, title) => {
    expect(
      getOnboardingStepMetadata({
        role,
        includeIntroChoices: true,
        introStep: 'roleDetails',
        setupStep: 0,
        roleStepOneTitle: role === 'teacher' ? 'Class focus' : 'Child profile',
      }),
    ).toMatchObject({ title, progressIndex: 10, totalStepCount: 20 });
  });

  test('keeps the short compatibility flow at three setup steps', () => {
    expect(
      getOnboardingStepMetadata({
        role: 'parent',
        includeIntroChoices: false,
        introStep: 'setup',
        setupStep: 2,
        roleStepOneTitle: 'Child profile',
      }),
    ).toMatchObject({ key: 'setup-payment', title: 'Payments', progressIndex: 2, totalStepCount: 3 });
  });
});
