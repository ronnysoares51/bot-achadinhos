#!/usr/bin/env bash
set -Eeuo pipefail
# Installed once at /usr/local/sbin/deploy-bot-achadinhos (root:root, 0755).
# SSH authorized_keys must force this command and disable forwarding/PTY.
PROJECT=/docker/bot-achadinhos
REPO=https://github.com/ronnysoares51/bot-achadinhos.git
IMAGE=bot-achadinhos-bot:latest
CONTAINER=bot-achadinhos-bot-1
DATA=/opt/bot-achadinhos-dados
cd "$PROJECT"
compose() { docker compose --project-name bot-achadinhos -f "$PROJECT/docker-compose.yml" "$@"; }
check_layout() {
  compose config --format json | python3 -c '
import json,sys
c=json.load(sys.stdin)
assert set(c["services"]) == {"bot"}, "Unexpected services"
s=c["services"]["bot"]
assert any(v.get("type")=="bind" and v.get("source")=="/opt/bot-achadinhos-dados" and v.get("target")=="/app/dados" for v in s["volumes"]), "Data mount changed"
assert any(str(p.get("published"))=="3010" and p.get("target")==3000 for p in s["ports"]), "Port changed"
'
  test -d "$DATA"
  docker inspect "$CONTAINER" --format '{{json .Mounts}}' | python3 -c '
import json,sys
assert any(v["Source"]=="/opt/bot-achadinhos-dados" and v["Destination"]=="/app/dados" for v in json.load(sys.stdin)), "Running data mount changed"
'
}
ready() {
  local attempt
  for attempt in {1..30}; do
    if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER")" = true ] &&
       curl --fail --silent --max-time 5 http://127.0.0.1:3010/ -o /dev/null; then
      sleep 5
      [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER")" = true ] &&
        curl --fail --silent --max-time 5 http://127.0.0.1:3010/ -o /dev/null && return 0
    fi
    sleep 2
  done
  return 1
}
if [ "${1:-}" = --check ] && [ -z "${SSH_ORIGINAL_COMMAND:-}" ]; then
  check_layout
  ready
  echo "Preflight OK: existing project, mount, port and panel."
  exit 0
fi
command="${SSH_ORIGINAL_COMMAND:-}"
if [[ ! "$command" =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  echo "Only deploy <commit SHA> is allowed." >&2
  exit 2
fi
sha="${BASH_REMATCH[1]}"
exec 9>/run/lock/bot-achadinhos-deploy.lock
flock -w 1200 9
check_layout
head_sha=$(git ls-remote "$REPO" refs/heads/main | cut -f1)
if [ "$sha" != "$head_sha" ]; then
  echo "Refusing obsolete or non-main commit." >&2
  exit 3
fi
candidate="bot-achadinhos-candidate:$sha"
docker build --label "org.opencontainers.image.revision=$sha" -t "$candidate" "$REPO#$sha"
# No production data, environment file or sessions are mounted in the test container.
docker run --rm --network none --entrypoint npm "$candidate" test
# A newer main may have arrived while building. Never deploy a superseded version.
head_sha=$(git ls-remote "$REPO" refs/heads/main | cut -f1)
test "$sha" = "$head_sha"
previous=$(docker inspect -f '{{.Image}}' "$CONTAINER")
rollback() {
  trap - ERR INT TERM
  echo "Deployment failed; restoring previous image." >&2
  docker tag "$previous" "$IMAGE"
  compose up -d --no-deps --no-build bot
  ready || echo "Rollback requires attention: panel unavailable." >&2
  exit 1
}
trap rollback ERR INT TERM
docker tag "$candidate" "$IMAGE"
compose up -d --no-deps --no-build bot
ready
test "$(docker inspect -f '{{.Image}}' "$CONTAINER")" = "$(docker image inspect -f '{{.Id}}' "$candidate")"
check_layout
trap - ERR INT TERM
echo "Deploy verified: $sha; existing container and data mount; HTTP panel OK."
