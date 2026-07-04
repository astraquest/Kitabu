# Security

## Current Controls

- API inputs are validated with Zod.
- Passwords are hashed server-side.
- Refresh tokens are session-bound.
- Platform admin TOTP is enforced in production.
- RBAC gates protect teacher, school admin, and platform admin routes.
- Audit logs exist for auth, billing, curriculum, and admin actions.
- AI calls are proxied through the API and rate-limited per user.
- Production SSH uses key-only access for the `deploy` user.
- Production deploys use a dedicated GitHub Actions SSH key scoped to the server.
- Postgres and Redis are private to the host/container network.
- UFW denies unsolicited inbound traffic.
- fail2ban is enabled for SSH abuse protection.
- Nightly local database backups are retained for 14 days.

## Notification/SMS Controls

- SMS delivery is disabled by default with `KITABU_SMS_PROVIDER=none`.
- Africa's Talking credentials are loaded only from environment variables.
- SMS failures are logged in `notification_deliveries` and do not fail payment callbacks.
- Notification reads are scoped to the authenticated user.

## Launch Risks To Close

- Add API integration tests for auth, billing callback idempotency, notifications, and admin RBAC.
- Add Sentry with payload scrubbing before production.
- Add encrypted off-server database backups.
- Confirm backup restore works against a clean database.
- Review public Terms and Privacy URLs before store submission.
