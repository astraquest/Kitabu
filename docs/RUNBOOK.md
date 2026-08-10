# Runbook

## Local Checks

```bash
npm.cmd run build
cd native-app
npm.cmd test -- --runInBand
npm.cmd run lint -- --max-warnings=0
```

## Migrations

```bash
npm.cmd run migrate -w apps/api
```

Run migrations before deploying API code that depends on new tables or columns.

Migration 045 is a transactionally executed cleanup that preserves only the supported operational
test accounts `demoaccount@kitabu.ai` and `admin@kitabu.ai`; it fails closed if that two-account
baseline is not present. Historical applied migrations can retain legacy test identities as audit
evidence. In particular, the migration 071 integration fixture retains them solely to test historical
account consolidation; they are not current runtime allowlist entries.
The `test:integration:migrations` CI command runs an account-policy contract that blocks unsupported
`@kitabu.ai` identities in current migration SQL and migration contract checks. Its explicit archival-only
allowlist is limited to the applied historical migrations and the migration 071 consolidation fixture.

## Deployment

### Legal-page acceptance

After a release that changes the legal pages, verify `/policy`, `/privacy`, and `/deletion` return a
`Cache-Control` header containing `no-transform`. Their live HTML must contain `hello@kitabu.ai` and
must not contain `/cdn-cgi/l/email-protection`. The privacy and deletion pages must also explain how a
user can request deletion of specific personal data without deleting their account.

The apex legal aliases are permanent canonical redirects:

- `https://kitabu.ai/privacy` -> `https://app.kitabu.ai/privacy`
- `https://kitabu.ai/policy` -> `https://app.kitabu.ai/policy`
- `https://kitabu.ai/terms` -> `https://app.kitabu.ai/terms`
- `https://kitabu.ai/deletion` -> `https://app.kitabu.ai/deletion`

Require an exact `308` and `Location` value before following each redirect and validating the final
page. This distinguishes a healthy canonical redirect from an edge or origin `404`.

### Cloudflare Tunnel route safety

`kitabu-prod-origin` is remotely managed. Cloudflare's live tunnel configuration overrides the
server's `/etc/cloudflared/config.yml`, even when the connector starts with that file. DNS and tunnel
ingress are separate controls: a valid proxied DNS record can still return Cloudflare's empty `404`
when the hostname is absent from the remote ingress list.

Treat every tunnel ingress update as a whole-list replacement:

1. GET and back up the current remote configuration and version.
2. Merge the requested route into the live list; never build a replacement from only the current app.
3. Assert that no existing hostname/service pair disappeared and that the final rule remains
   `http_status:404`.
4. Refuse a stale write if the live version or route list changed after the read.
5. PUT the complete merged list, wait for the connector to log the new version, and verify every
   protected public hostname from outside the origin.
6. Roll back to the captured configuration if any previously healthy route regresses.

At minimum, protect the apex, `www`, `app`, `admin`, `origin-ndiziflix`, `mufasa`, `storybrain`,
`firststeps`, `bafaservices`, and `endabasia`, plus every route already present in the live config.
Never delete or recreate an existing DNS record merely to repair missing tunnel ingress.

Use `.github/workflows/deploy-api.yml` or the manual Hetzner steps in `DEPLOY_HETZNER.md`.

Production SSH access uses the local alias:

```bash
ssh kitabu-prod
```

The GitHub Actions deploy workflow validates the repo before deployment and
refuses to rsync over `/opt/kitabu-ai` when the production worktree has
uncommitted or untracked drift. Check this before investigating a blocked deploy:

Generated books currently live on the production server at
`/opt/kitabu-ai/apps/api/data/books` and are mounted read-only into API
containers. They are intentionally excluded from Git and rsync deploy deletion
until they are moved to object storage.

Derived reference-library packages live separately at
`/opt/kitabu-ai/apps/api/data/reference-library`, mounted read-only into API
and worker containers. They are also excluded from Git and deploy rsync. Copy a
reviewed package to that directory, apply migration 070, then import it
explicitly with `node scripts/reference-library/import-reference-library.mjs
--file /app/data/reference-library/KEN/CBC/PP1/orion-checkpoint-vol1/reference.json`
inside an API Compose run.

```bash
ssh kitabu-prod
cd /opt/kitabu-ai
git status --short --untracked-files=all
```

After deploy:

```bash
curl https://app.kitabu.ai/health
```

Expected response:

```json
{"status":"ok","checks":{"database":{"status":"ok"},"redis":{"status":"ok"}}}
```

If Redis is unreachable but the database is healthy, `/health` returns HTTP 200 with
`"status":"degraded"` and a Redis check message. Treat this as an operational
warning: restore Redis before relying on rate-limit or worker behavior. Database
failure returns HTTP 503 with `"status":"unhealthy"`.

## Backups

Nightly local Postgres dumps run on the production server at 02:15 server time
and are retained for 14 days in `/var/backups/kitabu`.

Manual backup and integrity check:

```bash
ssh kitabu-prod
KITABU_BACKUP_DIR=/var/backups/kitabu KITABU_COMPOSE_DIR=/opt/kitabu-ai /opt/kitabu-ai/infra/backup.sh
gzip -t /var/backups/kitabu/kitabu-api-*.sql.gz
tar -tzf /var/backups/kitabu/kitabu-reference-library-*.tar.gz >/dev/null
```

These backups are still on the same server. Add an encrypted off-server target
before treating backup coverage as complete.

## Notifications

Required migration: `apps/api/sql/012_feature_flags_notifications.sql`.

SMS is opt-in:

```env
KITABU_SMS_PROVIDER=africastalking
KITABU_AFRICASTALKING_USERNAME=
KITABU_AFRICASTALKING_API_KEY=
KITABU_AFRICASTALKING_SENDER_ID=
```

If SMS is not configured, in-app notifications still persist and SMS delivery rows are marked `skipped`.

## Progressive Learning Release Evidence

The Grade 4 progressive-learning release is Git
`ea1342bad94104c45a1ab9f8dfdbf8f38e92a2ed` (deployed 2026-07-15). GitHub
deploy run `29432587990` and CI run `29432587967` both passed. Independent
acceptance verified the exact clean production revision, the recreated API,
worker, and Caddy containers, healthy PostgreSQL and Redis checks, migration
`050_progressive_learning.sql`, all four progressive-learning tables, the
compiled progressive lesson modules, and the authenticated learning-path route.

The unchanged pre-release public-surface baseline passed all 42 protected
routes plus Terms, Privacy, and Account Deletion. The post-release recovery
point is `/var/backups/kitabu/kitabu-api-20260716-021501.sql.gz`; it is owned by
`deploy:deploy`, mode `600`, and passed `gzip -t`. The immediately previous
application revision for code rollback is
`3020a19524dafa8cde9c99056f385af8dc0f8a03`. Migration 050 is additive, so
that revision remains schema-compatible if application rollback is required.

The Grades 5-8 curriculum expansion is Git
`5df1eceb4be54fecd8b4cc0293d6eb936349f920` (deployed 2026-07-16). GitHub
deploy run `29488740036` and CI run `29488740022` passed. Independent
acceptance verified the exact clean production revision; API image
`sha256:83d184443b035c27edb43c5b398e3dcc5e4b06ed6b317cf887dd78758b30aadf`;
fresh zero-restart API, worker, and Caddy containers; healthy PostgreSQL and
Redis; and authenticated internal and public progressive-learning routes.

The running API artifact reported 114 curriculum-first chapters and 570
activities: three chapters for every published core subject in each of Grades
5, 6, 7, and 8. It also verified both active interaction types and confirmed
that public lesson payloads contain neither answers nor success coaching. The
unchanged pre-release baseline passed all 42 protected routes, required legal
pages, nonzero assets, and canonical legal redirects. The owner-only
post-release recovery point
`/var/backups/kitabu/kitabu-api-20260716-095733.sql.gz` passed `gzip -t`.
The immediately previous application revision is
`ea1342bad94104c45a1ab9f8dfdbf8f38e92a2ed`; this release adds no migration,
so application rollback remains schema-compatible.
