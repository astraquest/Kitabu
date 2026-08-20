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

### Mobile analytics privacy foundation

The mobile analytics foundation is consent-gated and fail-closed. Before analytics
consent, it does not persist analytics identifiers, attribution, or an offline
queue. Student, unknown, and other non-eligible contexts use only the first-party
`/analytics/events` path after analytics consent; no third-party SDK collection or
advertising identifiers are enabled. Parent/adult marketing consent is separate
from terms acceptance; native third-party collection remains disabled in this stage.

This stage intentionally does not ship Firebase Analytics or Meta App Events native
SDKs because this repository has no verified provider config files/credentials and
the current Expo native projects have no maintained integration configured. TikTok
mobile delivery remains server-only because there is no official React Native
wrapper. Android Install Referrer is also not enabled; callers may provide bounded
initial UTM/deep-link attribution to the service, which persists it only after
analytics consent. Do not add access tokens, app secrets, or fabricated Google
Services files to the app bundle.

Opting out removes the mobile analytics queue, identifiers, attribution, and
once-event markers while retaining only the versioned consent preference. If a
user later opts back into analytics, `first_open` is emitted once for that new
consent lifecycle; it is not treated as a permanent install marker after an
explicit deletion/withdrawal.
Consent changes are also synchronized best-effort to the authenticated API at
`POST /analytics/consent`; withdrawal remains effective locally when offline.
Native student and unknown-role events are stored first-party only and never
reach third-party providers.

Android AppsFlyer attribution is now configured through the official
`react-native-appsflyer` 6.18.0 plugin. Set `KITABU_APPSFLYER_DEV_KEY` (or the
public `EXPO_PUBLIC_KITABU_APPSFLYER_DEV_KEY`) in the build environment; it is
exposed only as the client-safe `kitabuAppsFlyerDevKey` Expo extra, and no
literal key is committed. The SDK uses `manualStart`, starts only after
analytics consent and a verified adult role, stops on withdrawal or a
student/unknown-role context, and fails open when the key, native module, or
network is unavailable. Strict kids mode is enabled, Purchase Connector is
disabled, and `com.google.android.gms.permission.AD_ID` is blocked in both Expo
config and the checked-in Android manifest. Conversion data is
reduced to bounded campaign/media-source attribution, and AppsFlyer event
payloads contain only event ID, app version, and commercial-safe plan/revenue
fields; they never contain learner identifiers, role, grade, subject, or
content.

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

## Android release version codes

Android release builds resolve `versionCode` to `128` by default, immediately after the
released code `127`. An explicit `KITABU_ANDROID_VERSION_CODE` override is accepted only
when it is at least `128` and no greater than Google Play's maximum of `2100000000`.

For reproducible CI builds, pin the code with either the Gradle project property or environment
variable (the project property takes precedence):

```powershell
./gradlew.bat -p android :app:bundleRelease -PKITABU_ANDROID_VERSION_CODE=1780000000
$env:KITABU_ANDROID_VERSION_CODE = "1780000000"
./gradlew.bat -p android :app:bundleRelease
```

Use one immutable value for every artifact in a release, and do not reuse a value from an
earlier Play submission. The validation task prints the resolved value:
`./gradlew.bat -p android :app:printReleaseVersionCode`.
