# DigitalOcean Deployment

This deploys the Kitabu API and static web site to a DigitalOcean Droplet with Docker Compose.

## Topology

- `kitabu.ai` and `www.kitabu.ai` -> Caddy static site from `apps/web`
- `app.kitabu.ai` -> Caddy -> API container on port `4000`
- `admin.kitabu.ai` -> Caddy static admin portal from `apps/admin-web`
- private containers: Postgres, Redis, worker

## 1. Create the Droplet

Use Ubuntu LTS, add your SSH key, and enable backups. Keep Postgres and Redis private to Docker; only ports `22`, `80`, and `443` should be public.

Install Docker:

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin openssl
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
```

## 2. Clone and configure

```bash
sudo mkdir -p /opt/kitabu-ai
sudo chown $USER:$USER /opt/kitabu-ai
git clone https://github.com/astraquest/Kitabu.git /opt/kitabu-ai
cd /opt/kitabu-ai
cp apps/api/.env.example apps/api/.env
chmod 600 apps/api/.env
```

Generate JWT keys:

```bash
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' jwt-private.pem
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' jwt-public.pem
```

Edit `apps/api/.env`:

- set `KITABU_RUNTIME_ENV=production`
- set `KITABU_NODE_ENV=production`
- set `KITABU_TRUST_PROXY=true`
- set `KITABU_DATABASE_URL=postgres://kitabu:<password>@postgres:5432/kitabu_api`
- set `KITABU_REDIS_URL=redis://redis:6379`
- paste the generated JWT key values
- set production OpenAI/Gemini, SMTP, Google, and M-Pesa values as needed

In `docker-compose.yml`, set `POSTGRES_PASSWORD` to the same database password.

## 3. DNS

Public names stay on Cloudflare and do not change during migration:

- `kitabu.ai`, `www.kitabu.ai`, `app.kitabu.ai`, and `admin.kitabu.ai` keep their existing records.
- Route traffic to the Droplet through the existing remotely managed Cloudflare Tunnel; do not
  perform a public A-record cutover and do not remove email DNS records.
- Assign a DigitalOcean Reserved IP to the Droplet for stable SSH/origin access only; Postgres,
  Redis, and the API must never be exposed publicly.

## 4. Build and start

```bash
docker compose up -d --build
docker compose ps
docker compose logs api --tail=100
docker compose logs caddy --tail=100
```

Apply repository migrations before starting the API against a new or existing database (SQL
initialization is not automatic):

```bash
docker compose run --rm api node scripts/apply-migrations.mjs
```

## 5. Verify

```bash
curl http://127.0.0.1:4000/health
curl https://app.kitabu.ai/health
curl -I https://kitabu.ai
curl -I https://admin.kitabu.ai
```

Expected API response:

```json
{"status":"ok","checks":{"database":{"status":"ok"},"redis":{"status":"ok"}}}
```

If Redis is unavailable, the API returns HTTP 200 with `"status":"degraded"`.
Restore Redis before treating the deployment as fully healthy. Database failure
returns HTTP 503.

## 6. Release update

```bash
cd /opt/kitabu-ai
git pull origin main
docker compose run --rm api node scripts/apply-migrations.mjs
docker compose up -d --build
curl https://app.kitabu.ai/health
```

Run backups from `infra/backup.sh` with cron and keep an off-Droplet copy before production traffic.
