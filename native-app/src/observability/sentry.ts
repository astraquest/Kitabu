import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

const DEFAULT_SENTRY_DSN =
  'https://5901f5f9a6ef0a0e6d585c22f26f61db@o4511822763393024.ingest.us.sentry.io/4511822768504832';

const SECRET_KEY = /(authorization|cookie|password|passwd|secret|token|api[-_]?key|client[-_]?secret)/i;

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      SECRET_KEY.test(key) ? '[REDACTED]' : redactValue(nestedValue),
    ]),
  );
}

function redactEvent<T extends object>(event: T): T {
  return redactValue(event) as T;
}

function getExtraValue(name: string): string | undefined {
  const value = Constants.expoConfig?.extra?.[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function getSentryConfig() {
  const version = Constants.expoConfig?.version || '0.0.0';
  const buildVersion = Constants.nativeBuildVersion || 'dev';
  const runtimeEnvironment =
    getExtraValue('kitabuRuntimeEnv') ||
    process.env.EXPO_PUBLIC_KITABU_APP_ENV ||
    (__DEV__ ? 'development' : 'production');

  return {
    dsn: getExtraValue('sentryDsn') || process.env.EXPO_PUBLIC_SENTRY_DSN || DEFAULT_SENTRY_DSN,
    environment: runtimeEnvironment,
    release: `ai.kitabu2.twa@${version}+${buildVersion}`,
    dist: buildVersion,
  };
}

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  initialized = true;

  const config = getSentryConfig();
  Sentry.init({
    ...config,
    enableNative: true,
    enableAutoSessionTracking: true,
    enableAutoPerformanceTracing: true,
    tracesSampleRate: __DEV__ ? 0 : 0.1,
    profilesSampleRate: __DEV__ ? 0 : 0.05,
    maxBreadcrumbs: 100,
    beforeSend: event => redactEvent(event),
  });
}

export function captureAppException(error: unknown, context?: Record<string, unknown>): void {
  Sentry.captureException(error, context ? { extra: redactValue(context) as Record<string, unknown> } : undefined);
}

export function addAppBreadcrumb(message: string, data?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({
    category: 'kitabu',
    message,
    level: 'info',
    data: data ? (redactValue(data) as Record<string, unknown>) : undefined,
  });
}

initSentry();

export { Sentry };
