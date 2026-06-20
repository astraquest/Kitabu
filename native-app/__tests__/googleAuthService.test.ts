describe('googleAuthService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.EXPO_PUBLIC_KITABU_GOOGLE_WEB_CLIENT_ID;
    delete process.env.KITABU_GOOGLE_WEB_CLIENT_ID;
  });

  test('fails clearly when the build has no Google web client ID', async () => {
    const { requestGoogleIdToken } = require('../src/services/googleAuthService');
    const AuthSession = require('expo-auth-session');

    await expect(requestGoogleIdToken()).rejects.toThrow(
      'Google sign-in is not configured for this app build.',
    );
    expect(AuthSession.AuthRequest).not.toHaveBeenCalled();
  });

  test('starts an Expo auth session and returns the ID token', async () => {
    process.env.EXPO_PUBLIC_KITABU_GOOGLE_WEB_CLIENT_ID = 'web-client-id.apps.googleusercontent.com';
    const AuthSession = require('expo-auth-session');
    AuthSession.__promptAsync.mockResolvedValue({
      type: 'success',
      params: { id_token: 'verified-google-id-token' },
    });
    const { requestGoogleIdToken } = require('../src/services/googleAuthService');

    await expect(requestGoogleIdToken()).resolves.toBe('verified-google-id-token');
    expect(AuthSession.AuthRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'web-client-id.apps.googleusercontent.com',
        responseType: AuthSession.ResponseType.IdToken,
        scopes: ['openid', 'email', 'profile'],
      }),
    );
  });

  test('fails clearly when Google sign-in is cancelled', async () => {
    process.env.EXPO_PUBLIC_KITABU_GOOGLE_WEB_CLIENT_ID = 'web-client-id.apps.googleusercontent.com';
    const AuthSession = require('expo-auth-session');
    AuthSession.__promptAsync.mockResolvedValue({ type: 'cancel' });
    const { requestGoogleIdToken } = require('../src/services/googleAuthService');

    await expect(requestGoogleIdToken()).rejects.toThrow('Google sign-in was cancelled.');
  });

  test('fails clearly when Google returns no ID token', async () => {
    process.env.EXPO_PUBLIC_KITABU_GOOGLE_WEB_CLIENT_ID = 'web-client-id.apps.googleusercontent.com';
    const AuthSession = require('expo-auth-session');
    AuthSession.__promptAsync.mockResolvedValue({
      type: 'success',
      params: {},
    });
    const { requestGoogleIdToken } = require('../src/services/googleAuthService');

    await expect(requestGoogleIdToken()).rejects.toThrow(
      'Google did not return an ID token for this app configuration.',
    );
  });
});
