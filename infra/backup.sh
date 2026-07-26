#!/usr/bin/env bash
set -euo pipefail
umask 077

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="${KITABU_BACKUP_DIR:-/var/backups/kitabu}"
compose_dir="${KITABU_COMPOSE_DIR:-/opt/kitabu-ai}"
postgres_user="${KITABU_POSTGRES_USER:-kitabu}"
postgres_db="${KITABU_POSTGRES_DB:-kitabu_api}"
output="$backup_dir/kitabu-api-$timestamp.sql.gz"
tmp_output="$output.tmp"
mkdir -p "$backup_dir"

cleanup() {
  rm -f "$tmp_output"
}
trap cleanup EXIT

if [ -n "${KITABU_DATABASE_URL:-}" ] && command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$KITABU_DATABASE_URL" | gzip > "$tmp_output"
else
  cd "$compose_dir"
  docker compose exec -T postgres pg_dump -U "$postgres_user" "$postgres_db" </dev/null | gzip > "$tmp_output"
fi

gzip -t "$tmp_output"
mv "$tmp_output" "$output"
trap - EXIT

find "$backup_dir" -type f -name '*.sql.gz' -mtime +14 -delete
echo "created $output"
