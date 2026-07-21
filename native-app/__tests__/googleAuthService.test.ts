describe('googleAuthService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.EXPO_PUBLIC_KITABU_GOOGLE_WEB_CLIENT_ID;
    delete process.env.KITABU_GOOGLE_WEB_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_KITABU_GOOGLE_ANDROID_CLIENT_ID;
    delete process.env.KITABU_GOOGLE_ANDROID_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_KITABU_GOOGLE_IOS_CLIENT_ID;
    delete process.env.KITABU_GOOGLE_IOS_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_KITABU_GOOGLE_REDIRECT_URI;
    delete process.env.KITABU_GOOGLE_REDIRECT_URI;
    const { NativeModules } = require('react-native');
    const { Platform } = require('react-native');
    Platform.OS = 'web';
    delete NativeModules.KitabuAuthConfig;
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

  test('uses the native Android build config when env and Expo config are absent', () => {
    const { NativeModules } = require('react-native');
    NativeModules.KitabuAuthConfig = {
      googleWebClientId: 'native-web-client-id.apps.googleusercontent.com',
      googleAndroidClientId: 'native-android-client-id.apps.googleusercontent.com',
    };
    const { getGoogleAndroidClientId, getGoogleWebClientId } = require('../src/services/googleAuthService');

    expect(getGoogleWebClientId()).toBe('native-web-client-id.apps.googleusercontent.com');
    expect(getGoogleAndroidClientId()).toBe('native-android-client-id.apps.googleusercontent.com');
  });

  test('uses native Google Sign-In on Android and returns its ID token', async () => {
    const { Platform } = require('react-native');
    Platform.OS = 'android';
    process.env.EXPO_PUBLIC_KITABU_GOOGLE_WEB_CLIENT_ID = 'web-client-id.apps.googleusercontent.com';
    process.env.EXPO_PUBLIC_KITABU_GOOGLE_ANDROID_CLIENT_ID = 'android-client-id.apps.googleusercontent.com';
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    GoogleSignin.signIn.mockResolvedValue({
      type: 'success',
      data: { idToken: 'verified-google-id-token' },
    });
    const { requestGoogleIdToken } = require('../src/services/googleAuthService');

    await expect(requestGoogleIdToken()).resolves.toBe('verified-google-id-token');
    expect(GoogleSignin.configure).toHaveBeenCalledWith({
      webClientId: 'web-client-id.apps.googleusercontent.com',
      offlineAccess: false,
    });
    expect(GoogleSignin.hasPlayServices).toHaveBeenCalledWith({ showPlayServicesUpdateDialog: true });
    expect(GoogleSignin.signIn).toHaveBeenCalledTimes(1);
  });

  test('uses the iOS client ID for iOS auth sessions', async () => {
    const { Platform } = require('react-native');
    Platform.OS = 'ios';
    process.env.EXPO_PUBLIC_KITABU_GOOGLE_WEB_CLIENT_ID = 'web-client-id.apps.googleusercontent.com';
    process.env.EXPO_PUBLIC_KITABU_GOOGLE_IOS_CLIENT_ID = 'ios-client-id.apps.googleusercontent.com';
    const AuthSession = require('expo-auth-session');
    AuthSession.__promptAsync.mockResolvedValue({
      type: 'success',
      params: { id_token: 'verified-google-id-token' },
    });
    const { requestGoogleIdToken } = require('../src/services/googleAuthService');

    await expect(requestGoogleIdToken()).resolves.toBe('verified-google-id-token');
    expect(AuthSession.AuthRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'ios-client-id.apps.googleusercontent.com',
      }),
    );
  });

  test('passes a configured Google redirect URI to the auth request', async () => {
    process.env.EXPO_PUBLIC_KITABU_GOOGLE_WEB_CLIENT_ID = 'web-client-id.apps.googleusercontent.com';
    process.env.EXPO_PUBLIC_KITABU_GOOGLE_REDIRECT_URI = 'http://localhost:8098';
    const AuthSession = require('expo-auth-session');
    AuthSession.__promptAsync.mockResolvedValue({
      type: 'success',
      params: { id_token: 'verified-google-id-token' },
    });
    const { requestGoogleIdToken } = require('../src/services/googleAuthService');

    await expect(requestGoogleIdToken()).resolves.toBe('verified-google-id-token');
    expect(AuthSession.AuthRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUri: 'http://localhost:8098',
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

  test('does not load the native Google module in Expo Go', async () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        appOwnership: 'expo',
        expoConfig: {
          extra: {
            googleIosClientId: 'ios-client-id.apps.googleusercontent.com',
          },
        },
      },
    }));
    jest.doMock('@react-native-google-signin/google-signin', () => {
      throw new Error('Native Google Sign-In must not load in Expo Go.');
    });
    const { Platform } = require('react-native');
    Platform.OS = 'ios';

    let requestGoogleIdToken: () => Promise<string>;
    expect(() => {
      ({ requestGoogleIdToken } = require('../src/services/googleAuthService'));
    }).not.toThrow();

    await expect(requestGoogleIdToken!()).rejects.toThrow(
      'Google sign-in requires a development build. Use email sign-in in Expo Go.',
    );
  });
});
