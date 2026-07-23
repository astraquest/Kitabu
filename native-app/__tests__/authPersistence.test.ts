import type { AuthSession } from '../src/types/app';
import { apiJsonRequest } from '../src/services/requestHelpers';
import { loadSecureJson, saveSecureJson } from '../src/services/storage';
import {
  clearSavedLoginPassword,
  loadSavedLoginCredentials,
  loginWithPassword,
  restoreStoredAuthSession,
} from '../src/services/authService';

jest.mock('../src/services/requestHelpers', () => ({
  apiJsonRequest: jest.fn(),
}));

jest.mock('../src/services/storage', () => ({
  loadSecureJson: jest.fn(),
  saveSecureJson: jest.fn(() => Promise.resolve()),
}));

const request = apiJsonRequest as jest.Mock;
const loadSecure = loadSecureJson as jest.Mock;
const saveSecure = saveSecureJson as jest.Mock;

const session: AuthSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: {
    id: 'user-1',
    schoolId: null,
    email: 'learner@kitabu.ai',
    fullName: 'Kitabu Learner',
    emailVerified: true,
    roles: ['student'],
  },
};

beforeEach(() => {
  request.mockReset();
  loadSecure.mockReset();
  saveSecure.mockClear();
});

test('securely remembers email and password after a successful sign in', async () => {
  request.mockResolvedValue({ ...session, authState: 'authenticated' });

  await expect(loginWithPassword(' learner@kitabu.ai ', 'secret-pass')).resolves.toEqual(session);

  expect(saveSecure).toHaveBeenCalledWith('auth_session', session);
  expect(saveSecure).toHaveBeenCalledWith('login_credentials', {
    email: 'learner@kitabu.ai',
    password: 'secret-pass',
  });
});

test('keeps the stored session when refresh is temporarily unavailable', async () => {
  loadSecure.mockResolvedValue(session);
  request.mockRejectedValue(new Error('Network unavailable'));

  await expect(restoreStoredAuthSession()).resolves.toEqual(session);
  expect(saveSecure).not.toHaveBeenCalledWith('auth_session', null);
});

test('loads saved credentials for sign-in field hydration', async () => {
  loadSecure.mockResolvedValue({
    email: 'learner@kitabu.ai',
    password: 'secret-pass',
  });

  await expect(loadSavedLoginCredentials()).resolves.toEqual({
    email: 'learner@kitabu.ai',
    password: 'secret-pass',
  });
});

test('clears a stale saved password after account recovery', async () => {
  loadSecure.mockResolvedValue({
    email: 'learner@kitabu.ai',
    password: 'old-password',
  });

  await clearSavedLoginPassword();

  expect(saveSecure).toHaveBeenCalledWith('login_credentials', {
    email: 'learner@kitabu.ai',
    password: '',
  });
});
