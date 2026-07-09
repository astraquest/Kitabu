# Google Play Rejection Audit - 2026-07-09

Status: active remediation plan

## Current Rejection Evidence

The July 9, 2026 Play Console screenshot shows:

- Update rejected: Not adhering to Google Play Developer Program policies.
- Issue: Play Console Requirements - Violation of Play Console Requirements.
- Data safety section removed: User Data - Account Deletion Requirement: Invalid account deletion link on Data safety form.
- Existing warning: Privacy Policy section of the User Data policy: Invalid Privacy policy.

Immediate fix already applied in this repo:

- Privacy Policy section 10 now references `https://app.kitabu.ai/deletion`.
- `/privacy` canonical URL now uses `https://app.kitabu.ai/privacy`.
- In-app legal privacy copy now references `https://app.kitabu.ai/deletion`.

## Official Policy Baseline

Primary policy index: https://play.google/developer-content-policy/

Relevant official pages:

- Play Console Requirements: https://support.google.com/googleplay/android-developer/answer/10788890
- User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Data Safety form: https://support.google.com/googleplay/android-developer/answer/10787469
- Account deletion requirements: https://support.google.com/googleplay/android-developer/answer/13327111
- AI-Generated Content policy: https://support.google.com/googleplay/android-developer/answer/13985936
- AI policy explainer: https://support.google.com/googleplay/android-developer/answer/14094294
- AI safeguards guidance: https://support.google.com/googleplay/android-developer/answer/16353813
- User Generated Content policy: https://support.google.com/googleplay/android-developer/answer/9876937
- Families policy: https://support.google.com/googleplay/android-developer/answer/9893335
- Child Endangerment policy: https://support.google.com/googleplay/android-developer/answer/9878809
- Payments policy: https://support.google.com/googleplay/android-developer/answer/9858738
- Payments explainer: https://support.google.com/googleplay/android-developer/answer/10281818
- SDK requirements: https://support.google.com/googleplay/android-developer/answer/13323374
- Permissions policy: https://support.google.com/googleplay/android-developer/answer/16558241
- Review sign-in details: https://support.google.com/googleplay/android-developer/answer/15748846

## Likely KITABU.AI Policy Risks

### 1. Invalid Account Deletion Link

Risk level: critical, already cited by Play.

Why it matters:

- Apps with in-app account creation must provide both an in-app deletion path and a public web deletion URL in Play Console.
- The web page must load without error, be relevant, reference the app or developer, make deletion easy to discover, and let users initiate deletion without reinstalling the app.

Code evidence:

- Web deletion page: `apps/web/deletion/index.html`.
- API legal route: `apps/api/src/server.ts` serves `/deletion`.
- In-app deletion flow: `native-app/src/components/ProfileModal.tsx`.
- API deletion route: `apps/api/src/server.ts`, `DELETE /me/account`.
- Database support: `apps/api/sql/031_account_deletion_requests.sql`.

Remediation:

- Use only `https://app.kitabu.ai/deletion` in Play Console Data Safety.
- Keep `https://app.kitabu.ai/policy` as the Play privacy policy URL until `kitabu.ai` TLS is fixed globally.
- Confirm the deletion page names both `Kitabu AI` and `ASTRA QUEST AI`.
- Run a fresh throwaway account deletion test before every resubmission.

### 2. Invalid Privacy Policy URL

Risk level: critical, already warned by Play.

Why it matters:

- Google requires a privacy policy URL that is active, public, non-geofenced, non-PDF, non-editable, and consistent with Data Safety.
- A prior policy screenshot showed SSL handshake failure. Any TLS or domain mismatch can keep the warning alive even if the document text is correct.

Code evidence:

- `apps/web/policy/index.html`.
- `apps/web/privacy/index.html`.
- `native-app/src/content/legal.ts`.

Remediation:

- Use `https://app.kitabu.ai/policy` in Play Console.
- Do not use `https://kitabu.ai/policy` until TLS is repaired and verified externally.
- Ensure Data Safety declarations match privacy text exactly: account data, guardian/child data, prompts, messages, uploads, audio, diagnostics, device IDs, payments, and safety reports.

### 3. AI-Generated Content Reporting

Risk level: high.

Why it matters:

- Google requires apps that generate AI content to include in-app reporting or flagging so users can report offensive AI-generated content without leaving the app.
- Reports should inform filtering and moderation.

Current code coverage:

- Report endpoint and table exist: `apps/api/sql/044_content_reports.sql`, `apps/api/src/server.ts`, `/content-reports`.
- Client reporter exists: `native-app/src/services/moderationService.ts`.
- Report controls exist for AI tutor chat, voice tutor, parent Rafiki, homework/quiz explanations, and teacher AI ideas.

Likely gap:

- `native-app/src/components/StudentDetailsModal.tsx` can generate an AI remedial report through `generateRemedialReport`, but the remedial report UI does not currently show a report action.
- AI-generated quiz questions should be reportable as generated content, not only their explanations.

Minimal compliant feature:

- Add a visible flag button on every AI-generated output card.
- The first version can submit immediately with a default reason, but the reviewer-obvious version should open an in-app bottom sheet with:
  - `Report AI content`
  - reason options: `Sexual or profane`, `Hate or harassment`, `Violence or self-harm`, `Child safety concern`, `Deceptive or dishonest`, `Unsafe learning advice`, `Other`
  - optional note
  - submit button
  - confirmation: `Thanks. Our team will review this report.`
- Store source, content role, reason, content snapshot, user ID, role, grade/subject context, app version, platform, and moderation status.
- Add a simple admin queue to list open reports and mark them `reviewing`, `resolved`, or `dismissed`.

### 4. User Generated Content And Messaging

Risk level: high if reviewer treats prompts, attachments, and teacher-parent messaging as UGC.

Why it matters:

- UGC visible to at least a subset of users needs terms acceptance, objectionable-content rules, in-app report/block functions, and moderation.
- Closed school/community UGC still needs in-app reporting.

Code evidence:

- AI prompts, chat messages, and attachments are submitted by users.
- Teacher-parent messages are stored and visible to other users.

Remediation:

- Keep Terms acceptance before account use.
- Make terms define objectionable content and child-safety prohibitions.
- Add report content/report user controls on teacher-parent messages.
- Add block/mute only where user-to-user interaction can continue without an institution-admin override; for school-managed teacher-parent messaging, a report/escalate-to-school-admin path may be more appropriate than user blocking.

### 5. M-Pesa In-App Payments For Digital Learning Access

Risk level: critical.

Why it matters:

- Google Play requires Play Billing for Play-distributed apps that sell in-app features, digital content, education subscriptions, app functionality, or cloud services, unless a listed exception or approved alternative-billing program applies.
- Kenya is not currently a listed user-choice billing market.
- M-Pesa/STK push inside the Play-distributed app for subscriptions is therefore a strong rejection risk.

Code evidence:

- `native-app/src/services/runtimeConfig.ts` enables external payments unless disabled.
- `native-app/src/services/billingService.ts` calls `/billing/checkout/mpesa`.
- `apps/api/src/server.ts` starts `/billing/checkout/mpesa`.
- `apps/api/src/payments.ts` implements Daraja checkout.

Recommended remediation:

- For the Play Store Android build, implement Google Play Billing subscriptions and map purchase tokens to backend entitlements.
- Keep direct M-Pesa for website, school/admin sales, and non-Play Android distribution.
- If Play Billing cannot be implemented immediately, submit a consumption-only Play build: users can sign in and use access purchased elsewhere, but there must be no in-app M-Pesa buttons, payment links, pricing CTAs that lead to external payment, or account/signup paths that route users to payment.

### 6. Families, Children, And Guardian Data

Risk level: high.

Why it matters:

- KITABU targets learners roughly ages 9-18. Google can assess target audience based on listing copy, school language, images, and app behavior, not only Play Console answers.
- If children are in target audience, Data Safety, SDKs, ads, payments, UGC, and permissions must be child-safe.

Code evidence:

- Privacy policy targets learners about 9-18.
- Parent onboarding collects child information.
- Guardian consent is referenced in legal copy.

Remediation:

- Declare target audience honestly for school age groups.
- Do not enroll in Families/Teacher Approved unless the app is fully ready for Families review.
- Keep ads disabled. If ads are introduced, use only Families Self-Certified Ads SDKs for children/unknown age.
- Avoid precise location entirely in child flows.
- Confirm every SDK/provider is appropriate for mixed child audiences or gated behind a neutral age/adult flow.

### 7. Audio, Photos, Files, And Permissions

Risk level: medium to high.

Why it matters:

- Microphone/audio, camera, files, and media are sensitive data categories.
- Runtime permission requests must be contextual and declared in Data Safety.

Code evidence:

- `native-app/android/app/src/main/AndroidManifest.xml` declares `RECORD_AUDIO`.
- Native recorder reads mic audio and sends it for transcription/realtime voice.
- Document/camera picker supports photos, images, PDFs, and files.

Remediation:

- Declare voice recordings, transcripts, photos/images, files/docs, and user-provided content in Data Safety.
- Keep permission prompts at point of use only.
- Do not request broad storage/media permissions if picker-based access is sufficient.
- Add reviewer notes explaining where mic/photo/file access appears.

### 8. Diagnostics, SDKs, Device IDs, And Push Tokens

Risk level: medium.

Why it matters:

- Data Safety includes SDK collection and pseudonymous identifiers transmitted off-device.
- Google can reject when detected SDK behavior conflicts with Data Safety answers.

Code evidence:

- Device ID generated in `native-app/src/services/requestHelpers.ts`.
- Push tokens stored via notification tables.
- Optional Sentry/PostHog config exists.

Remediation:

- Inventory production SDKs and environment-enabled telemetry.
- Declare device IDs, app interactions, diagnostics/crash data, and performance data if any telemetry is active.
- If no crash SDK is active, do not overclaim SDKs, but still declare server logs/app diagnostics if transmitted.

### 9. Review Access / Demo Credentials

Risk level: high for Play Console Requirements.

Why it matters:

- Google requires reusable valid login details and instructions for restricted app areas.
- If OTP, paywalls, or role gates block review, the app can be rejected.

Remediation:

- Provide reviewer credentials for student, parent/guardian, and teacher/admin if those surfaces are included.
- Ensure test credentials bypass OTP and do not expire.
- Include exact review paths:
  - account deletion
  - AI tutor report button
  - voice tutor and mic prompt
  - file/photo attachment
  - subscription/free access state
  - parent/teacher messaging

## Developer-Reported Rejection Patterns

These are not binding law, but they match official enforcement language:

- Invalid deletion links persisted until pages clearly loaded, named the app/developer, and showed a deletion path:
  - https://stackoverflow.com/questions/78023925/why-my-android-app-keeps-getting-rejected-by-google-play-console-saying-account
  - https://www.reddit.com/r/androiddev/comments/1auzgdl/google_play_rejected_app_on_policy_declaration/
  - https://github.com/ankidroid/Anki-Android/issues/16256
- Data Safety mismatch rejections occurred where Play detected location, email, Android ID, or SDK collection not declared:
  - https://github.com/commons-app/apps-android-commons/issues/5708
  - https://stackoverflow.com/questions/75470488/policy-declaration-data-safety-section-personal-info-data-type-email-addres
  - https://forum.defold.com/t/google-play-issue-found-invalid-data-safety-section/71172
- UGC report/block rejections have been resolved by making reporting paths obvious, adding terms acceptance, and documenting evidence:
  - https://meta.discourse.org/t/discourse-google-play-user-generated-content-policy-violation/238395
- External payment rejections are common for digital courses/content:
  - https://stackoverflow.com/questions/77475220/app-limited-region-availability-google-play-billing-policy-violation
  - https://community.kodular.io/t/app-rejected-due-to-violation-of-google-play-payments-policy/75180

## Resubmission Strategy

Do not resubmit until all critical items are resolved:

1. Play Console Data deletion URL: `https://app.kitabu.ai/deletion`.
2. Play Console privacy URL: `https://app.kitabu.ai/policy`.
3. Verify all legal URLs return `200 OK` globally over HTTPS.
4. Re-run real account deletion test with throwaway account.
5. Add report controls for any AI surfaces still missing them, especially remedial analysis and generated quiz questions.
6. Decide payment strategy:
   - safest: Play Billing for Android Play build;
   - acceptable fallback: consumption-only build with no in-app external payment CTAs;
   - riskiest: keep in-app M-Pesa for digital subscriptions.
7. Add report/escalation controls for teacher-parent messages or disable those social/UGC surfaces in the Play review build.
8. Align Data Safety with actual app behavior and SDKs.
9. Provide full reviewer credentials and exact path notes.
10. Increment version code and replace every active rejected track artifact.
