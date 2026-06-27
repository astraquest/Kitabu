# Hetzner Deployment

This document deploys the current Kitabu API stack to a single Hetzner server.

Current topology:

- Cloudflare Tunnel -> `app.kitabu.ai` -> API (`apps/api`)
- Cloudflare Tunnel -> `kitabu.ai`, `www.kitabu.ai`, `admin.kitabu.ai` -> Caddy static sites
- private containers: Postgres, Redis, worker

This repo does not deploy the React Native app. It deploys the backend that the mobile app and admin surfaces depend on.

## Prerequisites

- A Hetzner server is already provisioned and reachable over SSH
- Cloudflare Tunnel is installed on the server and reports healthy
- Ubuntu or Debian on the server
- Docker and Docker Compose plugin available
- External SMTP provider credentials ready
- OpenAI and/or Gemini keys ready if AI features must work in production
- M-Pesa production credentials ready if billing must work in production

Do not expose Postgres or Redis publicly.

## 1. Route DNS through Cloudflare Tunnel

Do not expose the origin with public `A` records for the core Kitabu surfaces.
Create proxied CNAME records to the Cloudflare Tunnel target:

- `app.kitabu.ai`
- `admin.kitabu.ai`
- `kitabu.ai`
- `www.kitabu.ai`

Cut DNS over only after the server health checks pass. Until then, leave existing
production records untouched.

## 2. Install server packages

SSH into the server and run:

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin openssl
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
```

Optional firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 3. Clone the repository

```bash
cd /opt
sudo mkdir -p kitabu-ai
sudo chown $USER:$USER kitabu-ai
git clone https://github.com/samorakibagendi254/Kitabu.git /opt/kitabu-ai
cd /opt/kitabu-ai
```

## 4. Generate JWT signing keys

The API requires RSA keys for access token signing.

```bash
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
```

Convert them into single-line env-safe values:

```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' jwt-private.pem
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' jwt-public.pem
```

Paste those outputs into `KITABU_JWT_PRIVATE_KEY` and `KITABU_JWT_PUBLIC_KEY`.

## 5. Create the production environment file

```bash
cp apps/api/.env.example apps/api/.env
nano apps/api/.env
chmod 600 apps/api/.env
```

Use this production baseline:

```env
KITABU_RUNTIME_ENV=production
KITABU_NODE_ENV=production
KITABU_HOST=0.0.0.0
KITABU_PORT=4000
KITABU_TRUST_PROXY=true
KITABU_ENABLE_API_DOCS=false
KITABU_BODY_LIMIT_BYTES=1048576

KITABU_DATABASE_URL=postgres://kitabu:REPLACE_DB_PASSWORD@postgres:5432/kitabu_api
KITABU_DATABASE_SSL_MODE=auto
KITABU_REDIS_URL=redis://redis:6379

KITABU_JWT_ISSUER=kitabu.ai
KITABU_JWT_AUDIENCE=kitabu-clients
KITABU_ACCESS_TOKEN_TTL_SECONDS=900
KITABU_REFRESH_TOKEN_TTL_DAYS=30
KITABU_STEP_UP_TTL_SECONDS=600
KITABU_JWT_PRIVATE_KEY=PASTE_PRIVATE_KEY_SINGLE_LINE
KITABU_JWT_PUBLIC_KEY=PASTE_PUBLIC_KEY_SINGLE_LINE

KITABU_OPENAI_API_KEY=
KITABU_OPENAI_STUDENT_MODEL=gpt-5.4-mini
KITABU_OPENAI_REASONING_MODEL=gpt-5.4-mini
KITABU_OPENAI_REASONING_EFFORT=medium
KITABU_DEEPSEEK_API_KEY=
KITABU_DEEPSEEK_BASE_URL=https://api.deepseek.com
KITABU_DEEPSEEK_TEXT_FALLBACK_MODEL=deepseek-v4-flash

KITABU_GEMINI_API_KEY=
KITABU_GEMINI_MODEL=gemini-2.5-flash
KITABU_KSH_PER_USD=129.50

KITABU_ADMIN_WEB_ORIGIN=https://admin.kitabu.ai
KITABU_WEB_APP_ORIGINS=https://kitabu.ai,https://www.kitabu.ai
KITABU_NATIVE_APP_ORIGIN=kitabu-native-app
KITABU_ADMIN_WEB_BASE_URL=https://admin.kitabu.ai
KITABU_LANDING_WEB_BASE_URL=https://kitabu.ai
KITABU_PASSWORD_RESET_URL=https://app.kitabu.ai/reset-password
KITABU_PASSWORD_RESET_TTL_MINUTES=30
KITABU_EMAIL_VERIFICATION_URL=https://app.kitabu.ai/verify-email
KITABU_EMAIL_VERIFICATION_TTL_MINUTES=1440
KITABU_APP_DEEP_LINK_BASE=kitabu://auth
KITABU_ANDROID_PACKAGE_NAME=com.kitabunativeapp
KITABU_ANDROID_SHA256_CERT_FINGERPRINTS=

KITABU_MPESA_ENV=production
KITABU_MPESA_CONSUMER_KEY=
KITABU_MPESA_CONSUMER_SECRET=
KITABU_MPESA_SHORTCODE=
KITABU_MPESA_PASSKEY=
KITABU_MPESA_CALLBACK_URL=https://app.kitabu.ai/billing/mpesa/callback
KITABU_MPESA_ACCOUNT_REFERENCE=Kitabu AI
KITABU_MPESA_TRANSACTION_DESC=Kitabu Subscription
KITABU_MPESA_STK_TIMEOUT_MINUTES=10

KITABU_SMTP_HOST=
KITABU_SMTP_PORT=587
KITABU_SMTP_SECURE=false
KITABU_SMTP_USER=
KITABU_SMTP_PASS=
KITABU_MAIL_FROM=Kitabu AI <noreply@kitabu.ai>

KITABU_TERMS_VERSION=2026-03
KITABU_PRIVACY_VERSION=2026-03
KITABU_TERMS_OF_SERVICE_URL=https://kitabu.ai/terms
KITABU_PRIVACY_POLICY_URL=https://kitabu.ai/privacy

KITABU_ADMIN_ANALYTICS_RATE_LIMIT_MAX=30
KITABU_ADMIN_ANALYTICS_RATE_LIMIT_WINDOW=1 minute
KITABU_AI_RATE_LIMIT_MAX=20
KITABU_AI_RATE_LIMIT_WINDOW=1 minute
KITABU_REFRESH_RATE_LIMIT_MAX=20
KITABU_REFRESH_RATE_LIMIT_WINDOW=1 minute
```

Production notes:

- `KITABU_DATABASE_URL` must use `postgres:5432`, not `localhost:55432`
- `KITABU_DATABASE_SSL_MODE=auto` disables TLS for the private Docker Postgres host and keeps verified TLS for external database hosts
- `KITABU_TRUST_PROXY=true` is required behind Cloudflare Tunnel/Caddy
- leave optional provider values blank only if those features are intentionally disabled

## 6. Set the Postgres password in compose

Create a root compose env file and set the same password used in
`KITABU_DATABASE_URL`:

```bash
printf 'KITABU_POSTGRES_PASSWORD=%s\n' 'REPLACE_DB_PASSWORD' > .env
chmod 600 .env
```

## 7. Start the stack

```bash
cd /opt/kitabu-ai
docker compose up -d --build
```

Check status:

```bash
docker compose ps
docker compose logs api --tail=100
docker compose logs worker --tail=100
docker compose logs caddy --tail=100
docker compose run --rm api npm run migrate
```

## 8. Verify health

From the server:

```bash
curl http://127.0.0.1:4000/health
curl --resolve app.kitabu.ai:443:127.0.0.1 https://app.kitabu.ai/health
curl https://app.kitabu.ai/health
```

Expected API response:

```json
{"status":"ok","checks":{"database":{"status":"ok"},"redis":{"status":"ok"}}}
```

If Redis is unavailable, the API returns HTTP 200 with `"status":"degraded"`.
Restore Redis before treating the deployment as fully healthy. Database failure
returns HTTP 503.

## 9. Update the server on new releases

The GitHub Actions deployment runner should be installed on the production host and
registered with the `kitabu-prod` label. Pushes to `main` deploy automatically;
manual production deploys can still be started from `.github/workflows/deploy-api.yml`.

If the runner is missing or offline, create a repo runner registration token:

```bash
gh api -X POST repos/astraquest/Kitabu/actions/runners/registration-token --jq .token
```

Then run this on the production host:

```bash
cd /home/samora/deploy/kitabu-live
sudo RUNNER_TOKEN='PASTE_TOKEN' bash infra/install-github-runner.sh
```

Confirm the repo shows an online self-hosted runner with labels
`self-hosted`, `linux`, `x64`, and `kitabu-prod`.

```bash
cd /opt/kitabu-ai
git pull origin main
docker compose up -d --build
docker compose run --rm api npm run migrate
curl https://app.kitabu.ai/health
```

## 10. Backups

This repo already includes `infra/backup.sh`, which runs `pg_dump` and keeps 14 days of compressed backups.

Example cron entry:

```bash
crontab -e
```

```cron
0 2 * * * KITABU_DATABASE_URL='postgres://kitabu:REPLACE_DB_PASSWORD@127.0.0.1:55432/kitabu_api' KITABU_BACKUP_DIR='/var/backups/kitabu' /opt/kitabu-ai/infra/backup.sh >> /var/log/kitabu-backup.log 2>&1
```

For production, local backups are not enough. Send encrypted backups to Cloudflare
R2 after R2 is enabled in the Cloudflare dashboard, and test restore monthly.

## 11. SMTP guidance

Use a managed provider such as Brevo, Mailgun, Postmark, or SendGrid.

Minimum DNS records usually required:

- SPF
- DKIM
- DMARC

Do not try to self-host email delivery on the same Hetzner box for first launch.

## 12. Known production gaps

- secrets are stored in a server-side `.env` file
- there is no deployment automation yet
- R2 must be enabled before off-server backups can be configured
- restore testing still needs to be done
