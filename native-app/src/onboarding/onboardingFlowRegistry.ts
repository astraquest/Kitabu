import type { PublicSignupRole } from '../types/app';

export type OnboardingIntroStep =
  | 'language'
  | 'mascot'
  | 'rafiki'
  | 'role'
  | 'voice'
  | 'need'
  | 'name'
  | 'gender'
  | 'roleDetails'
  | 'goal'
  | 'goalConfirm'
  | 'concerns'
  | 'achieve'
  | 'painBefore'
  | 'painAfter'
  | 'socialProof'
  | 'resultProof'
  | 'country'
  | 'interests'
  | 'reminder'
  | 'setup'
  | 'loading'
  | 'signup'
  | 'profileReady';

export type OnboardingFlowStepMetadata = {
  key: string;
  title: string;
  progressIndex: number;
};

export type OnboardingFlowState = {
  role: PublicSignupRole;
  includeIntroChoices: boolean;
  introStep: OnboardingIntroStep;
  setupStep: number;
  roleStepOneTitle: string;
};

type RoleFlowDefinition = {
  totalStepCount: number;
  introSteps: Partial<Record<Exclude<OnboardingIntroStep, 'setup'>, OnboardingFlowStepMetadata>>;
  compactSetupSteps: Record<number, OnboardingFlowStepMetadata>;
  fullSetupSteps: Record<number, OnboardingFlowStepMetadata>;
};

const SHARED_INTRO_STEPS = {
  language: { key: 'language', title: 'Language', progressIndex: 0 },
  mascot: { key: 'mascot', title: 'Mascot', progressIndex: 1 },
  rafiki: { key: 'rafiki', title: 'Rafiki', progressIndex: 2 },
  role: { key: 'role', title: 'Role', progressIndex: 3 },
  voice: { key: 'voice', title: 'Voice', progressIndex: 4 },
  need: { key: 'need', title: 'Need', progressIndex: 5 },
  name: { key: 'name', title: 'Name', progressIndex: 6 },
} satisfies RoleFlowDefinition['introSteps'];

const LEARNER_INTRO_STEPS = {
  roleDetails: { key: 'role-details', title: 'Age', progressIndex: 7 },
  gender: { key: 'gender', title: 'Gender', progressIndex: 8 },
  country: { key: 'country', title: 'Curriculum', progressIndex: 9 },
  painBefore: { key: 'pain-before', title: 'Before', progressIndex: 13 },
  painAfter: { key: 'pain-after', title: 'After', progressIndex: 14 },
  socialProof: { key: 'social-proof', title: 'Proof', progressIndex: 0 },
  goal: { key: 'goal', title: 'Goal', progressIndex: 15 },
  goalConfirm: { key: 'goal-confirm', title: 'Confirm', progressIndex: 16 },
  concerns: { key: 'concerns', title: 'Concern', progressIndex: 17 },
  achieve: { key: 'achieve', title: 'Achievement', progressIndex: 18 },
  interests: { key: 'interests', title: 'Interests', progressIndex: 19 },
  resultProof: { key: 'result-proof', title: 'Social proof', progressIndex: 20 },
  reminder: { key: 'reminder', title: 'Reminder', progressIndex: 21 },
  loading: { key: 'loading', title: 'Building', progressIndex: 22 },
  profileReady: { key: 'profile-ready', title: 'Ready', progressIndex: 23 },
  signup: { key: 'signup', title: 'Signup', progressIndex: 24 },
} satisfies RoleFlowDefinition['introSteps'];

const ROLE_INTRO_STEPS = {
  roleDetails: { key: 'role-details', title: 'Profile details', progressIndex: 10 },
  gender: { key: 'gender', title: 'Gender', progressIndex: 7 },
  country: { key: 'country', title: 'Curriculum', progressIndex: 8 },
  goal: { key: 'goal', title: 'Goal', progressIndex: 12 },
  concerns: { key: 'concerns', title: 'Concern', progressIndex: 13 },
  achieve: { key: 'achieve', title: 'Achievement', progressIndex: 14 },
  socialProof: { key: 'social-proof', title: 'Proof', progressIndex: 0 },
  resultProof: { key: 'result-proof', title: 'Social proof', progressIndex: 15 },
  reminder: { key: 'reminder', title: 'Reminder', progressIndex: 16 },
  loading: { key: 'loading', title: 'Building', progressIndex: 17 },
  profileReady: { key: 'profile-ready', title: 'Ready', progressIndex: 18 },
  signup: { key: 'signup', title: 'Signup', progressIndex: 19 },
} satisfies RoleFlowDefinition['introSteps'];

function createRoleFlow(
  role: PublicSignupRole,
  roleDetailsTitle: string,
  roleStepOneTitle: string,
  learnerFlow: boolean,
): RoleFlowDefinition {
  const introSteps = {
    ...SHARED_INTRO_STEPS,
    ...(learnerFlow ? LEARNER_INTRO_STEPS : ROLE_INTRO_STEPS),
    roleDetails: {
      key: 'role-details',
      title: roleDetailsTitle,
      progressIndex: learnerFlow ? 7 : 10,
    },
  } satisfies RoleFlowDefinition['introSteps'];

  return {
    totalStepCount: learnerFlow ? 25 : 20,
    introSteps,
    compactSetupSteps: {
      0: { key: 'setup-grade', title: roleStepOneTitle, progressIndex: 0 },
      1: { key: 'setup-school', title: 'School', progressIndex: 1 },
      2: { key: 'setup-payment', title: 'Payments', progressIndex: 2 },
    },
    fullSetupSteps: learnerFlow
      ? {
          0: { key: 'setup-grade', title: roleStepOneTitle, progressIndex: 11 },
          1: { key: 'setup-subjects', title: 'Subjects', progressIndex: 12 },
          2: { key: 'setup-school', title: 'School', progressIndex: 10 },
        }
      : {
          0: {
            key: 'setup-subjects',
            title: role === 'parent' ? 'Subjects' : roleStepOneTitle,
            progressIndex: 11,
          },
          1: { key: 'setup-school', title: 'School', progressIndex: 9 },
        },
  };
}

export const ONBOARDING_FLOW_REGISTRY: Record<PublicSignupRole, RoleFlowDefinition> = {
  student: createRoleFlow('student', 'Age', 'Learner profile', true),
  other: createRoleFlow('other', 'Age', 'Learning profile', true),
  teacher: createRoleFlow('teacher', 'Classes', 'Class focus', false),
  parent: createRoleFlow('parent', 'Children', 'Child profile', false),
};

export function getOnboardingStepMetadata(
  state: OnboardingFlowState,
): OnboardingFlowStepMetadata & { totalStepCount: number } {
  const definition = ONBOARDING_FLOW_REGISTRY[state.role];
  const setupSteps = state.includeIntroChoices
    ? definition.fullSetupSteps
    : definition.compactSetupSteps;
  const metadata =
    state.introStep === 'setup'
      ? setupSteps[state.setupStep]
      : definition.introSteps[state.introStep];

  if (metadata) {
    return { ...metadata, totalStepCount: state.includeIntroChoices ? definition.totalStepCount : 3 };
  }

  return {
    key: state.introStep,
    title: state.roleStepOneTitle,
    progressIndex: state.setupStep,
    totalStepCount: state.includeIntroChoices ? definition.totalStepCount : 3,
  };
}
