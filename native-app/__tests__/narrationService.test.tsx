import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  buildPrimaryInstruction,
  buildQuestionCue,
  getStudentEnglishOnboardingLandingCueId,
  useGuidedNarration,
} from '../src/services/narrationService';
import { speechPlaybackBridge } from '../src/services/nativeBridges';

jest.mock('../src/services/nativeBridges', () => ({
  speechPlaybackBridge: {
    speak: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
  },
}));

function NarratedQuestion({ questionId, text, voiceName }: { questionId: string; text: string; voiceName?: 'Samora' | 'Barake' | 'Bella' | 'Judith' }) {
  const cue = buildQuestionCue({
    screen: 'quiz',
    questionId,
    questionText: text,
    voiceName,
  });
  useGuidedNarration(cue);
  return null;
}

test('question cues contain only the primary question copy', () => {
  const cue = buildQuestionCue({
    screen: 'quiz',
    questionId: 'q1',
    questionText: 'Which fraction is equivalent to one half?',
    voiceName: 'Samora',
  });

  expect(cue.text).toBe('Which fraction is equivalent to one half?');
  expect(cue.text).not.toContain('Option A');
  expect(cue.text).not.toContain('Correct answer');
});

test('guided narration does not repeat when a screen rerenders with the same cue', async () => {
  const speak = speechPlaybackBridge.speak as jest.Mock;
  speak.mockClear();

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <NarratedQuestion questionId="q1" text="What is 2 plus 2?" voiceName="Samora" />,
    );
    await Promise.resolve();
  });

  await act(async () => {
    renderer!.update(<NarratedQuestion questionId="q1" text="What is 2 plus 2?" voiceName="Samora" />);
    await Promise.resolve();
  });

  expect(speak).toHaveBeenCalledTimes(1);
  expect(speak).toHaveBeenCalledWith('What is 2 plus 2?', { voiceName: 'Samora' });
  act(() => renderer!.unmount());
});

test('guided narration stays silent when no avatar voice is selected', async () => {
  const speak = speechPlaybackBridge.speak as jest.Mock;
  speak.mockClear();

  await act(async () => {
    ReactTestRenderer.create(
      <NarratedQuestion questionId="q2" text="What is 3 plus 3?" voiceName={undefined} />,
    );
    await Promise.resolve();
  });

  expect(speak).not.toHaveBeenCalled();
});

test('primary instructions use server short-cue delivery', () => {
  expect(buildPrimaryInstruction('quiz-me', 'topic', 'Choose a topic.')).toMatchObject({
    kind: 'primary-instruction',
    delivery: 'server',
    text: 'Choose a topic.',
  });
});

test('student English onboarding maps only static catalog cues', () => {
  expect(getStudentEnglishOnboardingLandingCueId('role', 0, 'en')).toBe('onboarding-role');
  expect(getStudentEnglishOnboardingLandingCueId('setup', 0, 'en')).toBe('onboarding-grade');
  expect(getStudentEnglishOnboardingLandingCueId('setup', 1, 'en')).toBe('onboarding-subjects');
  expect(getStudentEnglishOnboardingLandingCueId('rafiki', 0, 'en')).toBeUndefined();
  expect(getStudentEnglishOnboardingLandingCueId('role', 0, 'sw')).toBeUndefined();
});

test('primary instruction carries the public catalog request metadata', () => {
  expect(buildPrimaryInstruction(
    'student-onboarding',
    'role-0',
    'Who are you?',
    'Samora',
    { language: 'en', publicCueId: 'onboarding-role' },
  )).toMatchObject({
    language: 'en',
    publicCueId: 'onboarding-role',
  });
});
