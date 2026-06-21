# Kitabu AI

This repository is trimmed down to the production pieces still in use:

- `native-app`: React Native client for students, teachers, and admin access
- `apps/api`: backend for auth, billing, AI proxying, quotas, and app data
- `packages/game-core`: shared game runtime used by the native app
- `infra`: reverse proxy and backup helpers for the deployed API

## Local development

1. Copy `apps/api/.env.example` to `apps/api/.env`
2. Start infrastructure locally:
   `docker compose up postgres redis -d`
3. Apply the schema:
   `npm run migrate -w apps/api`
4. Run the API:
   `npm run dev:api`
5. Run the native app from `native-app/` with the standard React Native commands

Seeded test users are always normalized to:
- `student@kitabu.ai` / `Password123!`
- `teacher@kitabu.ai` / `Password123!`
- `admin@kitabu.ai` / `Password123!`

## Deployment

See:

- `docker-compose.yml`
- `DEPLOY_DIGITALOCEAN.md`
- `DEPLOY_HETZNER.md`
- `infra/Caddyfile`
- `infra/backup.sh`
- `apps/api/sql/`

The current production topology is:

- `app.kitabu.ai` -> `apps/api`
- `admin.kitabu.ai` -> `apps/admin-web`

Cloudflare should proxy the public API domain. Postgres and Redis must remain private to the origin.

Before every deployment that touches the API or database schema, run:

- `npm run migrate -w apps/api`

Do not deploy the API until migrations complete successfully against the target database.

Before cutting a release from a development machine, run:

- `npm run release:check`

This command includes API checks, native typecheck/lint/tests, and the production readiness gate. It must fail if the active environment still points at localhost or lacks required AI/provider credentials.

## Production Readiness

The production app now depends on these API-backed surfaces:

- auth, onboarding, and email flows
- billing and M-Pesa checkout
- curriculum delivery and quiz generation
- homework assignments and submissions
- library books and podcasts
- teacher students, assignments, and submission review
- admin schools, discounts, announcements, and users

Minimum release checklist:

1. Configure `KITABU_API_BASE_URL` for mobile release builds.
2. Apply API migrations against the target database.
3. Run API typecheck/build and native lint/tests.
4. Smoke-test student, teacher, admin, onboarding, and billing flows against staging.
5. Promote the API before publishing mobile binaries that depend on new endpoints.
