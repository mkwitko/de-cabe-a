#!/bin/sh
# Daily database backup (ADR-010). Keeps one copy only: backups/decabeca-latest.sql.gz on the VM,
# overwritten each run, and the same object in Cloudflare R2 when rclone has a remote named "r2".
# Cron (VM): 30 6 * * * /opt/de-cabeca/deploy/backup.sh >> /opt/de-cabeca/backups/backup.log 2>&1
set -eu
cd "$(dirname "$0")/.."
mkdir -p backups
tmp="backups/decabeca-latest.sql.gz.tmp"
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod exec -T postgres \
  pg_dump -U decabeca --no-owner decabeca | gzip > "$tmp"
# Never replace the good copy with an empty dump.
[ -s "$tmp" ] && gzip -t "$tmp"
mv "$tmp" backups/decabeca-latest.sql.gz
if command -v rclone >/dev/null && rclone listremotes | grep -q '^r2:'; then
  rclone copyto backups/decabeca-latest.sql.gz r2:decabeca-backups/decabeca-latest.sql.gz
fi
echo "$(date -u) ok"
