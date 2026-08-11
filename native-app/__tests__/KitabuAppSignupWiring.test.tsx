import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { KitabuApp } from '../src/KitabuApp';
import type { PublicSignupRole } from '../src/types/app';

const mockUseKitabuApp = jest.fn();
const mockIntroCarouselScreen = jest.fn((_props: unknown) => <Text>intro carousel</Text>);
const mockLoginScreen = jest.fn((_props: unknown) => <Text>login screen</Text>);
const mockStudentOnboardingScreen = jest.fn((_props: unknown) => <Text>onboarding signup</Text>);
const runtimeGlobal = globalThis as typeof globalThis & {
  __DEV__?: boolean;
  history?: unknown;
  location?: unknown;
};

jest.mock('../src/hooks/useKitabuApp', () => ({
  useKitabuApp: () => mockUseKitabuApp(),
}));

jest.mock('../src/screens/IntroCarouselScreen', () => ({
  IntroCarouselScreen: (props: unknown) => mockIntroCarouselScreen(props),
}));

jest.mock('../src/screens/StudentOnboardingScreen', () => ({
  StudentOnboardingScreen: (props: unknown) => mockStudentOnboardingScreen(props),
}));

jest.mock('../src/screens/LoginScreen', () => ({
  LoginScreen: (props: unknown) => mockLoginScreen(props),
}));

function makeState(role: PublicSignupRole | null = null) {
  return {
    isReady: true,
    authSession: null,
    authEntryScreen: 'auth',
    authMode: 'signup',
    loginEmail: '',
    loginPassword: '',
    signupFullName: '',
    signupRole: role,
    lastUsedAuthRole: null,
    acceptedTerms: false,
    optionalPhoneNumber: '',
    isAuthenticating: false,
    authError: null,
    schoolsList: [],
    currentView: 'dashboard',
    activeUserProfile: null,
  };
}

function makeActions() {
  return {
    setSignupRole: jest.fn(),
    signUp: jest.fn(),
    openSignInEntry: jest.fn(),
    openSignupEntry: jest.fn(),
    setAuthMode: jest.fn(),
    setLoginEmail: jest.fn(),
    setLoginPassword: jest.fn(),
    setSignupFullName: jest.fn(),
    setAcceptedTerms: jest.fn(),
    setOptionalPhoneNumber: jest.fn(),
    completeProviderAuthentication: jest.fn(),
    signIn: jest.fn(),
    signInDemo: jest.fn(),
    submitAccountOnboarding: jest.fn(),
  };
}

describe('KitabuApp signup onboarding wiring', () => {
  const originalDev = runtimeGlobal.__DEV__;
  const originalLocation = runtimeGlobal.location;
  const originalHistory = runtimeGlobal.history;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(runtimeGlobal, '__DEV__', {
      configurable: true,
      value: originalDev,
    });
    Object.defineProperty(runtimeGlobal, 'location', {
      configurable: true,
      value: originalLocation,
    });
    Object.defineProperty(runtimeGlobal, 'history', {
      configurable: true,
      value: originalHistory,
    });
  });

  afterAll(() => {
    Object.defineProperty(runtimeGlobal, '__DEV__', {
      configurable: true,
      value: originalDev,
    });
    Object.defineProperty(runtimeGlobal, 'location', {
      configurable: true,
      value: originalLocation,
    });
    Object.defineProperty(runtimeGlobal, 'history', {
      configurable: true,
      value: originalHistory,
    });
  });

  test.each<PublicSignupRole>(['student', 'teacher', 'parent', 'other'])(
    'routes %s signups through full onboarding with inline credentials',
    async role => {
      const actions = makeActions();
      mockUseKitabuApp.mockReturnValue({ state: makeState(role), actions });

      await act(() => {
        ReactTestRenderer.create(<KitabuApp />);
      });

      expect(mockStudentOnboardingScreen).toHaveBeenCalledWith(
        expect.objectContaining({
          role,
          includeIntroChoices: true,
          collectSignupCredentials: true,
          onRoleChange: actions.setSignupRole,
          onSubmit: actions.signUp,
        }),
      );
    },
  );

  test('defaults new signup onboarding to student until a role is selected', async () => {
    const actions = makeActions();
    mockUseKitabuApp.mockReturnValue({ state: makeState(null), actions });

    await act(() => {
      ReactTestRenderer.create(<KitabuApp />);
    });

    expect(mockStudentOnboardingScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'student',
        includeIntroChoices: true,
        collectSignupCredentials: true,
      }),
    );
  });

  test('routes the landing Create account CTA to signup while Sign in remains login', async () => {
    const actions = makeActions();
    mockUseKitabuApp.mockReturnValue({
      state: {
        ...makeState(null),
        authEntryScreen: 'intro',
        authMode: 'login',
      },
      actions,
    });

    await act(() => {
      ReactTestRenderer.create(<KitabuApp />);
    });

    const introProps = mockIntroCarouselScreen.mock.calls.at(-1)?.[0] as {
      onCreateAccount: () => void;
      onSignIn: () => void;
    };
    await act(() => {
      introProps.onCreateAccount();
    });
    expect(actions.openSignupEntry).toHaveBeenCalledTimes(1);
    expect(actions.openSignInEntry).not.toHaveBeenCalled();

    await act(() => {
      introProps.onSignIn();
    });
    expect(actions.openSignInEntry).toHaveBeenCalledTimes(1);
  });

  test('wires the demo login callback alongside the normal sign-in action', async () => {
    const actions = makeActions();
    mockUseKitabuApp.mockReturnValue({
      state: {
        ...makeState('teacher'),
        authMode: 'login',
      },
      actions,
    });

    await act(() => {
      ReactTestRenderer.create(<KitabuApp />);
    });

    expect(mockLoginScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        onDemoLogin: actions.signInDemo,
        onSubmit: actions.signIn,
      }),
    );
  });

  test('continues an unverified email signup into onboarding', async () => {
    const actions = makeActions();
    mockUseKitabuApp.mockReturnValue({
      state: {
        ...makeState('parent'),
        authSession: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: {
            email: 'parent@example.com',
            emailVerified: false,
            phoneVerified: false,
            roles: ['parent'],
          },
        },
        hasPendingAccountOnboarding: true,
        isSubmittingOnboarding: false,
        onboardingError: null,
        externalPaymentsEnabled: true,
      },
      actions,
    });

    await act(() => {
      ReactTestRenderer.create(<KitabuApp />);
    });

    expect(mockStudentOnboardingScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'parent',
        onSubmit: actions.submitAccountOnboarding,
      }),
    );
  });

  test('consumes preview onboarding URL so reload returns to the intro carousel', async () => {
    const actions = makeActions();
    const replaceState = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    mockUseKitabuApp.mockReturnValue({
      state: {
        ...makeState(null),
        authEntryScreen: 'intro',
        authMode: 'login',
      },
      actions,
    });
    Object.defineProperty(runtimeGlobal, '__DEV__', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(runtimeGlobal, 'location', {
      configurable: true,
      value: {
        hash: '',
        pathname: '/',
        search: '?previewOnboarding=parent',
      },
    });
    Object.defineProperty(runtimeGlobal, 'history', {
      configurable: true,
      value: {
        replaceState,
        state: null,
      },
    });

    await act(() => {
      renderer = ReactTestRenderer.create(<KitabuApp />);
    });
    await act(() => {
      renderer?.update(<KitabuApp />);
    });

    expect(mockStudentOnboardingScreen).toHaveBeenLastCalledWith(
      expect.objectContaining({
        role: 'parent',
        includeIntroChoices: true,
        collectSignupCredentials: true,
      }),
    );
    expect(replaceState).toHaveBeenCalledWith(null, '', '/');
  });
});
