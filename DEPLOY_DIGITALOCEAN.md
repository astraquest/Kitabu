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
git clone https://github.com/samorakibagendi254/Kitabu.git /opt/kitabu-ai
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

Point these records to the Droplet IPv4:

- `A kitabu.ai`
- `A www.kitabu.ai`
- `A app.kitabu.ai`
- `A admin.kitabu.ai`

If Cloudflare is in front, start with DNS-only until Caddy has issued certificates, then enable proxying.

## 4. Build and start

```bash
docker compose up -d --build
docker compose ps
docker compose logs api --tail=100
docker compose logs caddy --tail=100
```

For a new empty Postgres volume, SQL files in `apps/api/sql` are applied on database initialization. For an existing database, run migrations before starting the new API:

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
{"status":"ok"}
```

## 6. Release update

```bash
cd /opt/kitabu-ai
git pull origin main
docker compose run --rm api node scripts/apply-migrations.mjs
docker compose up -d --build
curl https://app.kitabu.ai/health
```

Run backups from `infra/backup.sh` with cron and keep an off-Droplet copy before production traffic.
