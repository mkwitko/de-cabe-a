#!/bin/sh
# Ship origin/main to production. Run on YOUR computer, from the repository:
#   sh deploy/release.sh
# The VM has no GitHub credentials, so the code travels as a `git archive` of
# origin/main into a fresh folder; deploy/.env.prod and backups/ are carried
# over, the old folder is kept as /opt/de-cabeca.prev (/opt needs sudo). Then deploy/rollout.sh
# builds, migrates and swaps api and web one container at a time behind the edge proxy, with no
# downtime. Migrations must be backward compatible (expand, then contract): see deploy/rollout.sh.
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
sh deploy/rollout.sh
echo "==> Pronto: $REV no ar."
EOF
