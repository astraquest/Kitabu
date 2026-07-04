# Kitabu Native App

React Native client for students, teachers, and school/platform admins.

## Prerequisites

- Node 22.11+
- Android Studio and an emulator, or Xcode for iOS
- A running Kitabu API

## Required runtime config

Set `KITABU_API_BASE_URL` for release builds. Development builds fall back to:

- Android emulator: `http://10.0.2.2:4000`
- iOS simulator: `http://localhost:4000`

Release builds now fail fast if `KITABU_API_BASE_URL` is missing.

For Google sign-in, set the platform-specific Google OAuth client IDs in the build
environment:

- `KITABU_GOOGLE_WEB_CLIENT_ID`
- `KITABU_GOOGLE_ANDROID_CLIENT_ID`
- `KITABU_GOOGLE_IOS_CLIENT_ID`

Android release builds fail fast if the web or Android client ID is missing. Local Android
builds also read `android/gradle.properties` when environment variables are absent. Add
all Google OAuth client IDs accepted by released apps to the API's comma-separated
`KITABU_GOOGLE_CLIENT_IDS`. The Android OAuth client must include the app package name and
the signing certificate fingerprints used for the build.

Set `KITABU_GOOGLE_REDIRECT_URI` / `EXPO_PUBLIC_KITABU_GOOGLE_REDIRECT_URI` when a build
must use a fixed redirect URI. Every redirect URI emitted by the app must be registered in
the Google Cloud OAuth client. For local Expo web on port 8098, register
`http://localhost:8098`. For production web, register the production app URL used by the
deployed client.

## Development

1. Start the API from the repo root:
   `npm run dev -w apps/api`
2. Start Metro from `native-app/`:
   `npm start`
3. Run the app:
   `npm run android`
   or
   `npm run ios`

## Production-backed surfaces

The app expects the API to provide:

- auth and onboarding
- billing and M-Pesa checkout
- curriculum and lesson delivery
- homework assignments and submissions
- library books and podcasts
- teacher dashboard data
- admin schools, pricing, announcements, and users

## Validation

- Lint: `npm run lint`
- Tests: `npm test`

Run these before shipping a mobile release.
