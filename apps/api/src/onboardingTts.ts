/**
 * Curated, short spoken copy for the unauthenticated landing carousel and the
 * learner onboarding path. Keep this catalog limited to semantic guidance:
 * no question numbers, answer options, checkbox labels, helper paragraphs, or
 * decorative copy belong here.
 */
export interface OnboardingTtsCue {
  id: string;
  text: string;
  language?: 'en' | 'sw';
}

export const LANDING_ONBOARDING_TTS_CUES: readonly OnboardingTtsCue[] = [
  {
    id: 'intro-slide-1',
    text: 'Every learner deserves a personal tutor who never gets tired of explaining.'
  },
  {
    id: 'intro-slide-2',
    text: 'For less than one mandazi, get unlimited revision questions every day.'
  },
  {
    id: 'intro-slide-3',
    text: 'Daily homework aligned with CBC. Automated grading for teachers and parents.'
  },
  {
    id: 'intro-slide-4',
    text: 'Usingoje report form ndio ujue kuna makosa mahali. Fungua Kitabu!',
    language: 'sw'
  },
  { id: 'onboarding-language', text: 'Choose your language.' },
  { id: 'onboarding-learning-buddy', text: 'Choose your learning buddy.' },
  { id: 'onboarding-role', text: 'Who are you?' },
  { id: 'onboarding-microphone', text: 'Allow Microphone Access. Microphone access enables spoken answers and live tutoring.' },
  { id: 'onboarding-need', text: 'What do you need most right now?' },
  { id: 'onboarding-name', text: 'What is your name?' },
  { id: 'onboarding-age', text: 'How old are you?' },
  { id: 'onboarding-starting-point', text: 'Find your starting point.' },
  { id: 'onboarding-grade', text: 'Which grade are you in?' },
  { id: 'onboarding-subjects', text: 'Select the subjects you study.' },
  { id: 'onboarding-school', text: 'Which school do you attend?' },
  { id: 'onboarding-goal', text: 'What is your learning goal?' },
  { id: 'onboarding-challenge', text: 'What is your biggest study challenge?' },
  { id: 'onboarding-achievement', text: 'What do you want to achieve with Kitabu AI?' },
  { id: 'onboarding-curriculum', text: 'Choose your curriculum.' },
  { id: 'onboarding-interests', text: 'What are your interests?' },
  { id: 'onboarding-reminder', text: 'Would you like daily reminders?' },
  { id: 'onboarding-save-account', text: 'Save your account.' }
] as const;

export const LANDING_INTRO_TTS_CUES = LANDING_ONBOARDING_TTS_CUES.slice(0, 4);

export function getLandingIntroTtsCue(cueId: string) {
  return LANDING_INTRO_TTS_CUES.find(cue => cue.id === cueId) ?? null;
}
