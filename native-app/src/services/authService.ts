import {
  AuthSession,
  AuthState,
  GenderOption,
  OnboardingMascotKey,
  OnboardingPersonalization,
  PublicSignupRole,
} from '../types/app';
import { apiJsonRequest } from './requestHelpers';
import { loadSecureJson, saveSecureJson } from './storage';

const AUTH_SESSION_STORAGE_KEY = 'auth_session';
const LOGIN_CREDENTIALS_STORAGE_KEY = 'login_credentials';

export interface SavedLoginCredentials {
  email: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthSession['user'];
  authState: AuthState;
}

export interface PhoneCodeResponse {
  message: string;
  expiresInSeconds: number;
  developmentCode?: string;
}

async function persistLoginResponse(payload: LoginResponse): Promise<AuthSession> {
  const session: AuthSession = {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    user: payload.user,
  };
  await persistAuthSession(session);
  return session;
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return apiJsonRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function loadStoredAuthSession() {
  return loadSecureJson<AuthSession | null>(AUTH_SESSION_STORAGE_KEY, null);
}

export async function persistAuthSession(session: AuthSession | null) {
  await saveSecureJson(AUTH_SESSION_STORAGE_KEY, session);
}

export async function loadSavedLoginCredentials(): Promise<SavedLoginCredentials | null> {
  const credentials = await loadSecureJson<SavedLoginCredentials | null>(
    LOGIN_CREDENTIALS_STORAGE_KEY,
    null,
  );

  if (!credentials || typeof credentials.email !== 'string') {
    return null;
  }

  // Migrate legacy records that contained a raw password by overwriting them
  // with the email-only shape before returning control to the UI.
  await saveLoginCredentials(credentials.email);
  return { email: credentials.email };
}

export async function saveLoginCredentials(email: string): Promise<void> {
  await saveSecureJson<SavedLoginCredentials>(LOGIN_CREDENTIALS_STORAGE_KEY, {
    email: email.trim(),
  });
}

export async function clearSavedLoginPassword(): Promise<void> {
  const credentials = await loadSavedLoginCredentials();
  if (!credentials) {
    return;
  }

  await saveLoginCredentials(credentials.email);
}

export async function restoreStoredAuthSession(): Promise<AuthSession | null> {
  const storedSession = await loadStoredAuthSession();
  if (!storedSession) {
    return null;
  }

  try {
    return await refreshAccessSession(storedSession.refreshToken);
  } catch {
    // A temporary refresh failure must not turn an app restart into a logout.
    return storedSession;
  }
}

export async function loginWithPassword(email: string, password: string): Promise<AuthSession> {
  const payload = await postJson<LoginResponse>('/auth/login', { email, password });
  const session = await persistLoginResponse(payload);
  await saveLoginCredentials(email);
  return session;
}

export async function signupWithPassword(input: {
  fullName: string;
  email: string;
  password: string;
  role: PublicSignupRole;
  acceptedTerms: true;
  schoolId?: string | null;
  gender?: GenderOption;
  grade?: string | null;
  mpesaPhoneNumber?: string | null;
  onboardingCompleted?: boolean;
  mascotKey?: OnboardingMascotKey;
}): Promise<AuthSession> {
  const payload = await postJson<LoginResponse>('/auth/signup', input);
  const session = await persistLoginResponse(payload);
  await saveLoginCredentials(input.email);
  return session;
}

export async function requestPhoneAuthCode(input: {
  purpose: 'login' | 'signup';
  phoneNumber: string;
  fullName?: string;
  role?: PublicSignupRole;
  acceptedTerms?: true;
}): Promise<PhoneCodeResponse> {
  return postJson<PhoneCodeResponse>('/auth/phone/request', input);
}

export async function verifyPhoneAuthCode(input: {
  purpose: 'login' | 'signup';
  phoneNumber: string;
  code: string;
}): Promise<AuthSession> {
  const payload = await postJson<LoginResponse>('/auth/phone/verify', input);
  return persistLoginResponse(payload);
}

export async function authenticateWithGoogleToken(input: {
  idToken: string;
  role?: PublicSignupRole;
  acceptedTerms?: true;
}): Promise<AuthSession> {
  const payload = await postJson<LoginResponse>('/auth/google', input);
  return persistLoginResponse(payload);
}

export async function refreshAccessSession(refreshToken: string): Promise<AuthSession> {
  const payload = await postJson<LoginResponse>('/auth/refresh', {
    refreshToken,
  });
  const session: AuthSession = {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    user: payload.user,
  };
  await persistAuthSession(session);
  return session;
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return postJson<{ message: string }>('/auth/forgot-password', { email });
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ message: string }> {
  return postJson<{ message: string }>('/auth/password/reset', { token, newPassword });
}

export async function requestEmailVerification(email: string): Promise<{ message: string }> {
  return postJson<{ message: string }>('/auth/email-verification/resend', { email });
}

export async function confirmEmailVerificationToken(token: string): Promise<{ message: string }> {
  return postJson<{ message: string }>('/auth/email-verification/confirm', { token });
}

export async function deleteMyAccount() {
  const session = await loadStoredAuthSession();
  if (!session?.accessToken) {
    throw new Error('Authentication required');
  }

  const payload = await apiJsonRequest<{
    deletionRequested?: boolean;
    message?: string;
  }>('/me/account', {
    method: 'DELETE',
    body: JSON.stringify({ confirmationText: 'DELETE MY ACCOUNT' }),
  });

  return {
    deletionRequested: Boolean(payload.deletionRequested),
    message: payload.message || 'Account deletion requested.',
  };
}

export async function completeAccountOnboarding(input: {
  schoolId?: string | null;
  gender: GenderOption;
  grade: string;
  mpesaPhoneNumber?: string | null;
  school?: string;
  county?: string;
  subjects?: string[];
  subjectIds?: string[];
  mascotKey?: OnboardingMascotKey;
  countryCode?: string;
  curriculumCode?: string;
  onboardingPersonalization?: OnboardingPersonalization;
}): Promise<AuthSession> {
  const session = await loadStoredAuthSession();
  if (!session?.accessToken) {
    throw new Error('Authentication required');
  }

  const payload = await apiJsonRequest<{
    accessToken: string;
    user: AuthSession['user'];
  }>('/me/onboarding', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  const nextSession: AuthSession = {
    accessToken: payload.accessToken,
    refreshToken: session.refreshToken,
    user: payload.user,
  };
  await persistAuthSession(nextSession);
  return nextSession;
}

export const completeStudentOnboarding = completeAccountOnboarding;
