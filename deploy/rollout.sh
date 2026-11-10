#!/bin/sh
# Zero-downtime rollout of the checked-out code. release.sh runs it on the VM from /opt/de-cabeca;
# it also runs locally against any compose project (COMPOSE_PROJECT, ENV_FILE).
#   1. build the new images while the old containers keep serving;
#   2. run the migrations as a one-off container (the API no longer migrates at start);
#   3. per service (api, then web): start a second container with the new image next to the old
#      one, wait for its Docker healthcheck, then stop the old one. The edge proxy re-resolves
#      Docker DNS every second and retries, so no request sees a 502. If the new container never
#      gets healthy it is removed, the old one keeps serving and the script exits non-zero.
#
# MIGRATIONS MUST BE BACKWARD COMPATIBLE (expand, then contract): they run while the old API is
# still serving, and the old API keeps running if the new one fails. Add columns/tables as
# nullable or with defaults; drop or rename only in a later release, once no running code uses them.
set -eu
cd "$(dirname "$0")/.."

P="${COMPOSE_PROJECT:-decabeca}"
COMPOSE="docker compose -p $P -f deploy/docker-compose.prod.yml --env-file ${ENV_FILE:-deploy/.env.prod}"

# Containers of a service (running or not), one id per line.
ids() {
  docker ps -aq --filter "label=com.docker.compose.project=$P" \
    --filter "label=com.docker.compose.service=$1" --filter "label=com.docker.compose.oneoff=False"
}

# Healthy within ~3 min, or fail early once it crashed (restarted) or went unhealthy.
wait_healthy() {
  i=0
  while [ "$i" -lt 180 ]; do
    case "$(docker inspect -f '{{.State.Status}} {{.RestartCount}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$1")" in
      'running 0 healthy') return 0 ;;
      'running 0 starting' | 'created 0 '*) ;;
      *) return 1 ;;
    esac
    i=$((i + 1))
    sleep 1
  done
  return 1
}

roll() {
  svc=$1
  old="$(ids "$svc")"
  n=$(printf '%s\n' "$old" | grep -c . || true)
  echo "==> $svc: subindo o novo ao lado do antigo"
  $COMPOSE up -d --no-deps --no-build --no-recreate --scale "$svc=$((n + 1))" "$svc"
  new="$(ids "$svc" | grep -vxF "${old:-none}")"
  if ! wait_healthy "$new"; then
    echo "!! $svc novo não ficou saudável; o antigo continua no ar. Logs:"
    docker logs --tail 60 "$new" 2>&1 || true
    docker rm -f "$new" >/dev/null
    exit 1
  fi
  [ -z "$old" ] && return 0
  if [ "$svc" = web ] && [ -n "$cutover" ]; then
    # First run of the edge layout: the old web holds the port. Free it and start the edge at once.
    docker rm -f $old >/dev/null
    $COMPOSE start edge
  else
    docker stop $old >/dev/null
    docker rm $old >/dev/null
  fi
  echo "==> $svc: trocado"
}

echo "==> Construindo (o site antigo segue no ar)"
$COMPOSE build api web
$COMPOSE up -d --no-build postgres --wait

echo "==> Migrações"
$COMPOSE run --rm --no-deps -T api npx prisma migrate deploy

cutover=
if [ -z "$(docker ps -q --filter "label=com.docker.compose.project=$P" --filter label=com.docker.compose.service=edge)" ]; then
  cutover=1
  $COMPOSE create --no-build edge
fi
roll api
roll web
if [ -z "$cutover" ] && ! $COMPOSE exec -T edge cat /etc/caddy/Caddyfile | cmp -s - deploy/edge.Caddyfile; then
  echo "==> edge.Caddyfile mudou: recriando o edge (cerca de 1 s fora)"
  $COMPOSE up -d --no-deps --force-recreate edge
fi
$COMPOSE up -d --no-deps --no-build edge

docker image prune -f >/dev/null 2>&1 || true
docker builder prune -f >/dev/null 2>&1 || true
