#!/bin/sh
# Ship origin/main to production. Run on YOUR computer, from the repository:
#   sh deploy/release.sh
# The VM has no GitHub credentials, so the code travels as a `git archive` of
# origin/main into a fresh folder; deploy/.env.prod and backups/ are carried
# over, the old folder is kept as /opt/de-cabeca.prev (/opt needs sudo). Then the stack is rebuilt
# (the API runs pending migrations at start) and /v1/health is awaited.
set -eu
cd "$(dirname "$0")/.."

VM="${VM:-ubuntu@136.248.86.54}"
DIR=/opt/de-cabeca

git fetch --quiet origin main
REV="$(git rev-parse --short origin/main)"
echo "==> Enviando origin/main ($REV)"
git archive --format=tar origin/main | ssh "$VM" "sudo rm -rf $DIR.new && sudo install -d -o \$(id -u) -g \$(id -g) $DIR.new && tar -x -C $DIR.new"

ssh "$VM" sh -s <<EOF
set -eu
cp -a $DIR/deploy/.env.prod $DIR.new/deploy/.env.prod
[ -d $DIR/backups ] && cp -a $DIR/backups $DIR.new/ || true
[ -f $DIR/deploy/SETUP-PUSH.md ] && cp -a $DIR/deploy/SETUP-PUSH.md $DIR.new/deploy/ || true
echo "$REV" > $DIR.new/REVISION
sudo rm -rf $DIR.prev
sudo mv $DIR $DIR.prev
sudo mv $DIR.new $DIR
cd $DIR
COMPOSE="docker compose -p decabeca -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod"
echo "==> Construindo e reiniciando"
\$COMPOSE up -d --build
echo "==> Esperando a API"
i=0
until \$COMPOSE exec -T api wget -qO- http://127.0.0.1:3000/v1/health >/dev/null 2>&1; do
  i=\$((i + 1))
  if [ "\$i" -gt 90 ]; then echo "A API não respondeu. Logs:"; \$COMPOSE logs --tail 60 api; exit 1; fi
  sleep 2
done
docker builder prune -f >/dev/null 2>&1 || true
echo "==> Pronto: $REV no ar."
EOF
