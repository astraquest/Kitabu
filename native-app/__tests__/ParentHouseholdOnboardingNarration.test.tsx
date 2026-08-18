import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { ParentHouseholdOnboardingScreen } from '../src/screens/ParentHouseholdOnboardingScreen';

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

describe('ParentHouseholdOnboardingScreen narration routing', () => {
  beforeEach(() => {
    narrationService.useGuidedNarration.mockClear();
  });

  async function renderScreen() {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(() => {
      renderer = ReactTestRenderer.create(
        <ParentHouseholdOnboardingScreen
          schools={[]}
          isSubmitting={false}
          onRoleChange={jest.fn()}
          onSubmit={jest.fn()}
        />,
      );
    });

    return renderer!;
  }

  test('uses English and Swahili cues only after their language is selected', async () => {
    const unselected = await renderScreen();

    expect(narrationService.useGuidedNarration).toHaveBeenLastCalledWith(null, false);

    await act(() => {
      unselected.root.findByProps({ accessibilityLabel: 'Choose Kiswahili' }).props.onPress();
    });

    expect(narrationService.useGuidedNarration).toHaveBeenLastCalledWith(
      expect.objectContaining({
        identity: 'primary-instruction:parent-onboarding:role-0-parent-sw-role',
        language: 'sw',
        publicCueId: 'parent-sw-role',
      }),
      true,
    );

    const english = await renderScreen();

    await act(() => {
      english.root.findByProps({ accessibilityLabel: 'Choose English' }).props.onPress();
    });

    expect(narrationService.useGuidedNarration).toHaveBeenLastCalledWith(
      expect.objectContaining({
        identity: 'primary-instruction:parent-onboarding:role-0-parent-role',
        language: 'en',
        publicCueId: 'parent-role',
      }),
      true,
    );
  });
});
