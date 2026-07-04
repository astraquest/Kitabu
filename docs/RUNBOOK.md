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
