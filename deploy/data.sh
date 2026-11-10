#!/bin/sh
# Run one of the data scripts in scripts/research against the production
# database. Dry run by default; add --apply to write. Run on the VM from
# /opt/de-cabeca, after deploy/release.sh:
#   sh deploy/data.sh fill-photos              # preview
#   sh deploy/data.sh fill-photos --apply      # write
# Order for the launch: fill-photos, player-fame, career-path-difficulty.
set -eu
cd "$(dirname "$0")/.."

name="${1:?uso: sh deploy/data.sh <fill-photos|player-fame|career-path-difficulty> [--apply]}"
shift
script="scripts/research/$name.ts"
[ -f "$script" ] || { echo "Script não encontrado: $script"; exit 1; }

# The database password lives only in deploy/.env.prod.
POSTGRES_PASSWORD="$(sed -n 's/^POSTGRES_PASSWORD=//p' deploy/.env.prod)"

# A throwaway Node container on the stack's network reaches the database by
# its service name; the repository is mounted read-write for the script cache.
docker run --rm \
  --network decabeca_default \
  -e DATABASE_URL="postgresql://decabeca:${POSTGRES_PASSWORD}@postgres:5432/decabeca" \
  -v "$PWD:/repo" -w /repo \
  node:24-alpine sh -c "corepack enable >/dev/null 2>&1 \
    && pnpm install --frozen-lockfile --filter @decabeca/api... >/dev/null \
    && pnpm --filter @decabeca/api exec prisma generate >/dev/null \
    && pnpm --filter @decabeca/api exec tsx ../../$script $*"
