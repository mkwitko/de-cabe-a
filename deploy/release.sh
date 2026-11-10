#!/bin/sh
# Ship the current main to production. Run on the VM from /opt/de-cabeca:
#   sh deploy/release.sh
# Pulls main, rebuilds the images, restarts the stack (the API runs pending
# migrations at start) and waits for /v1/health. Safe to run again.
set -eu
cd "$(dirname "$0")/.."

COMPOSE="docker compose -p decabeca -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod"

echo "==> Atualizando o código (main)"
git fetch --quiet origin
git checkout --quiet main
git pull --quiet --ff-only origin main
git log --oneline -1

echo "==> Construindo e reiniciando"
$COMPOSE up -d --build

echo "==> Esperando a API responder"
i=0
until $COMPOSE exec -T api wget -qO- http://127.0.0.1:3000/v1/health >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "A API não respondeu em 2 minutos. Veja: $COMPOSE logs --tail 80 api"
    exit 1
  fi
  sleep 2
done
echo "==> Pronto. API no ar e migrations aplicadas."
