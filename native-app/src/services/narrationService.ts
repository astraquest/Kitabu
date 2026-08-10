import { useEffect, useRef } from 'react';

import { speechPlaybackBridge } from './nativeBridges';
import type { OnboardingVoiceName } from '../types/app';

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
  landingCueId?: string;
}

function normalizeSpokenCopy(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

export function buildScreenIntro(
  screen: string,
  identity: string,
  text: string,
  voiceName?: OnboardingVoiceName,
  options?: { language?: string; landingCueId?: string },
): NarrationCue {
  return {
    identity: `screen-intro:${screen}:${identity}`,
    kind: 'screen-intro',
    text: normalizeSpokenCopy(text),
    delivery: 'server',
    voiceName,
    language: options?.language,
    landingCueId: options?.landingCueId,
  };
}

export function buildPrimaryInstruction(
  screen: string,
  identity: string,
  text: string,
  voiceName?: OnboardingVoiceName,
): NarrationCue {
  return {
    identity: `primary-instruction:${screen}:${identity}`,
    kind: 'primary-instruction',
    text: normalizeSpokenCopy(text),
    delivery: 'server',
    voiceName,
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
export function useGuidedNarration(cue: NarrationCue | null, enabled = true) {
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
      ...(cue.landingCueId ? { landingCueId: cue.landingCueId } : {}),
    });
    speak?.catch(() => undefined);

    return () => {
      speechPlaybackBridge?.stop().catch(() => undefined);
    };
  }, [cue?.identity, cue?.text, cue?.voiceName, enabled]);

  useEffect(() => () => {
    speechPlaybackBridge?.stop().catch(() => undefined);
  }, []);
}
