# Kitabu AI Security and Production-Readiness Audit

**Audit date:** 2026-07-29
**Repository:** `kitabu-ai-progressive-release`
**Scope:** Fastify API, PostgreSQL/Redis data layer, Expo React Native application, static administration portal, container/runtime configuration, dependencies, release gates, and production health signals.
**Status:** Active remediation document

## Executive summary

The production API health endpoint was healthy during the audit, but the repository is not ready for an unqualified production release. The current release gate fails three native startup suites, production mobile crashes cannot be attributed to an immutable release because crash telemetry and build identity are missing, and the repository contains critical authentication and data-migration risks. The codebase also has monolithic modules, host-local state, incomplete CI gates, dependency advisories, and browser credential-storage patterns that will increase failure impact as usage grows.

This document is the durable record for findings, validation evidence, fixes, residual risk, and follow-up work. Seeded emails and passwords are intentionally deferred at the owner's request and must be changed before final production approval.

## Status definitions

- **Open:** confirmed and not yet remediated.
- **In progress:** implementation or validation is underway.
- **Mitigated:** immediate exploit or failure path is blocked, but follow-up work remains.
- **Resolved:** implementation and regression verification are complete.
- **Deferred:** explicitly postponed by the owner; still blocks final approval when applicable.
- **Operational:** requires production/provider evidence or action outside source code.

## Findings

### SEC-01 — Critical — Platform administrator enrollment can replace TOTP without step-up

**Status:** In progress
**Locations:**

- `apps/api/src/server.ts:4413-4450`
- `apps/api/src/repositories.ts:1381-1388`

**Evidence:** `/auth/totp/setup/begin` and `/auth/totp/setup/confirm` require the `platform_admin` role but do not require an existing step-up authentication, current TOTP verification, or password re-authentication. Beginning setup overwrites the stored secret and disables TOTP.

**Impact:** A platform-admin bearer token can replace an existing second factor and obtain a fully stepped-up session, defeating the intended second-factor boundary.

**Required fix:** Permit first enrollment only when no TOTP credential exists. Require a current stepped-up session for replacement. Keep account recovery in a separately audited break-glass workflow. Add negative and positive regression tests.

**Owner decision:** Seeded emails and passwords remain unchanged until the final credential-rotation phase. That deferral does not apply to the TOTP authorization fix.

### DATA-01 — Critical — Destructive migration deletes all users except four QA accounts

**Status:** Open
**Location:** `apps/api/sql/045_remove_production_demo_data.sql:1-85`

**Evidence:** The migration selects all users except four named accounts, deletes their dependent data and user rows, and asserts exactly four users remain.

**Impact:** Running or replaying this migration against a populated environment can destroy nearly all customer accounts and related data.

**Required fix:** Do not edit or replay an already-applied immutable migration. Add a migration safety scanner that rejects broad destructive statements by default, require an explicit reviewed override for intentional destructive migrations, and require backup/restore and row-count evidence before production data operations.

### CRASH-01 — High — Native-only WebView import breaks startup tests and stale binaries

**Status:** In progress
**Locations:**

- `native-app/src/components/admin/LearningAssetPreview.native.tsx:3`
- `native-app/src/components/admin/AdminCurriculumSection.tsx:8`
- `native-app/src/KitabuApp.tsx:22`

**Evidence:** The release gate fails three Jest startup suites with `RNCWebViewModule could not be found`. A module-scope import pulls the native dependency into the application graph before the admin preview is used.

**Impact:** Test environments and stale native binaries can crash during application import when JavaScript references a native capability that is not present in that binary.

**Required fix:** Isolate native-only imports behind a lazy boundary, add a global test mock and native capability regression tests, and require a fresh native release build whenever native dependencies change.

**False-positive qualification:** Fresh Android autolinking includes `RNCWebViewPackage`; this is not by itself proof of the currently published Play Store crash.

### CRASH-02 — High — Production crashes lack actionable telemetry and release identity

**Status:** Open / Operational
**Locations:**

- `native-app/App.tsx:1-16`
- `apps/api/src/config.ts:155-157`
- `apps/api/src/config.ts:201-202`

**Evidence:** No active crash-reporting integration, root application error boundary, source-map/native-symbol publication workflow, or health response containing immutable release identity was found. Sentry/PostHog configuration fields exist but are unused.

**Impact:** Production crash cause, affected release, device distribution, and regression status cannot be established reliably.

**Required fix:** Add privacy-scrubbed crash and error reporting, root error containment, release SHA/version/build metadata, symbol/source-map upload, and Android Vitals/App Store diagnostics collection.

### SEC-02 — High — Raw passwords and long-lived browser tokens are persisted client-side

**Status:** Open
**Locations:**

- `native-app/src/services/authService.ts:8-121`
- `native-app/src/services/storage.ts:29-45`
- `apps/admin-web/app.js:2-4`
- `apps/admin-web/app.js:37-41`
- `apps/admin-web/app.js:102-108`

**Evidence:** The native authentication service persists email and raw password. The web storage implementation is JavaScript-readable. The administration portal stores access and refresh tokens in `localStorage`.

**Impact:** Local compromise or browser XSS can expose reusable credentials or administrator refresh tokens.

**Required fix:** Never persist passwords. Migrate existing saved-login records to email-only state. Keep short-lived access tokens in memory and use HttpOnly, Secure, deliberately scoped refresh-session cookies with CSRF protection for browser administration.

### SEC-03 — Medium — Admin portal uses broad HTML string rendering without CSP

**Status:** Open
**Locations:**

- `apps/admin-web/app.js:179-499`
- `apps/admin-web/app.js:1720-2060`
- `apps/admin-web/app.js:3185-4230`
- `apps/admin-web/_headers:1-12`
- `infra/Caddyfile:54-67`

**Evidence:** The portal contains numerous `innerHTML` sinks. Reviewed dynamic values were generally escaped, and no directly exploitable source-to-sink path was confirmed. No Content Security Policy is configured for the portal.

**Impact:** A future missed escape can become stored or reflected XSS and, while browser tokens remain accessible, account takeover.

**Required fix:** Introduce a strict CSP, centralize and reduce HTML sinks, validate URL-bearing values, and prefer DOM `textContent`/element construction for untrusted data.

### DEP-01 — High — Production dependency advisories

**Status:** Open

**Evidence:** `npm audit --omit=dev` reported four high and one moderate advisory in the API production tree. The native production tree reported twenty-four high and twelve moderate advisories, many within the Expo/React Native toolchain. Expo's compatibility check reports the current SDK 54 set is aligned.

**Impact:** Known denial-of-service, path handling, URL parsing, and supply-chain weaknesses remain in shipped or build-time dependency paths.

**Required fix:** Apply compatible patched API dependencies first. Triage native runtime versus build-only advisories and perform a controlled Expo SDK upgrade; do not use forced major audit remediation without release testing.

### BUG-01 — Medium — Signup password requirements disagree between client and API

**Status:** Open
**Locations:**

- `native-app/src/screens/NeutralOnboardingScreen.tsx:2762-2768`
- `native-app/src/screens/NeutralOnboardingScreen.tsx:5015-5041`
- `native-app/src/screens/NeutralOnboardingScreen.tsx:8460-8466`
- `apps/api/src/server.ts:458-522`

**Evidence:** Mobile validation accepts passwords with six characters while API signup validation requires eight.

**Impact:** Users can pass client validation and then receive an unavoidable server rejection.

**Required fix:** Define the policy once in a shared runtime contract and test both API and client against it.

### ARCH-01 — High — Monolithic modules create an excessive failure and review blast radius

**Status:** Open

**Evidence:** `server.ts` contains roughly 150 manually registered routes and exceeds 8,000 lines; `repositories.ts` exceeds 6,000 lines; `NeutralOnboardingScreen.tsx` exceeds 11,000 lines; `TeacherPortalScreen.tsx` exceeds 6,000 lines; and `useKitabuApp.ts` approaches 4,000 lines.

**Impact:** Small feature changes pull unrelated native modules into startup, authorization policy is difficult to audit, test isolation deteriorates, and concurrent delivery becomes unsafe.

**Required fix:** Incrementally split by domain with explicit route schemas, authorization pre-handlers, repository boundaries, and focused tests. Avoid a big-bang rewrite.

### SCALE-01 — High — Single-host and host-local state prevents safe horizontal scaling

**Status:** Open

**Evidence:** API, PostgreSQL, Redis, worker, and Caddy are colocated in Compose. Generated books/media are mounted from server-local storage. The API ships a large curriculum dataset in its image. The default PostgreSQL pool is small, and each authenticated request performs an additional user-status query.

**Impact:** The host and local filesystem are single points of failure; replicas cannot share generated artifacts reliably; database connection pressure and per-request query cost grow linearly.

**Required fix:** Make API instances stateless, move runtime artifacts to versioned object storage/CDN, add managed or replicated data services, cache user/session status with bounded revocation latency, size pools against a global connection budget, and validate with load tests.

### REL-01 — High — Release gate and CI coverage are incomplete

**Status:** Open
**Location:** `package.json:22`

**Evidence:** The release gate currently fails native tests and omits API integration tests, ephemeral migration rehearsal, Expo Doctor, dependency-policy enforcement, Android/iOS release compilation, end-to-end smoke tests, load tests, container scanning, and SBOM generation. No effective GitHub Actions workflow was found.

**Impact:** Broken native imports, migration hazards, dependency regressions, and production-only build failures can reach delivery without a deterministic block.

**Required fix:** Build a reproducible CI pipeline using locked installs and explicit security, migration, release-build, smoke, and artifact-identity gates.

## Baseline verification

| Check | Result on 2026-07-29 |
| --- | --- |
| API unit tests | 113 passed, 1 skipped |
| Runtime-contract tests | 160 passed |
| Native Jest tests | 247 passed, 3 suites failed |
| Native typecheck | Passed |
| Native lint | Passed |
| Expo dependency compatibility | Passed |
| Expo Doctor | 17 of 18 checks passed |
| API production dependency audit | 4 high, 1 moderate |
| Native production dependency audit | 24 high, 12 moderate |
| Root release gate | Failed |
| Production API health snapshot | API, database, and Redis healthy |

## Codex Security cross-check

**Tool:** `@openai/codex-security`
**Scanner status:** Attempted; all three runs failed during preflight artifact persistence before analysis
**Scanner report:** No completed report was produced; see the cross-check update below for the exact limitation

If a completed scanner report becomes available, findings will be mapped to the IDs above. New findings will receive stable identifiers and include scanner evidence, manual validation, remediation status, and regression-test evidence.

## Production approval gates

Final production approval requires all of the following:

1. No unresolved critical finding and no exploitable high finding.
2. Seeded production credentials rotated or proven absent, with session revocation evidence.
3. Full release gate, integration tests, migration rehearsal, and native release builds green.
4. Crash telemetry and immutable release identity verified from a staged build.
5. Backup restore tested and destructive migration policy enforced.
6. Dependency exceptions documented with reachability, owner, expiry, and compensating controls.
7. Staged rollout monitored against crash-free-user, ANR, API error-rate, latency, and saturation thresholds.

## Change log

- **2026-07-29:** Initial audit recorded. Remediation started. Seeded credential changes deferred by owner until the final phase.

## Remediation update

The following source changes were implemented after the initial audit. Seeded emails and passwords remain intentionally unchanged.

- **SEC-01 TOTP enrollment:** added migration `069_secure_totp_enrollment.sql` with a pending secret; setup now requires current-password re-authentication; replacement requires an existing stepped-up session; confirmation enables only the verified pending secret.
- **CRASH-01 native startup:** removed the module-scope `react-native-webview` import, added a bounded stale-binary fallback, and added a global Jest mock. App, admin portal, and WebView-related startup suites now pass.
- **CRASH-02 containment/release identity:** added a root native error boundary and API health release metadata (`KITABU_RELEASE_VERSION`, `KITABU_RELEASE_SHA`, runtime environment). Crash reporting and symbol/source-map upload remain operational follow-up work.
- **SEC-02 credential storage:** native saved-login state now stores email only and overwrites legacy password-bearing records; the admin portal keeps access tokens in memory and uses the existing HttpOnly refresh cookie. Legacy admin localStorage keys are cleared on sign-out.
- **SEC-03 admin browser hardening:** added a strict Content-Security-Policy to the admin static headers and Caddy site configuration.
- **DEP-01 dependencies:** upgraded Fastify and Swagger UI, pinned patched API routing/URI dependencies, and applied native dependency overrides. API production audit is now 0 high/critical; native production audit is 0 high/critical with Expo/RN/UUID moderate upgrade-path findings remaining.
- **BUG-01 signup contract:** mobile signup now requires eight characters, matching API validation.
- **DATA-01 migration safety:** the migration runner now blocks destructive pending migrations unless `KITABU_ALLOW_DESTRUCTIVE_MIGRATIONS=true` is explicitly set for a reviewed, backed-up operation.

## Codex Security cross-check update

The official `@openai/codex-security` CLI was installed through `npx` and authenticated with the machine's stored Codex credentials. Full-repository preflight covered 1,785 files. Three full runs reached preflight and failed before analysis while persisting the scan manifest/artifacts; each recorded zero findings only because analysis was never completed. A narrower security-surface run produced discovery artifacts but was stopped by the configured $2 cost limit before a completed report. The CLI therefore has not produced a completed finding report to validate or contradict the manual findings. These are tooling/completion limitations, not clean security results. A direct `validate` attempt also reported that noninteractive JSON output is unsupported and did not return a completed validation result in this environment.

Local validation after remediation:

- API typecheck: passed.
- API tests: 113 passed, 1 skipped.
- Native typecheck: passed.
- Native targeted App/admin/auth persistence tests: 7 passed.
- Native full suite before the credential-test expectation update: 254 passed, 3 failed; the failures were stale expectations for deliberately removed password persistence. The targeted rerun passed after updating those tests.
- API production dependency audit: 0 high/critical.
- Native production dependency audit: 0 high/critical, 14 moderate Expo/RN/UUID upgrade-path findings.

## 2026-07-30 execution and gate update

- **Migration 069 rehearsal and apply:** restored the pre-change backup `/var/backups/kitabu/kitabu-api-20260729-214137.sql.gz` into an isolated PostgreSQL database, ran the official migration runner, verified `pending_secret`, dropped the rehearsal database, then applied migration 069 under the production lock. A post-change backup `/var/backups/kitabu/kitabu-api-20260729-214609.sql.gz` was created and API, PostgreSQL, and Redis health remained OK.
- **Native release:** a fresh Android release build was completed before the Expo/RN alignment (`versionCode 126`, APK SHA-256 `1895705D65145BEB87A26BC9024EC8EE5F585A4628FB1CBBB2D0713BFC9ECA6B`). The post-upgrade build path is wired into the manual observability workflow; local Windows builds require a short checkout path because CMake otherwise exceeds the Windows path limit, so the post-upgrade artifact still needs a Linux CI run before release approval.
- **Expo/RN advisories:** Expo 57.0.9, React Native 0.86.2, aligned RN tooling, and patched `xcode`/`uuid` overrides are locked. `npm audit --omit=dev --omit=optional` passes with zero shipped-bundle vulnerabilities. Development-only Jest/ESLint and optional peer advisory noise remains isolated from the shipped bundle and is tracked for the next Expo/Jest major-compatible release.
- **Full native tests:** `52` suites and `257` tests passed with `--ci --forceExit`; the remaining warning is Jest's documented open-handle force-exit notice.
- **Native static checks:** TypeScript and ESLint now pass after the RN 0.86 API compatibility fixes (`StyleSheet.absoluteFillObject` compatibility typing and Expo Video fullscreen prop cleanup).
- **Observability:** added a release artifact verifier for Hermes bundle/source maps/native symbols and a manual GitHub Actions workflow that requires Sentry CI credentials before uploading source maps and native debug information. A live upload cannot be claimed until the repository receives the production Sentry secrets and a staged release run.
- **Sentry integration:** connected the native app to the authenticated `astra-quest` React Native project with the public client DSN, immutable release/environment metadata, native crash capture, performance/session sampling, error-boundary capture, and recursive redaction of credential-like fields before send. The release workflow now validates CI credentials, uploads JavaScript source maps and Android debug information, and finalizes the Sentry release. A staged build must still be run once to verify the first event and source-map symbolication in the Sentry UI.
- **New CI gates:** added disposable-Postgres migration integration coverage, concurrent load smoke testing, Docker build plus Trivy HIGH/CRITICAL scanning, SPDX SBOM generation and artifact retention, and a CI-native full test invocation.
