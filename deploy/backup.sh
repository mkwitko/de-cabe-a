#!/bin/sh
# Daily database backup (ADR-010): 7 days on the VM disk, and a copy to Cloudflare R2 when rclone
# has a remote named "r2".
# Cron (VM): 30 6 * * * /opt/de-cabeca/deploy/backup.sh >> /opt/de-cabeca/backups/backup.log 2>&1
set -eu
cd "$(dirname "$0")/.."
mkdir -p backups
name="decabeca-$(date -u +%Y-%m-%dT%H%M).sql.gz"
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod exec -T postgres \
  pg_dump -U decabeca --no-owner decabeca | gzip > "backups/$name"
find backups -name 'decabeca-*.sql.gz' -mtime +7 -delete
if command -v rclone >/dev/null && rclone listremotes | grep -q '^r2:'; then
  rclone copy "backups/$name" r2:decabeca-backups
  rclone delete --min-age 14d r2:decabeca-backups
fi
echo "$(date -u) ok $name"
