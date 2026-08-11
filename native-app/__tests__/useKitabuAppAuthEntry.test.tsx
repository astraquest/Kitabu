import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { useKitabuApp } from '../src/hooks/useKitabuApp';
import { subscribeToAuthSessionUpdates } from '../src/services/requestHelpers';
import { getLocalCalendarDateKey, requestDailyStudentWelcome } from '../src/services/dailyWelcomeService';
import { speechPlaybackBridge } from '../src/services/nativeBridges';

let sessionListener: ((session: unknown) => void) | undefined;
let latestApp: ReturnType<typeof useKitabuApp> | undefined;

jest.mock('../src/services/developmentReset', () => ({
  resetDevelopmentWebStateOnce: jest.fn(async () => false),
}));

jest.mock('../src/services/authService', () => ({
  clearSavedLoginPassword: jest.fn(async () => undefined),
  completeAccountOnboarding: jest.fn(),
  confirmEmailVerificationToken: jest.fn(),
  deleteMyAccount: jest.fn(),
  loadSavedLoginCredentials: jest.fn(async () => null),
  loadStoredAuthSession: jest.fn(async () => null),
  loginWithPassword: jest.fn(),
  persistAuthSession: jest.fn(async () => undefined),
  requestEmailVerification: jest.fn(),
  requestPhoneAuthCode: jest.fn(),
  refreshAccessSession: jest.fn(),
  restoreStoredAuthSession: jest.fn(async () => null),
  signupWithPassword: jest.fn(),
  verifyPhoneAuthCode: jest.fn(),
  authenticateWithGoogleToken: jest.fn(),
}));

jest.mock('../src/services/requestHelpers', () => ({
  subscribeToAuthSessionUpdates: jest.fn(),
}));

jest.mock('../src/services/dailyWelcomeService', () => ({
  getLocalCalendarDateKey: jest.fn(),
  requestDailyStudentWelcome: jest.fn(),
}));

jest.mock('../src/services/nativeBridges', () => ({
  focusModeBridge: {},
  speechPlaybackBridge: { playAudio: jest.fn() },
}));

function HookHarness() {
  latestApp = useKitabuApp();
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  latestApp = undefined;
  sessionListener = undefined;
  (subscribeToAuthSessionUpdates as jest.Mock).mockImplementation(listener => {
    sessionListener = listener;
    return jest.fn();
  });
  (getLocalCalendarDateKey as jest.Mock).mockReturnValue('2026-08-12');
  (requestDailyStudentWelcome as jest.Mock).mockResolvedValue({ status: 'already_delivered', text: 'delivered' });
});

test('keeps the signup onboarding route when an anonymous session-clear event arrives', async () => {
  await act(async () => {
    ReactTestRenderer.create(<HookHarness />);
  });

  expect(latestApp?.state.isReady).toBe(true);

  await act(async () => {
    latestApp?.actions.openSignupEntry();
  });

  expect(latestApp?.state).toMatchObject({
    authEntryScreen: 'auth',
    authMode: 'signup',
  });

  await act(async () => {
    sessionListener?.(null);
  });

  expect(latestApp?.state).toMatchObject({
    authEntryScreen: 'auth',
    authMode: 'signup',
  });
});

test('retries a pending student welcome once and plays the ready response only once', async () => {
  jest.useFakeTimers();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<HookHarness />);
  });

  const audio = {
    base64Audio: 'AQID',
    mimeType: 'audio/wav',
    model: 'test-model',
    voice: 'Samora',
  };
  (requestDailyStudentWelcome as jest.Mock)
    .mockResolvedValueOnce({ status: 'pending', text: 'queued' })
    .mockResolvedValueOnce({ status: 'ready', text: 'ready', audio });

  const session = {
    user: {
      id: 'student-1',
      roles: ['student'],
      email: 'student@example.test',
    },
  };
  await act(async () => {
    sessionListener?.(session);
  });

  expect(requestDailyStudentWelcome).toHaveBeenCalledWith('2026-08-12');
  expect(speechPlaybackBridge.playAudio).not.toHaveBeenCalled();

  await act(async () => {
    await jest.advanceTimersByTimeAsync(1_000);
  });
  expect(requestDailyStudentWelcome).toHaveBeenCalledTimes(2);
  expect(speechPlaybackBridge.playAudio).toHaveBeenCalledTimes(1);
  expect(speechPlaybackBridge.playAudio).toHaveBeenCalledWith(audio);

  await act(async () => {
    sessionListener?.(session);
  });
  expect(requestDailyStudentWelcome).toHaveBeenCalledTimes(2);
  await act(async () => {
    renderer!.unmount();
  });
  jest.useRealTimers();
});

test('stops polling after the finite pending retry limit', async () => {
  jest.useFakeTimers();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<HookHarness />);
  });
  (requestDailyStudentWelcome as jest.Mock).mockResolvedValue({ status: 'pending', text: 'queued' });

  await act(async () => {
    sessionListener?.({
      user: { id: 'student-1', roles: ['student'], email: 'student@example.test' },
    });
  });
  await act(async () => {
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(3_000);
  });

  expect(requestDailyStudentWelcome).toHaveBeenCalledTimes(3);
  expect(speechPlaybackBridge.playAudio).not.toHaveBeenCalled();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(3_000);
  });
  expect(requestDailyStudentWelcome).toHaveBeenCalledTimes(3);
  await act(async () => {
    renderer!.unmount();
  });
  jest.useRealTimers();
});
