#!/usr/bin/env bash
set -euo pipefail
umask 077

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="${KITABU_BACKUP_DIR:-/var/backups/kitabu}"
compose_dir="${KITABU_COMPOSE_DIR:-/opt/kitabu-ai}"
postgres_user="${KITABU_POSTGRES_USER:-kitabu}"
postgres_db="${KITABU_POSTGRES_DB:-kitabu_api}"
reference_library_dir="${KITABU_REFERENCE_LIBRARY_DIR:-$compose_dir/apps/api/data/reference-library}"
output="$backup_dir/kitabu-api-$timestamp.sql.gz"
tmp_output="$output.tmp"
reference_output="$backup_dir/kitabu-reference-library-$timestamp.tar.gz"
reference_tmp_output="$reference_output.tmp"
mkdir -p "$backup_dir"

cleanup() {
  rm -f "$tmp_output"
  rm -f "$reference_tmp_output"
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

if [ -d "$reference_library_dir" ]; then
  tar -C "$reference_library_dir" -czf "$reference_tmp_output" .
  tar -tzf "$reference_tmp_output" >/dev/null
  mv "$reference_tmp_output" "$reference_output"
fi

trap - EXIT

find "$backup_dir" -type f -name '*.sql.gz' -mtime +14 -delete
find "$backup_dir" -type f -name 'kitabu-reference-library-*.tar.gz' -mtime +14 -delete
echo "created $output"
if [ -f "$reference_output" ]; then
  echo "created $reference_output"
fi
