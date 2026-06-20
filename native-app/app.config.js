module.exports = {
  expo: {
    name: 'Kitabu AI',
    slug: 'kitabu-ai',
    version: '0.0.1',
    assetBundlePatterns: ['**/*'],
    android: {
      package: 'com.kitabunativeapp',
    },
    extra: {
      kitabuApiBaseUrl: process.env.KITABU_API_BASE_URL || process.env.EXPO_PUBLIC_KITABU_API_BASE_URL || '',
      kitabuRuntimeEnv: process.env.KITABU_APP_ENV || process.env.EXPO_PUBLIC_KITABU_APP_ENV || '',
      googleWebClientId:
        process.env.KITABU_GOOGLE_WEB_CLIENT_ID ||
        process.env.EXPO_PUBLIC_KITABU_GOOGLE_WEB_CLIENT_ID ||
        '',
    },
  },
};
