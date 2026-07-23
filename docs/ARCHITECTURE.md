# Architecture

Kitabu AI is currently a production-focused monorepo:

- `native-app`: React Native CLI mobile app.
- `apps/api`: Fastify API for auth, billing, AI proxying, curriculum, teacher/admin workflows, and notifications.
- `packages/game-core`: shared game runtime.
- `infra`: Caddy and backup helpers.

The app intentionally does not migrate to the generic starterpack defaults before launch. Next.js, Expo, Drizzle, Better Auth, and PayPal remain future migration candidates only when their value exceeds migration risk.

## Data Flow

Mobile clients call the API over HTTPS. The API owns all database, Redis, payment, email, SMS, and AI provider access. Mobile clients never call AI providers or PostgreSQL directly.

## Country and Curriculum Scope

Country and curriculum are server-owned content boundaries. The supported canonical pairs are Kenya/CBC, Uganda/NCDC, Tanzania/TIE-BASIC, Rwanda/REB-CBC, and Ethiopia/ENC.

- Student onboarding and teacher scope updates persist the canonical pair on `users`.
- Curriculum strands, quiz-bank reads, progressive compatibility lessons, and AI generation resolve that persisted scope on the server.
- `curriculum_strands` is uniquely partitioned by country, curriculum, grade, subject, and position. Curriculum administration must write to an explicit authorized scope.
- Authored progressive lessons are currently Kenya/CBC content and are served only to that scope. Other countries use their own published curriculum rows; missing country content returns empty/not found instead of falling back to Kenya.
- Teacher Portal subject, strand, and sub-strand choices come from the published curriculum for the selected country and grade. Stored teacher choices are preferences, not the curriculum catalog.

Adding a country therefore requires publishing its curriculum data under the canonical pair before learners and teachers can use progressive content for that country.

## New Platform Services

Feature flags live in `feature_flags` and are exposed through `/config/features`.

Notifications use:

- `user_notifications` for durable in-app records.
- `notification_deliveries` for SMS/push/email delivery audit logs.
- `user_push_tokens` for future push delivery registration.

Payment callbacks create user notifications and optionally send SMS when Africa's Talking credentials are configured.
