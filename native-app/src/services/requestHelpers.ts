import { fetchKitabuApi } from './runtimeConfig';
import { loadSecureJson, saveSecureJson } from './storage';

const AUTH_SESSION_STORAGE_KEY = 'auth_session';
const DEVICE_ID_STORAGE_KEY = 'kitabu_device_id';

interface StoredSession {
  accessToken?: string;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function randomHex(byteCount: number) {
  const cryptoSource = (globalThis as {
    crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array };
  }).crypto;

  if (cryptoSource?.getRandomValues) {
    return bytesToHex(cryptoSource.getRandomValues(new Uint8Array(byteCount)));
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`;
}

function normalizeHeaders(headers?: RequestInit['headers']) {
  if (!headers) {
    return {};
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  return headers as Record<string, string>;
}

export async function getKitabuDeviceId() {
  let deviceId = await loadSecureJson<string | null>(DEVICE_ID_STORAGE_KEY, null);
  if (!deviceId) {
    deviceId = `kitabu-${randomHex(16)}`;
    await saveSecureJson(DEVICE_ID_STORAGE_KEY, deviceId);
  }

  return deviceId;
}

export async function buildKitabuRequestHeaders(
  headers?: RequestInit['headers'],
  includeAuth = true,
  includeJsonContentType = true,
) {
  const [session, deviceId] = await Promise.all([
    includeAuth ? loadSecureJson<StoredSession>(AUTH_SESSION_STORAGE_KEY, {}) : Promise.resolve<StoredSession>({}),
    getKitabuDeviceId(),
  ]);

  return {
    ...(includeJsonContentType ? { 'Content-Type': 'application/json' } : {}),
    'x-kitabu-device-id': deviceId,
    'x-kitabu-device-label': 'Kitabu Native App',
    ...(session?.accessToken
      ? {
          Authorization: `Bearer ${session.accessToken}`,
        }
      : {}),
    ...normalizeHeaders(headers),
  };
}

type ApiErrorPayload = {
  code?: unknown;
  error?: unknown;
  message?: unknown;
  issues?: unknown;
  validation?: unknown;
};

const FIELD_LABELS: Record<string, string> = {
  acceptedTerms: 'terms acceptance',
  code: 'verification code',
  email: 'email address',
  fullName: 'full name',
  idToken: 'Google sign-in',
  password: 'password',
  phoneNumber: 'phone number',
  role: 'account role',
};

function parseJsonLike(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function normalizePath(path: unknown): string | null {
  if (Array.isArray(path)) {
    return path.filter(part => typeof part === 'string' || typeof part === 'number').join('.');
  }
  return typeof path === 'string' ? path : null;
}

function collectValidationIssues(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.flatMap(item => collectValidationIssues(item));
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;
  const issues: Array<Record<string, unknown>> = [];
  if (typeof record.code === 'string' || typeof record.message === 'string') {
    issues.push(record);
  }

  for (const key of ['issues', 'validation', 'errors']) {
    issues.push(...collectValidationIssues(record[key]));
  }

  return issues;
}

function validationIssueMessage(issue: Record<string, unknown>) {
  const path = normalizePath(issue.path);
  const field = path?.split('.').filter(Boolean).at(-1);
  const label = field ? FIELD_LABELS[field] || field.replace(/([A-Z])/g, ' $1').toLowerCase() : null;
  const code = typeof issue.code === 'string' ? issue.code : null;
  const minimum = typeof issue.minimum === 'number' ? issue.minimum : null;

  if (code === 'invalid_format' && field === 'email') {
    return 'Enter a valid email address.';
  }
  if (code === 'invalid_format' && field === 'phoneNumber') {
    return 'Enter a valid phone number.';
  }
  if (code === 'too_small' && label && minimum) {
    return `Enter a ${label} with at least ${minimum} characters.`;
  }
  if (code === 'invalid_type' && label) {
    return `Check the ${label} and try again.`;
  }
  if (label) {
    return `Check the ${label} and try again.`;
  }

  return null;
}

export function getUserFacingApiError(payload: unknown, fallbackMessage = 'Request failed') {
  const errorPayload = (payload && typeof payload === 'object' ? payload : {}) as ApiErrorPayload;
  const rawMessage = typeof errorPayload.message === 'string' ? errorPayload.message : null;
  const internalErrorPattern =
    /(cannot read propert|undefined is not an object|is not a function|typeerror|referenceerror|syntaxerror)/i;

  if (rawMessage && internalErrorPattern.test(rawMessage)) {
    return fallbackMessage;
  }

  const parsedMessage = rawMessage ? parseJsonLike(rawMessage) : null;
  const issues = [
    ...collectValidationIssues(errorPayload.issues),
    ...collectValidationIssues(errorPayload.validation),
    ...collectValidationIssues(parsedMessage),
  ];

  const issueMessage = issues.map(validationIssueMessage).find(Boolean);
  if (issueMessage) {
    return issueMessage;
  }

  if (rawMessage && !parseJsonLike(rawMessage)) {
    return rawMessage.slice(0, 220);
  }

  if (typeof errorPayload.error === 'string' && errorPayload.error !== 'Bad Request') {
    return errorPayload.error.slice(0, 220);
  }

  return fallbackMessage;
}

export async function readJsonResponse<T>(
  response: Response,
  fallbackMessage = 'Request failed',
): Promise<T & { message?: string }> {
  const text = await response.text();
  if (!text) {
    return {} as T & { message?: string };
  }

  try {
    return JSON.parse(text) as T & { message?: string };
  } catch {
    if (!response.ok) {
      throw new Error(getUserFacingApiError({ message: text }, fallbackMessage));
    }
    throw new Error('Invalid response from server');
  }
}

export async function apiJsonRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetchKitabuApi(path, {
    ...options,
    headers: await buildKitabuRequestHeaders(options.headers, true, Boolean(options.body)),
  });

  const payload = await readJsonResponse<T>(response);
  if (!response.ok) {
    throw new Error(getUserFacingApiError(payload));
  }

  return payload;
}
