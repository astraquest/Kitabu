const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_GOOGLE_WEB_CLIENT_ID =
  '623941719538-7ptv4ia5injcvu2cktg26toelp3esukm.apps.googleusercontent.com';
const DEFAULT_GOOGLE_ANDROID_CLIENT_ID =
  '623941719538-3eh00pk50n22lk91e1ocbevkkiqal3sd.apps.googleusercontent.com';
const DEFAULT_GOOGLE_IOS_CLIENT_ID =
  '623941719538-d37q0vrph76pciungh1mapq9ug5f4gbq.apps.googleusercontent.com';
const DEFAULT_SENTRY_DSN =
  'https://5901f5f9a6ef0a0e6d585c22f26f61db@o4511822763393024.ingest.us.sentry.io/4511822768504832';

function readAndroidGradleProperty(name) {
  const gradlePropertiesPath = path.join(__dirname, 'android', 'gradle.properties');
  if (!fs.existsSync(gradlePropertiesPath)) {
    return '';
  }

  const line = fs
    .readFileSync(gradlePropertiesPath, 'utf8')
    .split(/\r?\n/)
    .find(value => value.trim().startsWith(`${name}=`));

  return line?.split('=').slice(1).join('=').trim() || '';
}

const googleWebClientId =
  process.env.KITABU_GOOGLE_WEB_CLIENT_ID ||
  process.env.EXPO_PUBLIC_KITABU_GOOGLE_WEB_CLIENT_ID ||
  readAndroidGradleProperty('KITABU_GOOGLE_WEB_CLIENT_ID') ||
  DEFAULT_GOOGLE_WEB_CLIENT_ID;
const googleAndroidClientId =
  process.env.KITABU_GOOGLE_ANDROID_CLIENT_ID ||
  process.env.EXPO_PUBLIC_KITABU_GOOGLE_ANDROID_CLIENT_ID ||
  readAndroidGradleProperty('KITABU_GOOGLE_ANDROID_CLIENT_ID') ||
  DEFAULT_GOOGLE_ANDROID_CLIENT_ID;
const googleIosClientId =
  process.env.KITABU_GOOGLE_IOS_CLIENT_ID ||
  process.env.EXPO_PUBLIC_KITABU_GOOGLE_IOS_CLIENT_ID ||
  DEFAULT_GOOGLE_IOS_CLIENT_ID;
const googleRedirectUri =
  process.env.KITABU_GOOGLE_REDIRECT_URI ||
  process.env.EXPO_PUBLIC_KITABU_GOOGLE_REDIRECT_URI ||
  '';

module.exports = {
  expo: {
    name: 'Kitabu AI',
    slug: 'kitabu-ai',
    scheme: 'kitabu',
    version: '1.2.8',
    assetBundlePatterns: ['**/*'],
    plugins: [
      'expo-asset',
      [
        'expo-audio',
        {
          microphonePermission: 'Allow Kitabu AI to record spoken quiz answers and live tutoring audio.',
        },
      ],
      [
        'expo-video',
        {
          supportsBackgroundPlayback: false,
          supportsPictureInPicture: false,
        },
      ],
      [
        'expo-notifications',
        {
          // Used for the daily study reminder opt-in on the onboarding Reminder (S16) screen.
          color: '#F97316',
        },
      ],
      'expo-secure-store',
      'expo-status-bar',
      'expo-web-browser',
      [
        'react-native-appsflyer',
        {
          shouldUseStrictMode: true,
          shouldUsePurchaseConnector: false,
        },
      ],
      [
        '@sentry/react-native',
        {
          organization: process.env.SENTRY_ORG || 'astra-quest',
          project: process.env.SENTRY_PROJECT || 'react-native',
        },
      ],
    ],
    android: {
      package: 'ai.kitabu2.twa',
      softwareKeyboardLayoutMode: 'resize',
      blockedPermissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
        'com.google.android.gms.permission.AD_ID',
      ],
    },
    ios: {
      bundleIdentifier: 'ai.kitabunative.app',
    },
    extra: {
      kitabuApiBaseUrl: process.env.KITABU_API_BASE_URL || process.env.EXPO_PUBLIC_KITABU_API_BASE_URL || '',
      kitabuRuntimeEnv: process.env.KITABU_APP_ENV || process.env.EXPO_PUBLIC_KITABU_APP_ENV || '',
      kitabuExternalPaymentsEnabled:
        process.env.KITABU_ENABLE_EXTERNAL_PAYMENTS ||
        process.env.EXPO_PUBLIC_KITABU_ENABLE_EXTERNAL_PAYMENTS ||
        '',
      googleWebClientId,
      googleAndroidClientId,
      googleIosClientId,
      googleRedirectUri,
      kitabuExpoProjectId: process.env.KITABU_EXPO_PROJECT_ID || process.env.EXPO_PUBLIC_KITABU_EXPO_PROJECT_ID || '',
      kitabuAppsFlyerDevKey:
        process.env.KITABU_APPSFLYER_DEV_KEY || process.env.EXPO_PUBLIC_KITABU_APPSFLYER_DEV_KEY || '',
      sentryDsn: process.env.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN || DEFAULT_SENTRY_DSN,
    },
  },
};
