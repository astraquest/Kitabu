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

After deploy:

```bash
curl https://app.kitabu.ai/health
```

Expected response:

```json
{"status":"ok"}
```

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
