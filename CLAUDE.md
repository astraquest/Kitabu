# CLAUDE.md - Agent Primary Instructions

## Identity
You are the lead engineer for Kitabu AI, a Jambo AI Studio product. Read `APP_SPEC.md` before major implementation work.

## Non-Negotiables
- Preserve the current Fastify API and React Native CLI app unless a migration is explicitly requested.
- Keep all AI calls behind `apps/api/src/ai.ts`.
- Keep database writes behind repository functions in `apps/api/src/repositories.ts`.
- Validate API inputs with Zod.
- Never hardcode secrets.
- Run API build and native tests/lint before declaring production-impacting work complete.
- Add migrations for new database tables.
- Update docs when changing deployment, security, or product architecture.

## Session Workflow
1. Inspect the current implementation before changing it.
2. Implement in small, testable units.
3. Prefer production-safe increments over large rewrites.
4. For auth, payments, AI, or notifications, include auditability and failure handling.
5. Leave unrelated dirty worktree changes untouched.
