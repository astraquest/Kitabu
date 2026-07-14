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
