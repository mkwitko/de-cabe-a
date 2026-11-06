#!/bin/sh
# Daily database backup to Cloudflare R2 (ADR-010). Needs rclone with a remote named "r2".
# Cron (VM): 30 6 * * * /opt/de-cabeca/deploy/backup.sh >> /var/log/decabeca-backup.log 2>&1
set -eu
cd "$(dirname "$0")/.."
name="decabeca-$(date -u +%Y-%m-%dT%H%M).sql.gz"
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod exec -T postgres \
  pg_dump -U decabeca --no-owner decabeca | gzip | rclone rcat "r2:decabeca-backups/$name"
# Keep two weeks.
rclone delete --min-age 14d r2:decabeca-backups
echo "$(date -u) ok $name"
