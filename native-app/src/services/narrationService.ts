import { useEffect, useRef } from 'react';

import { speechPlaybackBridge } from './nativeBridges';
import type { OnboardingIntroStep } from '../onboarding/onboardingFlowRegistry';
import type { OnboardingLanguageCode, OnboardingVoiceName } from '../types/app';

export type NarrationCueKind =
  | 'screen-intro'
  | 'primary-instruction'
  | 'question'
  | 'feedback'
  | 'next-step';

export interface NarrationCue {
  identity: string;
  kind: NarrationCueKind;
  text: string;
  delivery: 'server';
  voiceName?: OnboardingVoiceName;
  language?: string;
  publicCueId?: string;
}

function normalizeSpokenCopy(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

const STUDENT_ENGLISH_ONBOARDING_CUE_IDS: Partial<Record<OnboardingIntroStep, string>> = {
  language: 'onboarding-language',
  mascot: 'onboarding-learning-buddy',
  role: 'onboarding-role',
  microphone: 'onboarding-microphone',
  need: 'onboarding-need',
  name: 'onboarding-name',
  roleDetails: 'onboarding-age',
  goal: 'onboarding-goal',
  concerns: 'onboarding-challenge',
  achieve: 'onboarding-achievement',
  interests: 'onboarding-interests',
  reminder: 'onboarding-reminder',
  signup: 'onboarding-save-account',
};

const STUDENT_ENGLISH_SETUP_CUE_IDS: Partial<Record<number, string>> = {
  0: 'onboarding-grade',
  1: 'onboarding-subjects',
  2: 'onboarding-school',
};

export function getStudentEnglishOnboardingLandingCueId(
  introStep: OnboardingIntroStep,
  setupStep: number,
  languageCode: OnboardingLanguageCode | null,
) {
  if (languageCode === 'sw') {
    return undefined;
  }

  return introStep === 'setup'
    ? STUDENT_ENGLISH_SETUP_CUE_IDS[setupStep]
    : STUDENT_ENGLISH_ONBOARDING_CUE_IDS[introStep];
}

export function buildScreenIntro(
  screen: string,
  identity: string,
  text: string,
  voiceName?: OnboardingVoiceName,
  options?: { language?: string; publicCueId?: string; landingCueId?: string },
): NarrationCue {
  return {
    identity: `screen-intro:${screen}:${identity}`,
    kind: 'screen-intro',
    text: normalizeSpokenCopy(text),
    delivery: 'server',
    voiceName,
    language: options?.language,
    publicCueId: options?.publicCueId ?? options?.landingCueId,
  };
}

export function buildPrimaryInstruction(
  screen: string,
  identity: string,
  text: string,
  voiceName?: OnboardingVoiceName,
  options?: { language?: string; publicCueId?: string; landingCueId?: string },
): NarrationCue {
  return {
    identity: `primary-instruction:${screen}:${identity}`,
    kind: 'primary-instruction',
    text: normalizeSpokenCopy(text),
    delivery: 'server',
    voiceName,
    language: options?.language,
    publicCueId: options?.publicCueId ?? options?.landingCueId,
  };
}

export function buildQuestionCue(args: {
  screen: string;
  questionId: string | number;
  questionText: string;
  voiceName?: OnboardingVoiceName;
}): NarrationCue {
  return {
    identity: `question:${args.screen}:${String(args.questionId)}`,
    kind: 'question',
    text: normalizeSpokenCopy(args.questionText),
    delivery: 'server',
    voiceName: args.voiceName,
  };
}

export function buildFeedbackCue(screen: string, identity: string, text: string, voiceName?: OnboardingVoiceName): NarrationCue {
  return {
    identity: `feedback:${screen}:${identity}`,
    kind: 'feedback',
    text: normalizeSpokenCopy(text),
    delivery: 'server',
    voiceName,
  };
}

export function buildNextStepCue(screen: string, identity: string, text: string, voiceName?: OnboardingVoiceName): NarrationCue {
  return {
    identity: `next-step:${screen}:${identity}`,
    kind: 'next-step',
    text: normalizeSpokenCopy(text),
    delivery: 'server',
    voiceName,
  };
}

/**
 * Speaks semantic guidance independently from the text exposed to VoiceOver/TalkBack.
 * A cue identity is spoken once per mounted flow, even if the screen rerenders.
 */
export function useGuidedNarration(cue: NarrationCue | null, enabled = true, retriggerIdentity: string | null = null) {
  const spokenIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !cue?.text || !cue.voiceName) {
      return undefined;
    }

    if (spokenIdentityRef.current === cue.identity) {
      return undefined;
    }

    spokenIdentityRef.current = cue.identity;
    const speak = speechPlaybackBridge?.speak(cue.text, {
      voiceName: cue.voiceName,
      ...(cue.language ? { language: cue.language } : {}),
      ...(cue.publicCueId ? { publicCueId: cue.publicCueId } : {}),
    });
    speak?.catch(() => undefined);

    return () => {
      speechPlaybackBridge?.stop().catch(() => undefined);
    };
  }, [cue?.identity, cue?.text, cue?.voiceName, cue?.language, cue?.publicCueId, enabled, retriggerIdentity]);

  useEffect(() => () => {
    speechPlaybackBridge?.stop().catch(() => undefined);
  }, []);
}
