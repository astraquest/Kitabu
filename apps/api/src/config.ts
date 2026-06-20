import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFileIfPresent(filename: string) {
  loadEnv({
    path: path.resolve(currentDir, '..', filename),
    override: false
  });
}

const runtimeEnv =
  process.env.KITABU_RUNTIME_ENV ??
  process.env.KITABU_NODE_ENV ??
  process.env.NODE_ENV ??
  'development';
const defaultPort = process.env.PORT ?? '4000';

loadEnvFileIfPresent('.env');
loadEnvFileIfPresent(`.env.${runtimeEnv}`);

const booleanish = z.preprocess(value => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }
  return value;
}, z.boolean());

function trimOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const configSchema = z.object({
  KITABU_RUNTIME_ENV: z.string().default(runtimeEnv),
  KITABU_NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  KITABU_HOST: z.string().default('0.0.0.0'),
  KITABU_PORT: z.coerce.number().int().positive().default(Number(defaultPort)),
  KITABU_TRUST_PROXY: booleanish.default(false),
  KITABU_ENABLE_API_DOCS: booleanish.default(false),
  KITABU_BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(1024 * 1024),
  KITABU_DATABASE_URL: z.string().min(1),
  KITABU_REDIS_URL: z.string().min(1),
  KITABU_JWT_ISSUER: z.string().min(1),
  KITABU_JWT_AUDIENCE: z.string().min(1),
  KITABU_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  KITABU_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  KITABU_STEP_UP_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  KITABU_JWT_PRIVATE_KEY: z.string().min(1),
  KITABU_JWT_PUBLIC_KEY: z.string().min(1),
  KITABU_OPENAI_API_KEY: z.string().optional(),
  KITABU_OPENAI_STUDENT_MODEL: z.string().default('gpt-5.4-nano'),
  KITABU_OPENAI_REASONING_MODEL: z.string().default('gpt-5.1'),
  KITABU_OPENAI_REASONING_EFFORT: z.enum(['minimal', 'low', 'medium', 'high']).default('medium'),
  KITABU_OPENAI_TRANSCRIPTION_MODEL: z.string().default('whisper-1'),
  KITABU_GEMINI_API_KEY: z.string().optional(),
  KITABU_GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  KITABU_KSH_PER_USD: z.coerce.number().positive().default(129.5),
  KITABU_ADMIN_WEB_ORIGIN: z.string().default('https://admin.kitabu.ai'),
  KITABU_NATIVE_APP_ORIGIN: z.string().default('kitabu-native-app'),
  KITABU_ADMIN_WEB_BASE_URL: z.string().default('https://admin.kitabu.ai'),
  KITABU_LANDING_WEB_BASE_URL: z.string().default('https://kitabu.ai'),
  KITABU_PASSWORD_RESET_URL: z.string().default('https://app.kitabu.ai/reset-password'),
  KITABU_PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  KITABU_EMAIL_VERIFICATION_URL: z.string().default('https://app.kitabu.ai/verify-email'),
  KITABU_EMAIL_VERIFICATION_TTL_MINUTES: z.coerce.number().int().positive().default(60 * 24),
  KITABU_PHONE_VERIFICATION_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  KITABU_GOOGLE_CLIENT_IDS: z.string().default(''),
  KITABU_APP_DEEP_LINK_BASE: z.string().default('kitabu://auth'),
  KITABU_ANDROID_PACKAGE_NAME: z.string().default('com.kitabunativeapp'),
  KITABU_ANDROID_SHA256_CERT_FINGERPRINTS: z.string().default(''),
  KITABU_MPESA_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  KITABU_MPESA_CONSUMER_KEY: z.string().optional(),
  KITABU_MPESA_CONSUMER_SECRET: z.string().optional(),
  KITABU_MPESA_SHORTCODE: z.string().optional(),
  KITABU_MPESA_PASSKEY: z.string().optional(),
  KITABU_MPESA_CALLBACK_URL: z.string().default('https://app.kitabu.ai/billing/mpesa/callback'),
  KITABU_MPESA_ACCOUNT_REFERENCE: z.string().default('Kitabu AI'),
  KITABU_MPESA_TRANSACTION_DESC: z.string().default('Kitabu Subscription'),
  KITABU_MPESA_STK_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(10),
  KITABU_SMTP_HOST: z.string().optional(),
  KITABU_SMTP_PORT: z.coerce.number().int().positive().default(587),
  KITABU_SMTP_SECURE: booleanish.default(false),
  KITABU_SMTP_USER: z.string().optional(),
  KITABU_SMTP_PASS: z.string().optional(),
  KITABU_SMTP_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  KITABU_MAIL_FROM: z.string().default('Kitabu AI <noreply@kitabu.ai>'),
  KITABU_TERMS_VERSION: z.string().default('2026-03'),
  KITABU_PRIVACY_VERSION: z.string().default('2026-03'),
  KITABU_TERMS_OF_SERVICE_URL: z.string().url().default('https://kitabu.ai/terms'),
  KITABU_PRIVACY_POLICY_URL: z.string().url().default('https://kitabu.ai/privacy'),
  KITABU_ADMIN_ANALYTICS_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  KITABU_ADMIN_ANALYTICS_RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  KITABU_AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  KITABU_AI_RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  KITABU_REFRESH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  KITABU_REFRESH_RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  KITABU_SMS_PROVIDER: z.enum(['none', 'africastalking']).default('none'),
  KITABU_AFRICASTALKING_USERNAME: z.string().optional(),
  KITABU_AFRICASTALKING_API_KEY: z.string().optional(),
  KITABU_AFRICASTALKING_SENDER_ID: z.string().optional(),
  KITABU_SENTRY_DSN: z.string().optional(),
  KITABU_POSTHOG_KEY: z.string().optional(),
  KITABU_POSTHOG_HOST: z.string().url().default('https://app.posthog.com')
});

export const appConfig = configSchema.parse(process.env);

appConfig.KITABU_JWT_PRIVATE_KEY = appConfig.KITABU_JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
appConfig.KITABU_JWT_PUBLIC_KEY = appConfig.KITABU_JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
appConfig.KITABU_OPENAI_API_KEY = trimOptional(appConfig.KITABU_OPENAI_API_KEY);
appConfig.KITABU_OPENAI_STUDENT_MODEL = appConfig.KITABU_OPENAI_STUDENT_MODEL.trim();
appConfig.KITABU_OPENAI_REASONING_MODEL = appConfig.KITABU_OPENAI_REASONING_MODEL.trim();
appConfig.KITABU_OPENAI_TRANSCRIPTION_MODEL = appConfig.KITABU_OPENAI_TRANSCRIPTION_MODEL.trim();
appConfig.KITABU_GEMINI_API_KEY = trimOptional(appConfig.KITABU_GEMINI_API_KEY);
appConfig.KITABU_GEMINI_MODEL = appConfig.KITABU_GEMINI_MODEL.trim();
appConfig.KITABU_GOOGLE_CLIENT_IDS = appConfig.KITABU_GOOGLE_CLIENT_IDS.trim();
appConfig.KITABU_AFRICASTALKING_USERNAME = trimOptional(appConfig.KITABU_AFRICASTALKING_USERNAME);
appConfig.KITABU_AFRICASTALKING_API_KEY = trimOptional(appConfig.KITABU_AFRICASTALKING_API_KEY);
appConfig.KITABU_AFRICASTALKING_SENDER_ID = trimOptional(appConfig.KITABU_AFRICASTALKING_SENDER_ID);
appConfig.KITABU_SMTP_HOST = trimOptional(appConfig.KITABU_SMTP_HOST);
appConfig.KITABU_SMTP_USER = trimOptional(appConfig.KITABU_SMTP_USER);
appConfig.KITABU_SMTP_PASS = trimOptional(appConfig.KITABU_SMTP_PASS);
appConfig.KITABU_SENTRY_DSN = trimOptional(appConfig.KITABU_SENTRY_DSN);
appConfig.KITABU_POSTHOG_KEY = trimOptional(appConfig.KITABU_POSTHOG_KEY);
