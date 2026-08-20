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

function makeSoundtrack() {
  return {
    muted: false,
    start: jest.fn(),
    stop: jest.fn(),
    toggleMuted: jest.fn(),
  };
}

test('final landing actions invoke signup and sign-in callbacks directly', async () => {
  const onCreateAccount = jest.fn();
  const onSignIn = jest.fn();
  const soundtrack = makeSoundtrack();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <IntroCarouselScreen
        onCreateAccount={onCreateAccount}
        onSignIn={onSignIn}
        soundtrack={soundtrack}
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
  const soundtrack = makeSoundtrack();
  const { useGuidedNarration } = jest.requireMock('../src/services/narrationService') as {
    useGuidedNarration: jest.Mock;
  };
  useGuidedNarration.mockClear();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <IntroCarouselScreen onCreateAccount={onCreateAccount} onSignIn={onSignIn} soundtrack={soundtrack} />,
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

test('landing soundtrack starts only from the first Next and the speaker remains accessible', async () => {
  const soundtrack = makeSoundtrack();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <IntroCarouselScreen onCreateAccount={jest.fn()} onSignIn={jest.fn()} soundtrack={soundtrack} />,
    );
  });

  expect(renderer!.root.findByType('LinearGradient' as React.ElementType).props.onTouchStart).toBeUndefined();
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Next' }).props.onPress();
    renderer!.root.findByProps({ accessibilityLabel: 'Next' }).props.onPress();
    renderer!.root.findByProps({ accessibilityLabel: 'Mute landing soundtrack' }).props.onPress();
  });

  expect(soundtrack.start).toHaveBeenCalledTimes(1);
  expect(soundtrack.toggleMuted).toHaveBeenCalledTimes(1);
});
