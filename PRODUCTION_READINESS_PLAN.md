# Production Readiness Plan

This plan converts the starter checklist into an implementation sequence optimized for:

- shipping the highest-risk production gaps first
- avoiding rework by handling foundations before features
- focusing on items that apply to the current Kitabu architecture

Current architecture notes:

- `apps/api` is a Fastify API, not Next.js
- `native-app` is React Native CLI, not Expo
- admin announcements count as the in-app notifications system
- Hetzner deployment, scheduled backups, and environment separation do not exist yet

## Status Legend

- `Implemented`: already present in the repo
- `Planned`: applies to this app and should be built
- `Optional`: useful, but not required for first production launch
- `Not Applicable`: does not fit the current architecture

## Already Implemented

- Email/password auth
- Password reset
- Email verification
- Admin TOTP step-up authentication
- PostgreSQL backend
- Docker setup
- SMTP email service
- In-app notifications via admin announcements
- M-Pesa STK Push
- M-Pesa callback/webhook handling
- Subscription logic
- Terms and Privacy content in-app
- Audit logs
- OpenAI integration
- Gemini integration
- AI usage tracking
- RBAC
- School-level multi-tenancy
- Seeded fallback student, teacher, and admin users
- Partial glassmorphism UI
- Basic loading spinners

## Not Applicable

- Next.js API modular architecture
- Expo + Expo Router

## Priority Order

## Phase 1: Production Foundations

Goal: make the system deployable, recoverable, and operable.

### 1. Create environment separation
Status: `Planned`

Tasks:

- define `dev`, `staging`, and `prod` environment configs
- split secrets and base URLs per environment
- document release promotion flow
- ensure mobile builds can target staging and production APIs cleanly

Why first:

- almost every remaining production task depends on this
- without this, testing and deployment will be unsafe

### 2. Deploy API stack to Hetzner
Status: `Planned`

Tasks:

- provision Hetzner server(s)
- deploy API, Postgres, Redis, Caddy, and worker
- configure TLS, DNS, firewall rules, and process restarts
- validate the production topology against the current Docker setup

Why here:

- deployment is required before real smoke testing and real backup validation

### 3. Schedule daily backups
Status: `Planned`

Tasks:

- wire `infra/backup.sh` into a scheduler
- define backup retention and restore procedure
- test backup restore into a clean database
- alert on backup failure

Why here:

- backup code exists already, so this is high value with low implementation cost
- production without tested backups is avoidable risk

### 4. Add GitHub CI/CD
Status: `Planned`

Tasks:

- add CI for API typecheck/build
- add CI for native lint/tests
- add migration safety checks
- add deploy workflow for staging and production

Why here:

- reduces manual deploy risk
- supports every phase after this

## Phase 2: Security and Compliance Gaps

Goal: close launch-blocking trust and account-management gaps.

### 5. Require Terms acceptance before signup
Status: `Planned`

Tasks:

- add explicit `I Accept` gate in signup flow
- persist terms acceptance version and timestamp
- reject account creation without acceptance

Why first in this phase:

- simple to implement
- directly addresses a clear checklist gap

### 6. Add in-app account deletion
Status: `Planned`

Tasks:

- add deletion entry point in profile/settings
- support user self-service deletion request or direct deletion flow
- define what gets deleted immediately vs retained for legal/security reasons
- log deletion actions in audit logs

Why here:

- required for store/compliance readiness
- should be defined before hard delete semantics

### 7. Implement hard delete account policy and flow
Status: `Planned`

Tasks:

- define entities that can be hard-deleted safely
- add backend deletion job or transactional flow
- handle AI usage, billing, audit, and school-linked data carefully
- document exceptions where hard deletion is not allowed

Why here:

- depends on the policy decisions from the prior item
- higher risk than the UI-only deletion trigger

### 8. Publish a Privacy Policy URL
Status: `Planned`

Tasks:

- host the current privacy policy at a stable public URL
- link the public URL from app metadata and legal surfaces
- keep in-app copy aligned with hosted copy

Why here:

- low effort
- needed for production distribution and legal clarity

### 9. Finalize Terms of Service template
Status: `Planned`

Tasks:

- obtain approved terms template
- customize it for Kitabu AI
- align in-app terms text with approved version
- version the terms

Why here:

- follows naturally after acceptance/versioning work

## Phase 3: Observability and Reliability

Goal: make failures visible before scale increases.

### 10. Add Sentry
Status: `Planned`

Tasks:

- integrate Sentry in API
- integrate Sentry in React Native app
- capture unhandled errors and release versions
- filter sensitive payloads

Why first in this phase:

- fastest way to improve production incident visibility

### 11. Add structured logging
Status: `Planned`

Tasks:

- standardize API logs around request id, user id, school id, feature, and outcome
- replace ad hoc `console.error` usage where practical
- define log shape for auth, billing, AI, and admin actions

Why here:

- complements Sentry
- improves debugging and auditability

### 12. Add performance monitoring
Status: `Planned`

Tasks:

- track API latency and error rates
- track slow queries and expensive AI requests
- add basic dashboards or alerts

Why here:

- more useful after structured logging and deployed environments exist

### 13. Add PostHog
Status: `Optional`

Tasks:

- instrument product analytics events
- track onboarding, billing, and retention funnels
- avoid collecting unnecessary sensitive data

Why optional:

- helpful for product optimization
- not as launch-critical as error monitoring

## Phase 4: Auth Hardening

Goal: improve login UX and account security without destabilizing launch.

### 14. Add Google login
Status: `Planned`

Tasks:

- add backend token verification flow
- add mobile sign-in UI
- map new users into existing roles and school flows

### 15. Add Apple login
Status: `Planned`

Tasks:

- implement Sign in with Apple for iOS
- align account linking with email/password accounts

Why after Google:

- similar work pattern
- better to build social auth as one cohesive project

### 16. Prioritize last-used login method
Status: `Optional`

Tasks:

- remember last successful login method on device
- present the most likely action first

### 17. Add passkeys/WebAuthn
Status: `Optional`

Tasks:

- evaluate mobile support path for passkeys
- design account recovery and device migration flow

Why optional:

- useful, but heavier than social auth
- not required for first production launch if email/password and 2FA are solid

### 18. Add passwordless auth
Status: `Optional`

Tasks:

- choose magic link or OTP model
- avoid creating auth surface overlap without clear UX benefit

### 19. Add hidden admin route if still desired
Status: `Optional`

Tasks:

- decide whether this is real security or only UI obscurity
- if only obscurity, deprioritize behind proper RBAC and 2FA

## Phase 5: Billing and Communication Enhancements

Goal: improve payment resilience and user communication.

### 20. Add SMS for M-Pesa flows
Status: `Planned`

Tasks:

- send payment status notifications
- handle failed or expired checkout flows
- keep SMS content short and auditable

Why first in this phase:

- directly improves recovery in the most important monetization flow

### 21. Add SMTP fallback for production mail delivery
Status: `Planned`

Tasks:

- decide primary vs fallback provider strategy
- add failover behavior and delivery logging

Note:

- SMTP exists already; this item is about resilience, not first-time email support

### 22. Standardize webhook handling
Status: `Planned`

Tasks:

- extract shared webhook validation, logging, idempotency, and error handling
- apply the pattern to M-Pesa first

### 23. Add PayPal
Status: `Optional`

Why optional:

- M-Pesa is already implemented and likely the primary Kenyan payment path
- PayPal expands reach, but is not the highest-efficiency next step

## Phase 6: AI Safety and Control

Goal: make AI usage safer, more manageable, and easier to evolve.

### 24. Add prompt versioning
Status: `Planned`

Tasks:

- version prompts by feature
- log prompt version into AI usage records
- make prompt changes traceable during regressions

### 25. Add clear per-user rate limiting
Status: `Planned`

Tasks:

- define rate rules for chat, quiz generation, transcription, and curriculum extraction
- enforce limits at user level, not only by subscription spend
- return consistent user-facing errors

Why here:

- usage tracking already exists, so the next logical step is operational control

### 26. Evaluate missing provider integrations
Status: `Optional`

Items:

- Grok video integration

Why optional:

- no evidence this is needed for current product value

## Phase 7: UX and Product Polish

Goal: improve user trust and finish quality after launch blockers are closed.

### 27. Add app-wide toast/error system
Status: `Planned`

Tasks:

- replace scattered one-off toast behavior with a shared pattern
- standardize success, warning, and error messages

### 28. Add dark mode toggle
Status: `Optional`

Note:

- there is some theme handling in reader experiences, but not app-wide theming

### 29. Add animated splash screen
Status: `Optional`

### 30. Add Lottie animations
Status: `Optional`

Why these are later:

- they improve polish, but not readiness fundamentals

## Phase 8: Architecture and Optional Platform Work

Goal: only do these if the product direction justifies them.

### 31. Add branding config system
Status: `Optional`

Use this if:

- you plan to white-label for schools
- you need per-tenant themes, logos, or naming

### 32. Revisit internal SDK extraction
Status: `Optional`

Checklist items:

- Auth SDK
- M-Pesa SDK
- Email service
- Notification engine
- AI engine

Recommendation:

- do not extract SDKs yet
- keep code local until duplication or multiple apps justify separation

### 33. Evaluate Better Auth migration
Status: `Optional`

Recommendation:

- do not migrate before launch
- current custom auth already supports the core product
- migration risk is high relative to current value

### 34. K9 stress testing on Hetzner
Status: `Optional`

Recommendation:

- basic API load testing is valuable
- exact K9-on-Hetzner setup should come after deployment, observability, and CI are stable

## Recommended Execution Sequence

1. Environment separation
2. Hetzner deployment
3. Scheduled backups with restore test
4. GitHub CI/CD
5. Terms acceptance before signup
6. In-app account deletion
7. Hard delete policy and implementation
8. Public Privacy Policy URL
9. Final approved Terms version
10. Sentry
11. Structured logging
12. Performance monitoring
13. Google login
14. Apple login
15. SMS for M-Pesa
16. SMTP fallback strategy
17. Standardized webhook infrastructure
18. Prompt versioning
19. Per-user AI rate limiting
20. Shared toast/error system

## Explicit Deprioritizations

These should not block first production launch:

- Passkeys
- Passwordless auth
- Last-used login optimization
- Hidden admin route
- PayPal
- PostHog
- Grok
- Lottie
- Animated splash
- Branding config system
- SDK extraction
- Better Auth migration
- K9 setup
- Tailwind, Zustand, React Hook Form, Drizzle, Expo Router, Next.js architecture

## Suggested Definition of Production Ready

Minimum bar for first production launch:

- staging and production environments exist
- Hetzner deployment is live and repeatable
- daily backups are scheduled and restore-tested
- CI/CD is in place
- legal acceptance is enforced before signup
- user deletion flow exists
- privacy policy has a public URL
- Sentry and structured logging are enabled
- AI prompts are versioned
- per-user AI rate limits exist
- M-Pesa production flow is monitored and recoverable
