import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { parseIncomingLink } from '../src/hooks/useKitabuApp';
import { EmailVerificationScreen } from '../src/screens/EmailVerificationScreen';

describe('email verification deep links', () => {
  it('parses hosted verification links with tokens', () => {
    expect(parseIncomingLink('https://app.kitabu.ai/verify-email?token=abc123')).toEqual({
      kind: 'email-verification-token',
      token: 'abc123',
    });
  });

  it('parses native email verified callbacks', () => {
    expect(parseIncomingLink('kitabu://auth/email-verified?email=parent%40example.com')).toEqual({
      kind: 'email-verified',
      email: 'parent@example.com',
    });
  });

  it('parses password reset completion callbacks', () => {
    expect(parseIncomingLink('kitabu://auth/password-reset-complete')).toEqual({
      kind: 'password-reset-complete',
    });
  });

  it('ignores unknown or malformed links', () => {
    expect(parseIncomingLink('https://app.kitabu.ai/verify-email')).toEqual({ kind: 'unknown' });
    expect(parseIncomingLink('not a url')).toEqual({ kind: 'unknown' });
  });
});

describe('EmailVerificationScreen', () => {
  it('tells users where Gmail may place verification mail', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <EmailVerificationScreen email="parent@example.com" onResend={jest.fn()} onSignOut={jest.fn()} />,
      );
    });

    expect(renderer.root.findAllByProps({
      children: 'Can’t see it? Check Primary, Updates, and Spam. Gmail may place automated verification messages in Updates.',
    }).length).toBeGreaterThan(0);
  });

  it('shows resend success feedback', async () => {
    const onResend = jest.fn(async () => 'Verification email sent.');
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <EmailVerificationScreen
          email="parent@example.com"
          onResend={onResend}
          onSignOut={jest.fn()}
        />,
      );
    });

    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: 'Resend verification email' }).props.onPress();
    });

    expect(onResend).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByProps({ children: 'Verification email sent.' }).length).toBeGreaterThan(0);
  });

  it('shows resend errors without exposing raw failures', async () => {
    const onResend = jest.fn(async () => {
      throw new Error('If an unverified account exists for that email, a verification email will be sent.');
    });
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <EmailVerificationScreen
          email="parent@example.com"
          onResend={onResend}
          onSignOut={jest.fn()}
        />,
      );
    });

    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: 'Resend verification email' }).props.onPress();
    });

    expect(onResend).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findAllByProps({
        children: 'If an unverified account exists for that email, a verification email will be sent.',
      }).length,
    ).toBeGreaterThan(0);
  });
});
