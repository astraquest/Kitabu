jest.mock('../src/services/runtimeConfig', () => ({
  fetchKitabuApi: jest.fn(),
}));

jest.mock('../src/services/storage', () => ({
  loadSecureJson: jest.fn(),
  saveSecureJson: jest.fn(),
}));

import type { AuthSession } from '../src/types/app';
import { fetchKitabuApi } from '../src/services/runtimeConfig';
import { loadSecureJson, saveSecureJson } from '../src/services/storage';
import {
  apiJsonRequest,
  subscribeToAuthSessionUpdates,
} from '../src/services/requestHelpers';

const fetchKitabuApiMock = fetchKitabuApi as jest.MockedFunction<typeof fetchKitabuApi>;
const loadSecureJsonMock = loadSecureJson as jest.MockedFunction<typeof loadSecureJson>;
const saveSecureJsonMock = saveSecureJson as jest.MockedFunction<typeof saveSecureJson>;

const user: AuthSession['user'] = {
  id: 'student-1',
  email: 'student@kitabu.ai',
  fullName: 'Test Student',
  roles: ['student'],
  emailVerified: true,
  phoneVerified: false,
  onboardingCompleted: true,
  grade: 'Grade 6',
  schoolId: null,
  countryCode: 'KEN',
  curriculumCode: 'CBC',
};

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn(async () => JSON.stringify(body)),
  } as unknown as Response;
}

function installStoredSession(initialSession: AuthSession) {
  let storedSession: AuthSession | null = initialSession;
  loadSecureJsonMock.mockImplementation(async (key, fallback) => {
    if (key === 'auth_session') return storedSession ?? fallback;
    if (key === 'kitabu_device_id') return 'test-device' as never;
    return fallback;
  });
  saveSecureJsonMock.mockImplementation(async (key, value) => {
    if (key === 'auth_session') storedSession = value as AuthSession | null;
  });
  return () => storedSession;
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('refreshes an expired access token and retries the protected request once', async () => {
  const oldSession: AuthSession = {
    accessToken: 'expired-access',
    refreshToken: 'valid-refresh',
    user,
  };
  const newSession: AuthSession = {
    accessToken: 'fresh-access',
    refreshToken: 'fresh-refresh',
    user,
  };
  const getStoredSession = installStoredSession(oldSession);
  let protectedRequestCount = 0;
  fetchKitabuApiMock.mockImplementation(async path => {
    if (path === '/auth/refresh') return jsonResponse(newSession);
    protectedRequestCount += 1;
    return protectedRequestCount === 1
      ? jsonResponse({ message: 'Authentication required' }, 401)
      : jsonResponse({ path: 'ready' });
  });
  const sessionUpdates: Array<AuthSession | null> = [];
  const unsubscribe = subscribeToAuthSessionUpdates(session => sessionUpdates.push(session));

  await expect(apiJsonRequest<{ path: string }>('/learning-paths/french')).resolves.toEqual({
    path: 'ready',
  });

  unsubscribe();
  expect(fetchKitabuApiMock.mock.calls.map(([path]) => path)).toEqual([
    '/learning-paths/french',
    '/auth/refresh',
    '/learning-paths/french',
  ]);
  expect(getStoredSession()).toEqual(newSession);
  expect(sessionUpdates).toEqual([newSession]);
  expect(
    (fetchKitabuApiMock.mock.calls[2][1]?.headers as Record<string, string>).Authorization,
  ).toBe('Bearer fresh-access');
});

test('preserves persistent login when the refresh service is temporarily unavailable', async () => {
  const session: AuthSession = {
    accessToken: 'expired-access',
    refreshToken: 'valid-refresh',
    user,
  };
  const getStoredSession = installStoredSession(session);
  fetchKitabuApiMock.mockImplementation(async path => {
    if (path === '/auth/refresh') throw new Error('Network request failed');
    return jsonResponse({ message: 'Authentication required' }, 401);
  });
  const sessionUpdates: Array<AuthSession | null> = [];
  const unsubscribe = subscribeToAuthSessionUpdates(next => sessionUpdates.push(next));

  await expect(apiJsonRequest('/learning-paths/french')).rejects.toThrow(
    'Please sign in again to continue.',
  );

  unsubscribe();
  expect(getStoredSession()).toEqual(session);
  expect(sessionUpdates).toEqual([]);
});

test('invalidates the session only when the refresh token is rejected', async () => {
  const session: AuthSession = {
    accessToken: 'expired-access',
    refreshToken: 'invalid-refresh',
    user,
  };
  const getStoredSession = installStoredSession(session);
  fetchKitabuApiMock.mockImplementation(async path =>
    path === '/auth/refresh'
      ? jsonResponse({ message: 'Refresh token is invalid' }, 401)
      : jsonResponse({ message: 'Authentication required' }, 401),
  );
  const sessionUpdates: Array<AuthSession | null> = [];
  const unsubscribe = subscribeToAuthSessionUpdates(next => sessionUpdates.push(next));

  await expect(apiJsonRequest('/learning-paths/french')).rejects.toThrow(
    'Please sign in again to continue.',
  );

  unsubscribe();
  expect(getStoredSession()).toBeNull();
  expect(sessionUpdates).toEqual([null]);
});
