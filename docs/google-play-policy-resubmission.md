# Google Play Policy Resubmission Notes

Last updated: 2026-07-09

## App Build Behavior

- Android Play release builds now show M-Pesa checkout in-app unless `KITABU_ENABLE_EXTERNAL_PAYMENTS=false` is set as an emergency shutoff.
- M-Pesa checkout keeps the original customer flow: choose a plan, enter or reuse an M-Pesa number, then continue to STK push. No extra customer-facing disclosure or confirmation screen is added.
- This remains a Google Play payments-policy risk for digital subscriptions unless the app is enrolled in and compliant with the applicable Google Play alternative billing or external payments program for the target countries.

## Data Safety / App Content Declarations

Analytics consent is synchronized to the Kitabu API, but necessary-only remains
usable offline. Student and unknown-role native sessions use only minimized
first-party analytics after analytics consent; third-party analytics and
advertising delivery is restricted to eligible adult contexts with explicit
consent. Account deletion removes linked analytics events, consent state, and
associated anonymous identifiers. No advertising identifier or child grade is
sent from student/minor contexts.

Declare that the app collects or processes:

- Account data: name, email, phone, auth/session identifiers.
- Children/learner data: grade, country/curriculum, school, subjects, progress, quiz answers, diagnostics, learning activity.
- Parent/guardian data: parent account details and linked child identifiers.
- User content: prompts, questions, notes, uploaded homework photos/files, generated responses, teacher-parent messages.
- Audio: microphone recordings and transcripts for voice tutor and voice quiz features.
- Photos/files/camera access: chat attachment camera, image, and document picker.
- App activity: lessons, quizzes, homework, messages, AI requests, study/reminder activity.
- Diagnostics: crash, error, device, app version, and performance data if collected by the app/runtime.
- Device identifiers: app-generated device id and push notification tokens.
- Payments/subscriptions: subscription status and transaction records when the platform/account type supports billing.
- Safety reports: in-app reports of unsafe, inappropriate, harmful, abusive, deceptive, or incorrect generated content and teacher-parent messages.

Use `https://app.kitabu.ai/policy` as the Play Console privacy policy URL and `https://app.kitabu.ai/deletion` for account/data deletion. Do not use `https://kitabu.ai` or `https://www.kitabu.ai` legal URLs until TLS is verified globally.

## AI / UGC Reporting Coverage

The app now has in-context report controls for:

- AI tutor chat responses.
- Voice tutor responses.
- Homework AI explanations.
- Quiz AI explanations.
- Generated quiz questions.
- Teacher lesson-plan AI ideas.
- Parent Rafiki assistant responses.
- Student remedial AI reports.
- Teacher-parent messages.

AI report controls open a compact modal sheet inside the app with reason options, an optional note, and a confirmation state. Reports are sent to `/content-reports` with the reported content and screen context. Teacher-parent message reports are sent to `/teacher-parent-messages/:messageId/report`; admins are alerted only after a user reports a specific message, and routine messages are not routed through moderation.

## Families / Child Safety Controls

- Target audience should include the learner age groups the app is designed for, roughly ages 9-18 / Grade 4-12.
- Keep ads disabled unless a future build uses only Families Self-Certified Ads SDKs with compliant age gating.
- Do not enable unrestricted child-to-child or child-to-stranger chat.
- Teacher-parent messaging should remain restricted to known school/parent relationships.
- AI-generated content must keep the in-app report controls visible on generated responses.

## Pre-Submission Checks

- Confirm `versionCode` is higher than the rejected build.
- Run API typecheck/tests and native typecheck/tests.
- Build an Android App Bundle from the Play-safe native configuration.
- Verify `https://app.kitabu.ai/policy`, `https://app.kitabu.ai/privacy`, `https://app.kitabu.ai/terms`, and `https://app.kitabu.ai/deletion` are live and reachable globally over HTTPS.
- In Play Console, use `https://app.kitabu.ai/policy` as the privacy policy URL unless `https://kitabu.ai` TLS has been repaired and verified globally.

## Reviewer Notes To Provide

- Account deletion: sign in, open Profile, choose Account deletion, type the confirmation phrase, submit. Public deletion URL: `https://app.kitabu.ai/deletion`.
- AI reporting: open Ask AI Tutor, generate a response, tap Report, choose a reason, optionally add a note, submit. Repeatable paths exist in voice tutor, homework explanation, quiz explanation, generated quiz questions, teacher lesson ideas, parent Rafiki, and remedial reports.
- Teacher-parent reporting: sign in as a teacher or parent with a linked class relationship, open Messages, tap Report on a specific message. This alerts admins without pre-moderating every message.
- Voice/microphone: open Live Audio Tutor or voice quiz answer, grant microphone permission, record a short prompt/answer.
- Attachments: open Ask AI Tutor, tap the plus button, choose camera/image/file attachment.
- Payments: Android Play build currently keeps M-Pesa checkout visible for subscriptions. This is a known Play Billing policy risk unless Google accepts an appeal or an approved alternative-billing program applies.

## Verification Status

- Android release AAB rebuilt after the AI/UGC reporting changes: `native-app/android/app/build/outputs/bundle/release/app-release.aab`, version `1.2.3 (123)`, SHA-256 `4376158F1C79E87EE6C785B3F46A3B8DF877252372B94EB61D3BC6DFFB55EFFF`.
- Production was updated on 2026-07-09 by rebuilding/recreating `api` and `worker` after syncing the policy-remediation API files and legal pages.
- `044_content_reports.sql` was present in production and the migration runner reported it as already applied.
- `https://app.kitabu.ai/policy`, `/privacy`, `/terms`, `/deletion`, and `/health` returned 200 over HTTPS on 2026-07-09.
- Production `/policy`, `/privacy`, and `/deletion` pages now include the full `https://app.kitabu.ai/deletion` URL, name ASTRA QUEST AI, and describe the 30-day deletion window.
- Production `/content-reports` and `/teacher-parent-messages/:messageId/report` routes return `401` for unauthenticated POST requests, confirming the routes are live instead of missing.
- `https://kitabu.ai/policy`, `https://www.kitabu.ai/policy`, `https://kitabu.ai/deletion`, and `https://www.kitabu.ai/deletion` failed TLS from the local verification client on 2026-07-09. Keep Play Console on `app.kitabu.ai` URLs only.
- API typecheck, native typecheck, API unit tests, and native Jest tests passed after the AI/UGC reporting changes.
- DB-backed integration tests passed in explicit test runtime on 2026-07-09: 15/15, including account deletion setting `pending_deletion`, refresh/session reuse rejection after deletion, AI content report creation, and teacher-parent message reporting with admin notification.

## VersionCode 128 Hardening Gate

Status: `pending_acceptance` (no versionCode 128 AAB has been built or submitted).

The next exact AAB must revalidate these version 127 Play findings against the immutable artifact:

- Android 15 deprecated `Window.setStatusBarColor` / `setNavigationBarColor` origins reported at `com.google.android.material.datepicker.k.I` and `androidx.lifecycle.ReportFragment.onActivityCreated`; inspect every final base DEX and run the Android 15/16 edge-to-edge and date-picker/runtime smoke tests.
- Network bitmap pressure across React Native images and transitive Fresco/Glide/CanHub paths; run low-memory and repeated remote-image/camera/cropper stress tests, including learner picture challenges, avatars/covers/flags, and chat attachments. Project-owned remote images use HTTP-aware default caching plus `resizeMethod="resize"`; third-party library code remains subject to exact-AAB inspection.
- AGP `8.12.0` optimized resource shrinking; keep `minifyEnabled` and `shrinkResources` enabled, retain `android.r8.optimizedResourceShrinking=true`, and retain the non-empty `mapping.txt` generated by the exact AAB build beside its SHA-256 and AAB SHA-256 pairing.

Before internal-track upload, record versionName/versionCode, target SDK, AAB size/SHA-256, mapping size/SHA-256, signing continuity, final DEX API scan, and low-memory/edge-to-edge results. Upload the AAB and matching mapping together, request Play re-analysis, and keep this gate `pending_acceptance` until Play confirms the recommendations are cleared.
