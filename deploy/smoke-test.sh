#!/usr/bin/env bash
# Disposable Docker-only lifecycle test. Never points at production or its volume/network.
set -euo pipefail
cd "$(dirname "$0")/.."
export REVISION="${REVISION:-$(git rev-parse HEAD)}"
export WEB_IMAGE="${WEB_IMAGE:-dominos-web:smoke}"
export API_IMAGE="${API_IMAGE:-dominos-api:smoke}"
export PREVIOUS_API_IMAGE="${PREVIOUS_API_IMAGE:-dominos-api:previous}"
export SMOKE_ID="${SMOKE_ID:-local-$$}"
export SECRETS_DIR="$PWD/deploy/.smoke"
project="dominos-smoke-$SMOKE_ID"
base="http://localhost:18080"
jar="$SECRETS_DIR/cookies"
current_api="$API_IMAGE"
compose() { docker compose -p "$project" -f deploy/.smoke/compose.json "$@"; }
fail() { echo "::error::$*" >&2; exit 1; }
cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then compose logs --no-color --tail 80 || true; fi
  compose down -v --remove-orphans >/dev/null 2>&1 || true
  rm -rf deploy/.smoke
  exit "$status"
}
trap cleanup EXIT
node deploy/smoke-compose.mjs

if [ "${SKIP_BUILD:-false}" != true ]; then
  docker build --build-arg "REVISION=$REVISION" -f deploy/web.Dockerfile -t "$WEB_IMAGE" .
  docker build -f deploy/api.Dockerfile -t "$API_IMAGE" .
fi
# This real prior application predates migration 0003. It both creates the previous schema and
# runs again after migration, rather than merely asserting that SQL statements are additive.
baseline=7019b744a1c15e68112624407217e8bf4f4cd161
mkdir -p deploy/.smoke/previous
git archive "$baseline" | tar -x -C deploy/.smoke/previous
docker build -f "$PWD/deploy/api.Dockerfile" -t "$PREVIOUS_API_IMAGE" deploy/.smoke/previous

export API_IMAGE="$PREVIOUS_API_IMAGE"
compose up -d --wait --wait-timeout 150
page="$(curl -fsS "$base/")"
grep -q '<div id="root">' <<<"$page" || fail "/ did not serve the app"
asset="$(grep -o '/assets/index-[^"]*\.js' <<<"$page" | head -1)"
curl -fsSI "$base$asset" | grep -qi 'cache-control: public, max-age=31536000, immutable' ||
  fail "fingerprinted asset cache policy"
[ "$(curl -sS -o /dev/null -w '%{http_code}' "$base/assets/missing.js")" = 404 ] ||
  fail "missing assets must return a real 404"
curl -fsS "$base/events/some-event" | grep -q '<div id="root">' || fail "SPA deep link"
curl -fsSI "$base/events/some-event" | grep -qi 'cache-control: no-cache' || fail "HTML cache policy"
curl -fsSI "$base/release.json" | grep -qi 'cache-control: no-cache' || fail "release cache policy"
[ "$(curl -fsS "$base/release.json" | jq -r .revision)" = "$REVISION" ] || fail "baked revision"
[ "$(curl -fsS "$base/healthz")" = ok ] || fail "frontend health"
[ "$(curl -fsS "$base/api/health" | jq -r .ok)" = true ] || fail "API health"
[ "$(curl -sS -o deploy/.smoke/api-root -w '%{http_code}' "$base/api")" = 404 ] || fail "/api status"
jq -e '.error' deploy/.smoke/api-root >/dev/null || fail "/api prefix must reach API, not SPA"

link="$(compose exec -T api node packages/api/src/cli/create-staff.ts --email baker@example.com --name "The Baker" |
  grep -o 'http[^ ]*/invitation#[A-Za-z0-9_-]*')"
token="${link#*#}"
[ -n "$token" ] || fail "no invitation token"
curl -fsS -D deploy/.smoke/headers -c "$jar" -H "content-type: application/json" -H "origin: $base" \
  -d '{"name":"The Baker","password":"pizzapizza"}' "$base/api/auth/invitations/$token" >/dev/null
grep -qi 'set-cookie:.*Secure' deploy/.smoke/headers || fail "session cookie must be Secure"
[ "$(curl -fsS -b "$jar" "$base/api/me" | jq -r .role)" = staff ] || fail "invitation sign-in"
# Cross-origin requests must still be refused through the shared proxy.
[ "$(curl -sS -o /dev/null -w '%{http_code}' -H 'Origin: https://evil.invalid' \
  -H 'Content-Type: application/json' -d '{}' "$base/api/auth/sign-in")" = 403 ] || fail "CSRF"
[ "$(compose exec -T db psql -U dominos -d dominos -Atc \
  "select count(*) from information_schema.columns where table_name='users' and column_name='remind_before_close'")" = 0 ] ||
  fail "baseline must predate the additive migration"

export API_IMAGE="$current_api"
compose up -d --wait --wait-timeout 120
check_session() {
  [ "$(curl -fsS -b "$jar" "$base/api/me" | jq -r .email)" = baker@example.com ] || fail "existing session/data lost"
}
check_session
[ "$(compose exec -T db psql -U dominos -d dominos -Atc \
  "select remind_before_close from users where email='baker@example.com'")" = t ] || fail "migration defaults"
compose exec -T api node packages/api/src/cli/import-menu.ts
[ "$(curl -fsS -b "$jar" "$base/api/staff/ingredient-groups" | jq length)" -gt 0 ] || fail "menu import"

# Restore the previous application against the already migrated database. No schema downgrade.
export API_IMAGE="$PREVIOUS_API_IMAGE"
compose up -d --wait --wait-timeout 120
check_session
compose exec -T api node packages/api/src/cli/create-staff.ts --email rollback@example.com --name Rollback >/dev/null
export API_IMAGE="$current_api"
compose up -d --wait --wait-timeout 120
check_session
[ "$(compose exec -T db psql -U dominos -d dominos -Atc \
  "select remind_before_close from users where email='rollback@example.com'")" = t ] || fail "old writer compatibility"

# Simulate a failed candidate, then restore app containers without touching persistent storage.
printf '%s\n' '{"services":{"api":{"healthcheck":{"test":["CMD","node","-e","process.exit(1)"],"interval":"1s","retries":1,"start_period":"0s"}}}}' \
  > deploy/.smoke/unhealthy.json
if docker compose -p "$project" -f deploy/.smoke/compose.json -f deploy/.smoke/unhealthy.json \
  up -d --wait --wait-timeout 25 api; then fail "unhealthy candidate accepted"; fi
compose up -d --wait --wait-timeout 120
check_session
compose restart api db >/dev/null
compose up -d --wait --wait-timeout 120 >/dev/null
check_session

deploy/database-dump.sh deploy/.smoke/restore.sql.gz -p "$project" -f deploy/.smoke/compose.json
gzip -dc deploy/.smoke/restore.sql.gz > deploy/.smoke/restore.sql
compose exec -T db createdb -U dominos dominos_restore
compose exec -T db psql -U dominos -d dominos_restore -v ON_ERROR_STOP=1 < deploy/.smoke/restore.sql >/dev/null
[ "$(compose exec -T db psql -U dominos -d dominos_restore -Atc \
  "select email from users where email='baker@example.com'")" = baker@example.com ] || fail "restore lost data"
[ "$(compose exec -T db psql -U dominos -d dominos_restore -Atc 'select count(*) from sessions')" -gt 0 ] ||
  fail "restore lost sessions"
if deploy/database-dump.sh deploy/.smoke/restore.sql.gz -p "$project" -f deploy/.smoke/compose.json; then
  fail "dump overwrote existing file"
fi

pnpm exec playwright test -c deploy/playwright.config.ts
echo "Production images, upgrade/old-app rollback, persistence, dump/restore and browser smoke passed."
