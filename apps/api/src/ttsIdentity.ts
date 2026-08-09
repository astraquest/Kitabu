import { createHash } from 'node:crypto';

export type NarrationProfile = 'Samora' | 'Barake' | 'Judith' | 'Bella';

export const NARRATION_VOICES: Record<NarrationProfile, string> = {
  Samora: 'Sadaltager',
  Barake: 'Puck',
  Judith: 'Gacrux',
  Bella: 'Leda'
};

export type AssessmentNarrationInput = {
  text: string;
  languageCode: string;
  profile: NarrationProfile;
  speakingRate?: number;
  pitch?: number;
  style?: string;
};

export type AssessmentQuestionNarrationInput = {
  subjectName?: string | null;
  context?: string | null;
  prompt: string;
  options?: readonly string[] | null;
};

export function composeAssessmentQuestionNarration(input: AssessmentQuestionNarrationInput) {
  const parts = [
    input.subjectName ? `Subject: ${input.subjectName}.` : null,
    input.context ? `Context: ${input.context}.` : null,
    `Question: ${input.prompt}`,
    input.options?.length
      ? `Answer choices: ${input.options.map((option, index) => `${index + 1}. ${option}`).join(' ')}`
      : null
  ];
  return parts.filter((part): part is string => Boolean(part)).join(' ');
}

export function normalizeNarrationText(text: string) {
  return text.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\s+/g, ' ').trim();
}

export function buildNarrationIdentity(input: AssessmentNarrationInput) {
  const canonicalText = normalizeNarrationText(input.text);
  const speakingSettings = {
    pitch: input.pitch ?? 0,
    speakingRate: input.speakingRate ?? 1,
    style: input.style?.trim() || 'clear, warm, age-appropriate assessment narration'
  };
  const providerVoice = NARRATION_VOICES[input.profile];
  const identityPayload = JSON.stringify({
    text: canonicalText,
    languageCode: input.languageCode.trim(),
    profile: input.profile,
    providerVoice,
    speakingSettings,
    provider: 'gemini-batch',
    model: 'gemini-2.5-flash-preview-tts'
  });

  return {
    canonicalText,
    languageCode: input.languageCode.trim(),
    profile: input.profile,
    providerVoice,
    speakingSettings,
    identitySha256: createHash('sha256').update(identityPayload, 'utf8').digest('hex')
  };
}
