import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { LoginScreen } from '../src/screens/LoginScreen';
import {
  authenticateWithGoogleToken,
  requestPhoneAuthCode,
  verifyPhoneAuthCode,
} from '../src/services/authService';
import { requestGoogleIdToken } from '../src/services/googleAuthService';
import type { AuthSession } from '../src/types/app';

jest.mock('../src/services/authService', () => ({
  requestPasswordReset: jest.fn(),
  requestPhoneAuthCode: jest.fn(),
  verifyPhoneAuthCode: jest.fn(),
  authenticateWithGoogleToken: jest.fn(),
}));

jest.mock('../src/services/googleAuthService', () => ({
  requestGoogleIdToken: jest.fn(),
}));

const session: AuthSession = {
  accessToken: 'access',
  refreshToken: 'refresh',
  user: {
    id: 'user-1',
    schoolId: null,
    email: 'phone-254700000001@accounts.kitabu.invalid',
    phoneNumber: '254700000001',
    phoneVerified: true,
    fullName: 'Test Parent',
    emailVerified: false,
    roles: ['parent'],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

async function renderLogin(
  onAuthenticated = jest.fn(),
  overrides: Partial<React.ComponentProps<typeof LoginScreen>> = {},
) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(<LoginScreen
      mode="login"
      email=""
      password=""
      fullName=""
      signupRole="parent"
      acceptedTerms={false}
      isSubmitting={false}
      onModeChange={jest.fn()}
      onEmailChange={jest.fn()}
      onPasswordChange={jest.fn()}
      onFullNameChange={jest.fn()}
      onSignupRoleChange={jest.fn()}
      onAcceptedTermsChange={jest.fn()}
      onAuthenticated={onAuthenticated}
      onSubmit={jest.fn()}
      {...overrides}
    />);
  });
  return { renderer: renderer!, onAuthenticated };
}

test('requests and verifies a phone OTP', async () => {
  (requestPhoneAuthCode as jest.Mock).mockResolvedValue({
    message: 'sent',
    expiresInSeconds: 600,
    developmentCode: '123456',
  });
  (verifyPhoneAuthCode as jest.Mock).mockResolvedValue(session);
  const { renderer, onAuthenticated } = await renderLogin();

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Use phone' }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ placeholder: '07xx xxx xxx' }).props.onChangeText('0700000001');
  });
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Send verification code' }).props.onPress();
  });
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Verify and continue' }).props.onPress();
  });

  expect(requestPhoneAuthCode).toHaveBeenCalledWith({ purpose: 'login', phoneNumber: '0700000001' });
  expect(verifyPhoneAuthCode).toHaveBeenCalledWith({
    purpose: 'login',
    phoneNumber: '0700000001',
    code: '123456',
  });
  expect(onAuthenticated).toHaveBeenCalledWith(session);
});

test('hands a Google ID token to the API', async () => {
  (requestGoogleIdToken as jest.Mock).mockResolvedValue('google-id-token');
  (authenticateWithGoogleToken as jest.Mock).mockResolvedValue(session);
  const { renderer, onAuthenticated } = await renderLogin();

  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Continue with Google' }).props.onPress();
  });

  expect(authenticateWithGoogleToken).toHaveBeenCalledWith({ idToken: 'google-id-token' });
  expect(onAuthenticated).toHaveBeenCalledWith(session);
});

test('phone signup requires accepted terms before requesting an OTP', async () => {
  const { renderer } = await renderLogin(jest.fn(), {
    mode: 'signup',
    fullName: 'Test Parent',
    signupRole: 'parent',
    acceptedTerms: false,
  });

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Use phone' }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ placeholder: '07xx xxx xxx' }).props.onChangeText('0700000002');
  });
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Send verification code' }).props.onPress();
  });

  expect(requestPhoneAuthCode).not.toHaveBeenCalled();
  expect(renderer.root.findByProps({ children: 'Accept the Terms of Service and Privacy Policy before creating an account.' })).toBeTruthy();
});

test('email signup requires accepted terms before submitting', async () => {
  const onSubmit = jest.fn();
  const { renderer } = await renderLogin(jest.fn(), {
    mode: 'signup',
    fullName: 'Test Parent',
    signupRole: 'parent',
    acceptedTerms: false,
    onSubmit,
  });

  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Create account' }).props.onPress();
  });

  expect(onSubmit).not.toHaveBeenCalled();
  expect(renderer.root.findByProps({ children: 'Accept the Terms of Service and Privacy Policy before creating an account.' })).toBeTruthy();
});

test('email signup requires a full name before submitting', async () => {
  const onSubmit = jest.fn();
  const { renderer } = await renderLogin(jest.fn(), {
    mode: 'signup',
    fullName: '   ',
    signupRole: 'parent',
    acceptedTerms: true,
    onSubmit,
  });

  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Create account' }).props.onPress();
  });

  expect(onSubmit).not.toHaveBeenCalled();
  expect(renderer.root.findByProps({ children: 'Enter your full name to create an account.' })).toBeTruthy();
});

test('email signup submits after local prerequisites pass', async () => {
  const onSubmit = jest.fn();
  const { renderer } = await renderLogin(jest.fn(), {
    mode: 'signup',
    fullName: 'Test Parent',
    signupRole: 'parent',
    acceptedTerms: true,
    onSubmit,
  });

  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Create account' }).props.onPress();
  });

  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test('phone signup requires a full name before requesting an OTP', async () => {
  const { renderer } = await renderLogin(jest.fn(), {
    mode: 'signup',
    fullName: '   ',
    signupRole: 'parent',
    acceptedTerms: true,
  });

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Use phone' }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ placeholder: '07xx xxx xxx' }).props.onChangeText('0700000002');
  });
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Send verification code' }).props.onPress();
  });

  expect(requestPhoneAuthCode).not.toHaveBeenCalled();
  expect(renderer.root.findByProps({ children: 'Enter your full name to create an account.' })).toBeTruthy();
});

test('phone signup sends role and terms payload before verifying OTP', async () => {
  (requestPhoneAuthCode as jest.Mock).mockResolvedValue({
    message: 'sent',
    expiresInSeconds: 600,
    developmentCode: '654321',
  });
  (verifyPhoneAuthCode as jest.Mock).mockResolvedValue(session);
  const { renderer, onAuthenticated } = await renderLogin(jest.fn(), {
    mode: 'signup',
    fullName: 'Test Parent',
    signupRole: 'parent',
    acceptedTerms: true,
  });

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Use phone' }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ placeholder: '07xx xxx xxx' }).props.onChangeText('0700000002');
  });
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Send verification code' }).props.onPress();
  });
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Verify and continue' }).props.onPress();
  });

  expect(requestPhoneAuthCode).toHaveBeenCalledWith({
    purpose: 'signup',
    phoneNumber: '0700000002',
    fullName: 'Test Parent',
    role: 'parent',
    acceptedTerms: true,
  });
  expect(verifyPhoneAuthCode).toHaveBeenCalledWith({
    purpose: 'signup',
    phoneNumber: '0700000002',
    code: '654321',
  });
  expect(onAuthenticated).toHaveBeenCalledWith(session);
});

test('phone login accepts a manually entered OTP when no development code is returned', async () => {
  (requestPhoneAuthCode as jest.Mock).mockResolvedValue({
    message: 'Verification code sent.',
    expiresInSeconds: 600,
  });
  (verifyPhoneAuthCode as jest.Mock).mockResolvedValue(session);
  const { renderer, onAuthenticated } = await renderLogin();

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Use phone' }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ placeholder: '07xx xxx xxx' }).props.onChangeText('0700000001');
  });
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Send verification code' }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ placeholder: '6-digit code' }).props.onChangeText('112233');
  });
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Verify and continue' }).props.onPress();
  });

  expect(verifyPhoneAuthCode).toHaveBeenCalledWith({
    purpose: 'login',
    phoneNumber: '0700000001',
    code: '112233',
  });
  expect(onAuthenticated).toHaveBeenCalledWith(session);
});

test('Google signup requires accepted terms before requesting a token', async () => {
  const { renderer } = await renderLogin(jest.fn(), {
    mode: 'signup',
    signupRole: 'parent',
    acceptedTerms: false,
  });

  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Continue with Google' }).props.onPress();
  });

  expect(requestGoogleIdToken).not.toHaveBeenCalled();
  expect(authenticateWithGoogleToken).not.toHaveBeenCalled();
  expect(renderer.root.findByProps({ children: 'Accept the Terms of Service and Privacy Policy before creating an account.' })).toBeTruthy();
});

test('Google signup sends role and terms payload to the API', async () => {
  (requestGoogleIdToken as jest.Mock).mockResolvedValue('google-id-token');
  (authenticateWithGoogleToken as jest.Mock).mockResolvedValue(session);
  const { renderer, onAuthenticated } = await renderLogin(jest.fn(), {
    mode: 'signup',
    signupRole: 'parent',
    acceptedTerms: true,
  });

  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Continue with Google' }).props.onPress();
  });

  expect(authenticateWithGoogleToken).toHaveBeenCalledWith({
    idToken: 'google-id-token',
    role: 'parent',
    acceptedTerms: true,
  });
  expect(onAuthenticated).toHaveBeenCalledWith(session);
});
