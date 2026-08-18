/**
 * Curated spoken copy for the unauthenticated landing carousel and parent
 * onboarding. Keep this catalog limited to semantic guidance: no question
 * numbers, answer options, checkbox labels, helper paragraphs, or decorative
 * copy belong here.
 *
 * StudentOnboardingScreen/student onboarding is intentionally out of scope
 * for the parent TTS catalog and must not be re-added here. Student narration
 * remains on its existing path.
 */
export interface OnboardingTtsCue {
  id: string;
  text: string;
  language?: 'en' | 'sw';
}

export const LANDING_INTRO_TTS_CUES: readonly OnboardingTtsCue[] = [
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
] as const;

export const PARENT_ONBOARDING_TTS_CUES: readonly OnboardingTtsCue[] = [
  { id: 'parent-language', text: 'First, choose your language.' },
  { id: 'parent-role', text: 'Are you a parent or a teacher?' },
  { id: 'parent-avatar', text: 'Choose the avatar that best represents you.' },
  { id: 'parent-name', text: 'What should we call you?' },
  { id: 'parent-country', text: 'Confirm your country so we can set up the right curriculum.' },
  { id: 'parent-learner-name', text: "What is your child's name?" },
  { id: 'parent-learner-age', text: 'How old is your child?' },
  { id: 'parent-learner-gender', text: 'Is your child a girl or a boy?' },
  { id: 'parent-county-school', text: 'Where does your child go to school?' },
  { id: 'parent-grade', text: 'Which grade is your child in?' },
  { id: 'parent-performance', text: 'How is your child performing right now?' },
  { id: 'parent-subjects', text: 'Which subjects would you like Kitabu to support?' },
  { id: 'parent-add-another', text: 'Would you like to add another learner?' },
  { id: 'parent-microphone', text: 'Please allow microphone access so your learner can speak with their tutor.' },
  { id: 'parent-reminders', text: 'Also enable notifications so that you can receive homework assignments and progress reports.' },
  { id: 'parent-referral', text: 'How did you hear about Kitabu?' },
  { id: 'parent-tutor-introduction', text: 'Now it’s time for your learner to choose a tutor. Please let the learner choose their preferred tutor by themselves.' },
  { id: 'parent-mascot-selection', text: 'Choose the tutor you’d like to learn with.' },
  { id: 'parent-mascot-rabbit', text: 'Hello, I’m Rafiki the Rabbit, and I’ll be your personal tutor. Are you ready to learn?' },
  { id: 'parent-mascot-lion', text: 'Hello, I’m Rafiki the Lion, and I’ll be your personal tutor. Are you ready to learn?' },
  { id: 'parent-mascot-elephant', text: 'Hello, I’m Rafiki the Elephant, and I’ll be your personal tutor. Are you ready to learn?' },
  { id: 'parent-mascot-panda', text: 'Hello, I’m Rafiki the Panda, and I’ll be your personal tutor. Are you ready to learn?' },
  { id: 'parent-tutor-voice', text: 'Choose the voice you’d like your tutor to use.' },
  { id: 'parent-progress-encouragement', text: 'A little practice each day will help you make real progress.' },
  { id: 'parent-commitment', text: 'Are you ready to make a daily learning commitment?' },
  { id: 'parent-signature', text: 'Please sign to confirm your commitment.' },
  { id: 'parent-learner-ready', text: 'Click next to begin your learning journey.' },
  { id: 'parent-study-plan-loading', text: 'Rafiki is preparing your customized learning curriculum and will be ready in a few seconds.' },
  { id: 'parent-study-plan-ready', text: 'Perfect! Your study plan is ready.' },
  { id: 'parent-save-account', text: 'Create an account to access the classroom.' },
  { id: 'parent-second-learner', text: 'Now it’s the next learner’s turn to choose their tutor.' }
] as const;

/** The public resolver serves both landing and parent onboarding cues. */
export const LANDING_ONBOARDING_TTS_CUES: readonly OnboardingTtsCue[] = [
  ...LANDING_INTRO_TTS_CUES,
  ...PARENT_ONBOARDING_TTS_CUES
] as const;

export function getLandingIntroTtsCue(cueId: string) {
  return LANDING_INTRO_TTS_CUES.find(cue => cue.id === cueId) ?? null;
}
