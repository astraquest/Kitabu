import { Platform } from 'react-native';

const KITABU_PRODUCTION_API_BASE_URL = 'https://app.kitabu.ai';
const KITABU_STAGING_API_BASE_URL = 'https://staging-api.kitabu.ai';

let activeKitabuApiBaseUrl: string | null = null;

function readProcessEnv(name: string) {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.[name];
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, '');
}

function uniqueBaseUrls(urls: string[]) {
  return Array.from(new Set(urls.filter(Boolean).map(normalizeBaseUrl)));
}

function getLocalDevelopmentApiBaseUrl() {
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
}

function getLocalDevelopmentApiBaseUrls() {
  return Platform.OS === 'android'
    ? [getLocalDevelopmentApiBaseUrl(), 'http://localhost:4000']
    : [getLocalDevelopmentApiBaseUrl()];
}

function isRetryableNetworkError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /network request failed|fetch failed|load failed|networkerror/i.test(error.message);
}

export function getKitabuRuntimeEnvironment() {
  return (
    readProcessEnv('KITABU_APP_ENV') ||
    readProcessEnv('KITABU_RUNTIME_ENV') ||
    (__DEV__ ? 'development' : 'production')
  );
}

export function getKitabuApiBaseUrls() {
  const configured =
    readProcessEnv('KITABU_API_BASE_URL') ||
    readProcessEnv('KITABU_AI_PROXY_URL') ||
    readProcessEnv('AI_PROXY_URL');

  if (configured) {
    return [normalizeBaseUrl(configured)];
  }

  const envName = getKitabuRuntimeEnvironment();

  if (envName === 'staging') {
    return [KITABU_STAGING_API_BASE_URL];
  }

  if (envName === 'production') {
    return [KITABU_PRODUCTION_API_BASE_URL];
  }

  if (__DEV__) {
    return uniqueBaseUrls([
      ...getLocalDevelopmentApiBaseUrls(),
      KITABU_PRODUCTION_API_BASE_URL,
    ]);
  }

  throw new Error('KITABU_API_BASE_URL must be configured for release builds');
}

export function getKitabuApiBaseUrl() {
  return activeKitabuApiBaseUrl ?? getKitabuApiBaseUrls()[0] ?? null;
}

export async function fetchKitabuApi(path: string, init?: RequestInit) {
  const baseUrls = getKitabuApiBaseUrls();
  const orderedBaseUrls = activeKitabuApiBaseUrl
    ? uniqueBaseUrls([activeKitabuApiBaseUrl, ...baseUrls])
    : baseUrls;

  let lastError: unknown = null;

  for (const baseUrl of orderedBaseUrls) {
    try {
      const response = await fetch(`${baseUrl}${path}`, init);
      activeKitabuApiBaseUrl = baseUrl;
      return response;
    } catch (error) {
      lastError = error;
      if (!isRetryableNetworkError(error)) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error('Network request failed');
}

export function resetKitabuApiRuntimeStateForTests() {
  activeKitabuApiBaseUrl = null;
}
