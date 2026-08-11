import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { LoginScreen } from '../src/screens/LoginScreen';
import {
  authenticateWithGoogleToken,
} from '../src/services/authService';
import { requestGoogleIdToken } from '../src/services/googleAuthService';
import type { AuthSession } from '../src/types/app';

jest.mock('../src/services/authService', () => ({
  requestPasswordReset: jest.fn(),
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
      optionalPhoneNumber=""
      isSubmitting={false}
      onModeChange={jest.fn()}
      onEmailChange={jest.fn()}
      onPasswordChange={jest.fn()}
      onFullNameChange={jest.fn()}
      onSignupRoleChange={jest.fn()}
      onAcceptedTermsChange={jest.fn()}
      onOptionalPhoneNumberChange={jest.fn()}
      onAuthenticated={onAuthenticated}
      onDemoLogin={jest.fn()}
      onSubmit={jest.fn()}
      {...overrides}
    />);
  });
  return { renderer: renderer!, onAuthenticated };
}

async function continueAsParent(renderer: ReactTestRenderer.ReactTestRenderer) {
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Continue as Parent' }).props.onPress();
  });
}

test('hands a Google ID token to the API', async () => {
  (requestGoogleIdToken as jest.Mock).mockResolvedValue('google-id-token');
  (authenticateWithGoogleToken as jest.Mock).mockResolvedValue(session);
  const { renderer, onAuthenticated } = await renderLogin();

  await continueAsParent(renderer);
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Continue with Google' }).props.onPress();
  });

  expect(authenticateWithGoogleToken).toHaveBeenCalledWith({ idToken: 'google-id-token' });
  expect(onAuthenticated).toHaveBeenCalledWith(session);
});

test('shows Google before email and keeps phone as an optional saved field', async () => {
  const onOptionalPhoneNumberChange = jest.fn();
  const { renderer } = await renderLogin(jest.fn(), {
    optionalPhoneNumber: '0716175485',
    onOptionalPhoneNumberChange,
  });

  await continueAsParent(renderer);

  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Use phone' })).toHaveLength(0);
  expect(renderer.root.findByProps({ accessibilityLabel: 'Continue with Google' })).toBeTruthy();
  expect(renderer.root.findByProps({ placeholder: 'Email' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'Phone number (optional)' })).toBeTruthy();
  expect(renderer.root.findByProps({ value: '0716175485' })).toBeTruthy();

  await act(async () => {
    renderer.root.findByProps({ value: '0716175485' }).props.onChangeText('0716000000');
  });

  expect(onOptionalPhoneNumberChange).toHaveBeenCalledWith('0716000000');
});

test('marks only the previously authenticated role as last used on sign in', async () => {
  const { renderer } = await renderLogin(jest.fn(), {
    mode: 'login',
    lastUsedRole: 'parent',
  });

  expect(renderer.root.findByProps({ children: 'Last used' })).toBeTruthy();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Continue as Parent, last used' })).toBeTruthy();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Continue as Student' })).toBeTruthy();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Continue as Teacher' })).toBeTruthy();
});

test('does not show the last-used badge while creating an account', async () => {
  const { renderer } = await renderLogin(jest.fn(), {
    mode: 'signup',
    signupRole: null,
    lastUsedRole: 'parent',
  });

  expect(renderer.root.findAllByProps({ children: 'Last used' })).toHaveLength(0);
});

test('shows safe, actionable guidance for an email or password login failure', async () => {
  const message = 'Email or password is incorrect. Check your details or create an account.';
  const { renderer } = await renderLogin(jest.fn(), { error: message });

  await continueAsParent(renderer);

  expect(renderer.root.findByProps({ children: message })).toBeTruthy();
});

test('tells a verified Google user to create a Kitabu account when none exists', async () => {
  const message = 'No Kitabu account found. Create an account to continue with Google.';
  (requestGoogleIdToken as jest.Mock).mockResolvedValue('google-id-token');
  (authenticateWithGoogleToken as jest.Mock).mockRejectedValue(new Error(message));
  const { renderer } = await renderLogin();

  await continueAsParent(renderer);
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Continue with Google' }).props.onPress();
  });

  expect(renderer.root.findByProps({ children: message })).toBeTruthy();
});

test('submits the normal login form and demo quick-login callback in login mode', async () => {
  const onSubmit = jest.fn();
  const onDemoLogin = jest.fn();
  const { renderer } = await renderLogin(jest.fn(), {
    signupRole: 'student',
    onDemoLogin,
    onSubmit,
  });

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Continue as Student' }).props.onPress();
  });

  expect(renderer.root.findByProps({ accessibilityLabel: 'Sign in' })).toBeTruthy();
  const demoButton = renderer.root.findByProps({ accessibilityLabel: 'Demo Account' });
  expect(demoButton.props.disabled).toBe(false);

  await act(async () => {
    await demoButton.props.onPress();
  });

  expect(onDemoLogin).toHaveBeenCalledTimes(1);

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Sign in' }).props.onPress();
  });

  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test('does not show the demo quick-login control while signing up', async () => {
  const { renderer } = await renderLogin(jest.fn(), {
    mode: 'signup',
    signupRole: 'parent',
  });

  await continueAsParent(renderer);

  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Demo Account' })).toHaveLength(0);
});

test('signup role choices start unselected', async () => {
  const { renderer } = await renderLogin(jest.fn(), {
    mode: 'signup',
    signupRole: null,
  });

  expect(renderer.root.findByProps({ children: 'Choose your role' })).toBeTruthy();
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Continue as Student' }).props.accessibilityState,
  ).toEqual({ selected: false });
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Continue as Teacher' }).props.accessibilityState,
  ).toEqual({ selected: false });
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Continue as Parent' }).props.accessibilityState,
  ).toEqual({ selected: false });
});

test('switching from login to signup clears the selected role', async () => {
  const onModeChange = jest.fn();
  const onSignupRoleChange = jest.fn();
  const { renderer } = await renderLogin(jest.fn(), {
    mode: 'login',
    signupRole: 'student',
    onModeChange,
    onSignupRoleChange,
  });

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Switch to sign up' }).props.onPress();
  });

  expect(onSignupRoleChange).toHaveBeenCalledWith(null);
  expect(onModeChange).toHaveBeenCalledWith('signup');
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

  await continueAsParent(renderer);
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Create account' }).props.onPress();
  });

  expect(onSubmit).not.toHaveBeenCalled();
  expect(renderer.root.findByProps({ children: 'Accept the Terms of Use and Privacy Policy before creating an account.' })).toBeTruthy();
});

test('terms checkbox opens scroll-gated acceptance modal before ticking terms', async () => {
  const onAcceptedTermsChange = jest.fn();
  const { renderer } = await renderLogin(jest.fn(), {
    mode: 'signup',
    signupRole: 'parent',
    acceptedTerms: false,
    onAcceptedTermsChange,
  });

  await continueAsParent(renderer);
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'I accept the Terms of Use and Privacy Policy' }).props.onPress();
  });

  const acceptButton = renderer.root.findByProps({ accessibilityLabel: 'I accept Terms of Use' });
  expect(acceptButton.props.disabled).toBe(true);
  expect(onAcceptedTermsChange).not.toHaveBeenCalled();

  const termsScrollView = renderer.root.findAll(
    node =>
      typeof node.props.onScroll === 'function' &&
      typeof node.props.onContentSizeChange === 'function',
  )[0];

  await act(async () => {
    termsScrollView.props.onLayout({ nativeEvent: { layout: { height: 300 } } });
    termsScrollView.props.onContentSizeChange(320, 900);
    termsScrollView.props.onScroll({
      nativeEvent: {
        contentOffset: { y: 600 },
        layoutMeasurement: { height: 300 },
        contentSize: { height: 900 },
      },
    });
  });

  const enabledAcceptButton = renderer.root.findByProps({ accessibilityLabel: 'I accept Terms of Use' });
  expect(enabledAcceptButton.props.disabled).toBe(false);

  await act(async () => {
    enabledAcceptButton.props.onPress();
  });

  expect(onAcceptedTermsChange).toHaveBeenCalledWith(true);
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

  await continueAsParent(renderer);
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

  await continueAsParent(renderer);
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Create account' }).props.onPress();
  });

  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test('Google signup requires accepted terms before requesting a token', async () => {
  const { renderer } = await renderLogin(jest.fn(), {
    mode: 'signup',
    signupRole: 'parent',
    acceptedTerms: false,
  });

  await continueAsParent(renderer);
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Continue with Google' }).props.onPress();
  });

  expect(requestGoogleIdToken).not.toHaveBeenCalled();
  expect(authenticateWithGoogleToken).not.toHaveBeenCalled();
  expect(renderer.root.findByProps({ children: 'Accept the Terms of Use and Privacy Policy before creating an account.' })).toBeTruthy();
});

test('Google signup sends role and terms payload to the API', async () => {
  (requestGoogleIdToken as jest.Mock).mockResolvedValue('google-id-token');
  (authenticateWithGoogleToken as jest.Mock).mockResolvedValue(session);
  const { renderer, onAuthenticated } = await renderLogin(jest.fn(), {
    mode: 'signup',
    signupRole: 'parent',
    acceptedTerms: true,
  });

  await continueAsParent(renderer);
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
