# Generated Books Phase 1 Testing Release - 2026-07-04

## Release State

The generated-book review process is paused for a manual testing checkpoint. The current package set is published as `published-for-testing`, not final academic content.

Verified package state:

| Country | Books |
|---|---:|
| Kenya | 63 |
| Rwanda | 87 |
| Uganda | 38 |
| Tanzania | 65 |
| Ethiopia | 27 |
| Total | 280 |

All 280 packages have readable `pages.json`, a PDF, `source-map.json`, and a manifest `coverImage` pointing to `assets/cover.png`.

Content gates remain closed:

- `ready-for-cover`: 0
- `library-ready`: 0
- `published-library`: 0

The package content statuses are preserved:

- Kenya: 63 `content-reviewed-draft`
- Other current generated packages: 217 `content-draft-review-needed`

## Release Artifacts

Local audit artifacts are under `tmp/book-agent-notes/`:

- `phase1-testing-release-2026-07-04.json`
- `phase1-testing-library-snapshot-2026-07-04.json`
- `phase1-testing-db-snapshot-2026-07-04.json`
- `phase1-testing-release-2026-07-04.md`

`pg_dump` was unavailable on the host and Docker `pg_dump` timed out, so the database checkpoint is a logical DB census plus the generated-library manifest snapshot.

## Deployment Note

Generated books are intentionally server-local:

- `.gitignore` ignores `apps/api/data/books/**`.
- `.dockerignore` excludes `apps/api/data/books/`.
- GitHub Actions excludes `apps/api/data/books/` during deploy rsync.
- Docker Compose mounts `./apps/api/data/books:/app/data/books:ro`.

For a testing deploy, the server must receive or already contain the current `apps/api/data/books` tree. A normal code deploy alone will not ship the generated book package files or cover PNGs.

Recommended testing deploy sequence:

1. Back up the server `apps/api/data/books` directory.
2. Copy the local Phase 1 `apps/api/data/books` tree to the server.
3. Deploy the API code containing the `published-for-testing` visibility gate.
4. Restart API and worker containers.
5. Verify `/health`.
6. Log in as `student@kitabu.ai` and confirm the library returns 280 generated books with 280 cover URLs.

## Production Publication

Phase 1 testing publication was completed on production on 2026-07-04.

Code publication:

- PR: `https://github.com/astraquest/Kitabu/pull/19`
- Merged into `main`: `7bc0878`
- Production was rebuilt with the `published-for-testing` generated-book visibility gate.

Data publication:

- Server path: `/opt/kitabu-ai/apps/api/data/books`
- Rollback backup: `/opt/kitabu-ai-data-backups/books.backup-20260704-phase1-pre`
- Active production data after sync:
  - 280 manifests
  - 280 PDFs
  - 280 cover PNGs

Production verification:

- `https://app.kitabu.ai/health` returned OK.
- Demo account `student@kitabu.ai` returned 280 generated books with 280 cover URLs.
- A regular Kenya CBC student profile returned 7 Grade 6 books with 7 cover URLs.
- The same regular student profile could switch to Grade 4 and returned 7 Grade 4 books with 7 cover URLs.

Access behavior:

- Normal authenticated users see `published-for-testing` books scoped to their country, curriculum, and selected grade.
- Demo/staff/admin preview users can review the full cross-country generated-book set.
- `published-for-testing` is not final academic acceptance.

Feedback intake:

- Use `docs/generated-books-phase1-feedback-template.md` to capture manual testing findings.
- Use `docs/generated-books-phase2-remediation-backlog.md` to resume remediation from the published testing baseline.
- Accepted issues should include country, curriculum, grade, subject, book ID, page number, severity, and evidence.
- Phase 2 remediation should fix generator/source-normalization causes where possible, not only individual output pages.

## Phase 2 Resume Point

Resume the paused adversarial review findings before any final promotion:

1. Kenya v46 language blockers.
2. Kenya v46 STEM blockers.
3. Kenya v46 practical/humanities blockers.
4. Rwanda source-review and repeated-template blockers.
5. Uganda, Tanzania, and Ethiopia source/config/content acceptance.
6. Final cover art/mascot pass after content acceptance.

Only after Phase 2 acceptance should packages move from `published-for-testing` to `published-library`.
