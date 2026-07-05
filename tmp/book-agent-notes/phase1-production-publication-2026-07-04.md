# Phase 1 Production Publication - 2026-07-04

## Production Result

Phase 1 testing publication is live on production.

- Public health: `https://app.kitabu.ai/health` returned OK.
- Demo student login: `student@kitabu.ai` returned HTTP 200 with an access token.
- Public generated-library API returned 280 books.
- Public generated-library API returned 280 books with cover URLs.

Country counts:

| Country | Books |
|---|---:|
| Kenya | 63 |
| Rwanda | 87 |
| Uganda | 38 |
| Tanzania | 65 |
| Ethiopia | 27 |
| Total | 280 |

## Code Publication

- Lightweight GitHub branch: `codex/phase1-testing-code`
- Lightweight branch commit: `331128d`
- PR: https://github.com/astraquest/Kitabu/pull/19
- PR status: merged into `main` at `7bc0878`
- Production cherry-pick commits: `ee6f255`, then re-applied after a later production main update as `5d0c0f9`

The full generated-book checkpoint commit `6137466` remains local because pushing it attempted to upload the large generated corpus and did not complete. This is acceptable for the current deployment model because generated books are server-local and excluded from Git deploy rsync.

## Data Publication

Server data directory updated:

- `/opt/kitabu-ai/apps/api/data/books`

Verified after sync:

- 280 manifests
- 280 PDFs
- 280 cover PNGs

Rollback backup retained outside the repo:

- `/opt/kitabu-ai-data-backups/books.backup-20260704-phase1-pre`

Backup contents:

- 260 manifests
- 0 cover PNGs

## Services Restarted

Rebuilt and recreated:

- `api`
- `worker`

Post-restart Docker state:

- `kitabu-api`: healthy
- `kitabu-worker`: running
- `kitabu-postgres`: running
- `kitabu-redis`: running
- `kitabu-caddy`: running

## Final Durability Check

- GitHub `main` now contains the Phase 1 code gate through merged PR #19.
- Production data directory contains 280 manifests, 280 PDFs, and 280 cover PNGs.
- Public demo account sees 280 books with 280 cover URLs.
- Regular scoped student access was verified inside the production API container:
  - Kenya CBC Grade 6 returns 7 books with 7 cover URLs.
  - Kenya CBC Grade 4 returns 7 books with 7 cover URLs.

## Phase 2 Boundary

Review and content enhancement remain paused until manual testing feedback is collected. Phase 2 should resume from the existing reviewer findings and should not treat `published-for-testing` as academic acceptance.
