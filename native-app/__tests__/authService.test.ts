import { apiJsonRequest } from '../src/services/requestHelpers';
import { authenticateWithGoogleToken } from '../src/services/authService';

jest.mock('../src/services/requestHelpers', () => ({
  apiJsonRequest: jest.fn(),
}));

jest.mock('../src/services/storage', () => ({
  loadSecureJson: jest.fn(),
  saveSecureJson: jest.fn(async () => undefined),
}));

const response = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: { id: 'user-1', roles: ['parent'] },
  authState: {},
};

beforeEach(() => {
  jest.clearAllMocks();
  (apiJsonRequest as jest.Mock).mockResolvedValue(response);
});

test('preserves explicit Google new-user metadata for signup callers', async () => {
  (apiJsonRequest as jest.Mock).mockResolvedValue({ ...response, isNewGoogleUser: true });
  await expect(authenticateWithGoogleToken(
    { idToken: 'verified-id-token', role: 'parent', acceptedTerms: true },
    { includeSignupMetadata: true },
  )).resolves.toMatchObject({
    session: { user: { id: 'user-1' } },
    isNewGoogleUser: true,
  });
});

test('existing Google authentication is explicit and does not look like a signup', async () => {
  (apiJsonRequest as jest.Mock).mockResolvedValue({ ...response, isNewGoogleUser: false });
  await expect(authenticateWithGoogleToken(
    { idToken: 'verified-id-token' },
    { includeSignupMetadata: true },
  )).resolves.toMatchObject({ isNewGoogleUser: false });
});

test('legacy login callers still receive the session shape', async () => {
  await expect(authenticateWithGoogleToken({ idToken: 'verified-id-token' })).resolves.toMatchObject({
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: { id: 'user-1' },
  });
});
