import { NativeModules, Platform } from 'react-native';
import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';

const authConfigModule = NativeModules.KitabuAuthConfig as
  | { googleWebClientId?: string }
  | undefined;

let configured = false;

export function getGoogleWebClientId() {
  return authConfigModule?.googleWebClientId?.trim() || '';
}

export function isGoogleAuthConfigured() {
  return Boolean(getGoogleWebClientId());
}

function ensureConfigured() {
  const webClientId = getGoogleWebClientId();
  if (!webClientId) {
    throw new Error('Google sign-in is not configured for this app build.');
  }
  if (!configured) {
    GoogleSignin.configure({ webClientId });
    configured = true;
  }
}

export async function requestGoogleIdToken() {
  ensureConfigured();
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    throw new Error('Google sign-in was cancelled.');
  }
  if (!response.data.idToken) {
    throw new Error('Google did not return an ID token for this app configuration.');
  }
  return response.data.idToken;
}
