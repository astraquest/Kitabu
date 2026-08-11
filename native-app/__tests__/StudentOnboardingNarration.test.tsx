import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { requestRecordingPermissionsAsync } from 'expo-audio';

import { StudentOnboardingScreen } from '../src/screens/StudentOnboardingScreen';

jest.mock('../src/services/narrationService', () => {
  const actual = jest.requireActual('../src/services/narrationService');
  return {
    ...actual,
    useGuidedNarration: jest.fn(),
  };
});

const narrationService = jest.requireMock('../src/services/narrationService') as {
  useGuidedNarration: jest.Mock;
};

describe('StudentOnboardingScreen narration transitions', () => {
  beforeEach(() => {
    narrationService.useGuidedNarration.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function renderMicrophoneStep() {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    jest.useFakeTimers();

    await act(() => {
      renderer = ReactTestRenderer.create(
        <StudentOnboardingScreen
          role="student"
          schools={[]}
          isSubmitting={false}
          includeIntroChoices
          onSubmit={jest.fn()}
        />,
      );
    });

    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Select English language' }).props.onPress();
      jest.advanceTimersByTime(250);
    });
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Choose Rafiki the Rabbit mascot' }).props.onPress();
      jest.advanceTimersByTime(250);
    });
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
    });
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Selected Student role' }).props.onPress();
      jest.advanceTimersByTime(250);
    });

    return renderer!;
  }

  test('skipping microphone permission advances without requesting it', async () => {
    const requestPermission = requestRecordingPermissionsAsync as jest.Mock;
    requestPermission.mockClear();
    const renderer = await renderMicrophoneStep();

    await act(() => {
      renderer.root.findByProps({ accessibilityLabel: 'Skip microphone permission' }).props.onPress();
    });

    expect(requestPermission).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Need options' })).toBeTruthy();
  });

  test('microphone permission CTA still requests permission before advancing', async () => {
    const requestPermission = requestRecordingPermissionsAsync as jest.Mock;
    requestPermission.mockClear();
    const renderer = await renderMicrophoneStep();

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: 'Allow microphone access' }).props.onPress();
      await Promise.resolve();
    });

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(renderer.root.findByProps({ accessibilityLabel: 'Need options' })).toBeTruthy();
  });

  test('English selection arms only its known auto-advance target cue', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(() => {
      renderer = ReactTestRenderer.create(
        <StudentOnboardingScreen
          role="student"
          schools={[]}
          isSubmitting={false}
          includeIntroChoices
          onSubmit={jest.fn()}
        />,
      );
    });

    expect(narrationService.useGuidedNarration).toHaveBeenLastCalledWith(
      expect.objectContaining({ identity: 'primary-instruction:student-onboarding:language-0' }),
      true,
      null,
    );

    jest.useFakeTimers();
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Select English language' }).props.onPress();
    });

    expect(narrationService.useGuidedNarration).toHaveBeenLastCalledWith(
      expect.objectContaining({ identity: 'primary-instruction:student-onboarding:language-0' }),
      true,
      'primary-instruction:student-onboarding:mascot-0',
    );

    await act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(narrationService.useGuidedNarration).toHaveBeenLastCalledWith(
      expect.objectContaining({
        identity: 'primary-instruction:student-onboarding:mascot-0',
        publicCueId: 'onboarding-learning-buddy',
      }),
      true,
      'primary-instruction:student-onboarding:mascot-0',
    );

    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Choose Rafiki the Rabbit mascot' }).props.onPress();
      jest.advanceTimersByTime(250);
    });

    expect(narrationService.useGuidedNarration).toHaveBeenLastCalledWith(
      expect.objectContaining({
        identity: 'primary-instruction:student-onboarding:rafiki-0',
        publicCueId: undefined,
      }),
      true,
      'primary-instruction:student-onboarding:mascot-0',
    );
  });
});
