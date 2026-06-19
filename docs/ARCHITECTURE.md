# Architecture

Kitabu AI is currently a production-focused monorepo:

- `native-app`: React Native CLI mobile app.
- `apps/api`: Fastify API for auth, billing, AI proxying, curriculum, teacher/admin workflows, and notifications.
- `packages/game-core`: shared game runtime.
- `infra`: Caddy and backup helpers.

The app intentionally does not migrate to the generic starterpack defaults before launch. Next.js, Expo, Drizzle, Better Auth, and PayPal remain future migration candidates only when their value exceeds migration risk.

## Data Flow

Mobile clients call the API over HTTPS. The API owns all database, Redis, payment, email, SMS, and AI provider access. Mobile clients never call AI providers or PostgreSQL directly.

## New Platform Services

Feature flags live in `feature_flags` and are exposed through `/config/features`.

Notifications use:

- `user_notifications` for durable in-app records.
- `notification_deliveries` for SMS/push/email delivery audit logs.
- `user_push_tokens` for future push delivery registration.

Payment callbacks create user notifications and optionally send SMS when Africa's Talking credentials are configured.
