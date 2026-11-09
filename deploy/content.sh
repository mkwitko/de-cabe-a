#!/bin/sh
# Moves the game content (players, clubs, careers, matches, line-ups, levels) from the local
# database to production, without any player data (sessions, accounts, attempts, leagues).
#   Local:  deploy/content.sh export            -> content.sql.gz
#   VM:     deploy/content.sh import content.sql.gz   (after the API ran its migrations once)
# Import only into a database with no content yet: it inserts, never updates.
set -eu
cd "$(dirname "$0")/.."
TABLES='"Source" "Country" "Club" "Player" "PlayerAlias" "CareerSpell" "ImportDiff" "Match" "MatchLineup" "Challenge" "ChallengePlayerUsage"'
case "${1:-}" in
  export)
    args=''
    for t in $TABLES; do args="$args -t public.$t"; done
    # shellcheck disable=SC2086
    docker compose exec -T postgres pg_dump -U decabeca --data-only --disable-triggers \
      --no-owner $args decabeca | gzip > content.sql.gz
    echo "content.sql.gz: $(du -h content.sql.gz | cut -f1)"
    ;;
  import)
    file="${2:?usage: deploy/content.sh import content.sql.gz}"
    gunzip -c "$file" | docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod \
      exec -T postgres psql -U decabeca -v ON_ERROR_STOP=1 --single-transaction -q decabeca
    echo "imported $file"
    ;;
  *) echo 'usage: deploy/content.sh export | import <file>' >&2; exit 1 ;;
esac
