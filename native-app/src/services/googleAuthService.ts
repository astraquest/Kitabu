import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

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

export function getGoogleWebClientId() {
  return (
    readProcessEnv('EXPO_PUBLIC_KITABU_GOOGLE_WEB_CLIENT_ID') ||
    readProcessEnv('KITABU_GOOGLE_WEB_CLIENT_ID') ||
    readExpoExtra('googleWebClientId') ||
    ''
  ).trim();
}

export function isGoogleAuthConfigured() {
  return Boolean(getGoogleWebClientId());
}

export function isGoogleAuthAvailableInCurrentRuntime() {
  return Constants.appOwnership !== 'expo';
}

function ensureConfigured() {
  const webClientId = getGoogleWebClientId();
  if (!webClientId) {
    throw new Error('Google sign-in is not configured for this app build.');
  }
  return webClientId;
}

export async function requestGoogleIdToken() {
  const webClientId = ensureConfigured();
  if (!isGoogleAuthAvailableInCurrentRuntime()) {
    throw new Error('Google sign-in requires a development build. Use email or phone sign-in in Expo Go.');
  }
  const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'kitabu',
  });
  const nonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${Date.now()}-${Math.random()}`,
  );

  const request = new AuthSession.AuthRequest({
    clientId: webClientId,
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
