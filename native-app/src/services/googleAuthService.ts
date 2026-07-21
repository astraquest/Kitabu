import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { NativeModules, Platform } from 'react-native';

type NativeGoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

WebBrowser.maybeCompleteAuthSession();

function readProcessEnv(name: string) {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.[name];
}

function readExpoExtra(name: string) {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const value = extra?.[name];
  return value?.trim() || undefined;
}

interface NativeGoogleAuthConfig {
  googleWebClientId?: string;
  googleAndroidClientId?: string;
}

function readNativeGoogleAuthConfig() {
  return (NativeModules as { KitabuAuthConfig?: NativeGoogleAuthConfig }).KitabuAuthConfig;
}

export function getGoogleWebClientId() {
  return (
    readProcessEnv('EXPO_PUBLIC_KITABU_GOOGLE_WEB_CLIENT_ID') ||
    readProcessEnv('KITABU_GOOGLE_WEB_CLIENT_ID') ||
    readNativeGoogleAuthConfig()?.googleWebClientId?.trim() ||
    readExpoExtra('googleWebClientId') ||
    ''
  ).trim();
}

export function getGoogleAndroidClientId() {
  return (
    readProcessEnv('EXPO_PUBLIC_KITABU_GOOGLE_ANDROID_CLIENT_ID') ||
    readProcessEnv('KITABU_GOOGLE_ANDROID_CLIENT_ID') ||
    readNativeGoogleAuthConfig()?.googleAndroidClientId?.trim() ||
    readExpoExtra('googleAndroidClientId') ||
    ''
  ).trim();
}

export function getGoogleIosClientId() {
  return (
    readProcessEnv('EXPO_PUBLIC_KITABU_GOOGLE_IOS_CLIENT_ID') ||
    readProcessEnv('KITABU_GOOGLE_IOS_CLIENT_ID') ||
    readExpoExtra('googleIosClientId') ||
    ''
  ).trim();
}

export function getGoogleAuthClientId() {
  if (Platform.OS === 'android') {
    return getGoogleAndroidClientId() || getGoogleWebClientId();
  }
  if (Platform.OS === 'ios') {
    return getGoogleIosClientId() || getGoogleWebClientId();
  }
  return getGoogleWebClientId();
}

export function getGoogleRedirectUri() {
  return (
    readProcessEnv('EXPO_PUBLIC_KITABU_GOOGLE_REDIRECT_URI') ||
    readProcessEnv('KITABU_GOOGLE_REDIRECT_URI') ||
    readExpoExtra('googleRedirectUri') ||
    ''
  ).trim();
}

export function isGoogleAuthConfigured() {
  return Boolean(getGoogleAuthClientId());
}

export function isGoogleAuthAvailableInCurrentRuntime() {
  return Constants.appOwnership !== 'expo';
}

function getNativeGoogleSigninModule(): NativeGoogleSigninModule {
  return require('@react-native-google-signin/google-signin') as NativeGoogleSigninModule;
}

function ensureConfigured() {
  const clientId = getGoogleAuthClientId();
  if (!clientId) {
    throw new Error('Google sign-in is not configured for this app build.');
  }
  return clientId;
}

export async function requestGoogleIdToken() {
  if (!isGoogleAuthAvailableInCurrentRuntime()) {
    throw new Error('Google sign-in requires a development build. Use email sign-in in Expo Go.');
  }

  if (Platform.OS === 'android') {
    const webClientId = getGoogleWebClientId();
    if (!webClientId) {
      throw new Error('Google sign-in is not configured for this app build.');
    }

    const { GoogleSignin, isSuccessResponse } = getNativeGoogleSigninModule();
    GoogleSignin.configure({ webClientId, offlineAccess: false });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      throw new Error('Google sign-in was cancelled.');
    }
    if (!response.data.idToken) {
      throw new Error('Google did not return an ID token for this app configuration.');
    }
    return response.data.idToken;
  }

  const clientId = ensureConfigured();
  const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
  const redirectUri = getGoogleRedirectUri() || AuthSession.makeRedirectUri({ scheme: 'kitabu' });
  const nonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${Date.now()}-${Math.random()}`,
  );

  const request = new AuthSession.AuthRequest({
    clientId,
    extraParams: { nonce },
    redirectUri,
    responseType: AuthSession.ResponseType.IdToken,
    scopes: ['openid', 'email', 'profile'],
    usePKCE: false,
  });

  await request.makeAuthUrlAsync(discovery);
  const response = await request.promptAsync(discovery);
  if (response.type !== 'success') {
    throw new Error('Google sign-in was cancelled.');
  }
  const idToken = response.params.id_token;
  if (!idToken) {
    throw new Error('Google did not return an ID token for this app configuration.');
  }
  return idToken;
}
