import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

const KITABU_PRODUCTION_API_BASE_URL = 'https://app.kitabu.ai';
const KITABU_STAGING_API_BASE_URL = 'https://staging-api.kitabu.ai';

let activeKitabuApiBaseUrl: string | null = null;

function readProcessEnv(name: string) {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.[name];
}

function readExpoExtra(name: string) {
  const extra = Constants.expoConfig?.extra as Record<string, string | boolean | undefined> | undefined;
  const value = extra?.[name];
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return value?.trim() || undefined;
}

function parseBooleanFlag(value?: string) {
  if (!value) {
    return null;
  }

  if (/^(1|true|yes|on)$/i.test(value)) {
    return true;
  }
  if (/^(0|false|no|off)$/i.test(value)) {
    return false;
  }

  return null;
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

function readExpoDevelopmentHost() {
  const sourceCode = NativeModules?.SourceCode as { scriptURL?: string } | undefined;
  const sourceCodeHost = sourceCode?.scriptURL?.match(/^https?:\/\/([^:/]+)/)?.[1];
  if (sourceCodeHost) {
    return sourceCodeHost;
  }

  const constants = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    manifest?: { debuggerHost?: string };
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
  };
  const hostUri =
    constants.expoConfig?.hostUri ||
    constants.manifest2?.extra?.expoGo?.debuggerHost ||
    constants.manifest?.debuggerHost;
  return hostUri?.split(':')[0]?.trim() || undefined;
}

function getExpoDevelopmentApiBaseUrl() {
  const host = readExpoDevelopmentHost();
  return host ? `http://${host}:4000` : null;
}

function getLocalDevelopmentApiBaseUrls() {
  const expoHostUrl = getExpoDevelopmentApiBaseUrl();
  return Platform.OS === 'android'
    ? uniqueBaseUrls([getLocalDevelopmentApiBaseUrl(), expoHostUrl ?? '', 'http://localhost:4000'])
    : uniqueBaseUrls([expoHostUrl ?? '', getLocalDevelopmentApiBaseUrl()]);
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
    readProcessEnv('EXPO_PUBLIC_KITABU_APP_ENV') ||
    readExpoExtra('kitabuRuntimeEnv') ||
    readProcessEnv('KITABU_RUNTIME_ENV') ||
    (__DEV__ ? 'development' : 'production')
  );
}

export function isKitabuDevelopmentWebRuntime() {
  return __DEV__ && Platform.OS === 'web' && getKitabuRuntimeEnvironment() === 'development';
}

export function areExternalPaymentsEnabled() {
  const configured = parseBooleanFlag(
    readProcessEnv('KITABU_ENABLE_EXTERNAL_PAYMENTS') ||
      readProcessEnv('EXPO_PUBLIC_KITABU_ENABLE_EXTERNAL_PAYMENTS') ||
      readExpoExtra('kitabuExternalPaymentsEnabled'),
  );
  if (configured !== null) {
    return configured;
  }

  return true;
}

export function getKitabuApiBaseUrls() {
  const configured =
    readProcessEnv('KITABU_API_BASE_URL') ||
    readProcessEnv('EXPO_PUBLIC_KITABU_API_BASE_URL') ||
    readExpoExtra('kitabuApiBaseUrl') ||
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
