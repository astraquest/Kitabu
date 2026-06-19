import { NativeModules } from 'react-native';

describe('googleAuthService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete NativeModules.KitabuAuthConfig;
  });

  test('fails clearly when the build has no Google web client ID', async () => {
    const { requestGoogleIdToken } = require('../src/services/googleAuthService');
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');

    await expect(requestGoogleIdToken()).rejects.toThrow(
      'Google sign-in is not configured for this app build.',
    );
    expect(GoogleSignin.configure).not.toHaveBeenCalled();
  });

  test('configures Google sign-in and returns the ID token', async () => {
    NativeModules.KitabuAuthConfig = { googleWebClientId: 'web-client-id.apps.googleusercontent.com' };
    const googleSignInModule = require('@react-native-google-signin/google-signin');
    const { GoogleSignin } = googleSignInModule;
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      type: 'success',
      data: { idToken: 'verified-google-id-token' },
    });
    const { requestGoogleIdToken } = require('../src/services/googleAuthService');

    await expect(requestGoogleIdToken()).resolves.toBe('verified-google-id-token');
    expect(GoogleSignin.configure).toHaveBeenCalledWith({
      webClientId: 'web-client-id.apps.googleusercontent.com',
    });
  });

  test('fails clearly when Google sign-in is cancelled', async () => {
    NativeModules.KitabuAuthConfig = { googleWebClientId: 'web-client-id.apps.googleusercontent.com' };
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ type: 'cancelled', data: null });
    const { requestGoogleIdToken } = require('../src/services/googleAuthService');

    await expect(requestGoogleIdToken()).rejects.toThrow('Google sign-in was cancelled.');
  });

  test('fails clearly when Google returns no ID token', async () => {
    NativeModules.KitabuAuthConfig = { googleWebClientId: 'web-client-id.apps.googleusercontent.com' };
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      type: 'success',
      data: { idToken: null },
    });
    const { requestGoogleIdToken } = require('../src/services/googleAuthService');

    await expect(requestGoogleIdToken()).rejects.toThrow(
      'Google did not return an ID token for this app configuration.',
    );
  });
});
