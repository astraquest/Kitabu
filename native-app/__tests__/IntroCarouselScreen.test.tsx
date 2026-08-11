import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { IntroCarouselScreen } from '../src/screens/IntroCarouselScreen';

jest.mock('../src/services/narrationService', () => ({
  buildScreenIntro: jest.fn((_screen, identity) => ({
    identity: `screen-intro:intro-carousel:${identity}`,
    text: 'slide',
    voiceName: 'Samora',
  })),
  useGuidedNarration: jest.fn(),
}));

jest.mock('../src/services/landingSoundtrack', () => ({
  useLandingSoundtrack: jest.fn(),
}));

const useLandingSoundtrack = jest.requireMock('../src/services/landingSoundtrack').useLandingSoundtrack as jest.Mock;

beforeEach(() => {
  useLandingSoundtrack.mockReturnValue({
    muted: false,
    start: jest.fn(),
    toggleMuted: jest.fn(),
  });
});

test('final landing actions invoke signup and sign-in callbacks directly', async () => {
  const onCreateAccount = jest.fn();
  const onSignIn = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <IntroCarouselScreen
        onCreateAccount={onCreateAccount}
        onSignIn={onSignIn}
      />,
    );
  });

  for (let index = 0; index < 3; index += 1) {
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Next' }).props.onPress();
    });
  }

  const createAccountButton = renderer!.root.findByProps({
    accessibilityLabel: 'Create account',
  });
  const signInButton = renderer!.root.findByProps({ accessibilityLabel: 'Sign in' });

  expect(createAccountButton.props.onPress).toBe(onCreateAccount);
  expect(signInButton.props.onPress).toBe(onSignIn);

  await act(() => {
    createAccountButton.props.onPress();
    signInButton.props.onPress();
  });

  expect(onCreateAccount).toHaveBeenCalledTimes(1);
  expect(onSignIn).toHaveBeenCalledTimes(1);
});

test('next touch arms narration for the target landing slide', async () => {
  const onCreateAccount = jest.fn();
  const onSignIn = jest.fn();
  const { useGuidedNarration } = jest.requireMock('../src/services/narrationService') as {
    useGuidedNarration: jest.Mock;
  };
  useGuidedNarration.mockClear();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <IntroCarouselScreen onCreateAccount={onCreateAccount} onSignIn={onSignIn} />,
    );
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Next' }).props.onPress();
  });

  expect(useGuidedNarration).toHaveBeenLastCalledWith(
    expect.objectContaining({ identity: 'screen-intro:intro-carousel:1' }),
    true,
    'screen-intro:intro-carousel:1',
  );
});

test('landing soundtrack control is accessible and starts soundtrack on the first touch', async () => {
  const start = jest.fn();
  const toggleMuted = jest.fn();
  useLandingSoundtrack.mockReturnValue({ muted: false, start, toggleMuted });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <IntroCarouselScreen onCreateAccount={jest.fn()} onSignIn={jest.fn()} />,
    );
  });

  await act(() => {
    renderer!.root.findByType('LinearGradient' as React.ElementType).props.onTouchStart();
    renderer!.root.findByProps({ accessibilityLabel: 'Mute landing soundtrack' }).props.onPress();
  });

  expect(start).toHaveBeenCalledTimes(1);
  expect(toggleMuted).toHaveBeenCalledTimes(1);
});
