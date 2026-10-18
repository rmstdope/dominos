#!/usr/bin/env bash
# Builds and starts the production stack from deploy/compose.yaml, over plain HTTP on port 8080,
# and checks the paths that matter through Caddy: the app, a screen's deep link, the API, a full
# invitation-to-signed-in round trip, the menu import, data surviving a restart, and the backup.
# CI runs it; it needs Docker with the compose plugin, curl and jq.
set -euo pipefail

cd "$(dirname "$0")"
export SITE=":80" HTTP_PORT=8080 HTTPS_PORT=8443 APP_ORIGIN="http://localhost:8080"
export POSTGRES_PASSWORD="smoke-test-only" TAG="smoke"
compose() { docker compose -p dominos-smoke -f compose.yaml "$@"; }
base="http://localhost:8080"
jar="$(mktemp)"

cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then compose logs --no-color --tail 80 || true; fi
  compose down -v --remove-orphans >/dev/null 2>&1 || true
  rm -rf backups "$jar"
  exit "$status"
}
trap cleanup EXIT

fail() { echo "::error::$*" >&2; exit 1; }
check() { echo "✓ $*"; }

# Made here, not by Docker, so it belongs to this user and cleanup can remove it.
mkdir -p backups
compose build
compose up -d --wait --wait-timeout 120

page="$(curl -fsS "$base/")"
grep -q '<div id="root">' <<<"$page" || fail "/ did not serve the app"
check "the app is served"
asset="$(grep -o '/assets/index-[^"]*\.js' <<<"$page" | head -1)"
curl -fsSI "$base$asset" | grep -qi 'cache-control: public, max-age=31536000, immutable' ||
  fail "$asset is not cached as immutable"
check "fingerprinted assets are cached for good"
curl -fsS "$base/events/some-event" | grep -q '<div id="root">' || fail "a deep link did not get index.html"
curl -fsSI "$base/events/some-event" | grep -qi 'cache-control: no-cache' ||
  fail "a deep link is cached"
check "a screen's address serves the app, uncached"

[ "$(curl -fsS "$base/api/health" | jq -r .ok)" = "true" ] || fail "/api/health"
check "the API answers through Caddy"

link="$(compose exec -T api node packages/api/src/cli/create-staff.ts --email baker@example.com --name "The Baker" |
  grep -o 'http[^ ]*/invitation#[A-Za-z0-9_-]*')"
token="${link#*#}"
[ -n "$token" ] || fail "create-staff printed no invitation link"
post() { curl -fsS -b "$jar" -c "$jar" -H "content-type: application/json" -H "origin: $base" "$@"; }
post -d '{"name":"The Baker","password":"pizzapizza"}' "$base/api/auth/invitations/$token" >/dev/null
[ "$(curl -fsS -b "$jar" "$base/api/me" | jq -r .role)" = "staff" ] || fail "not signed in as staff"
check "an invitation from create-staff signs the first staff member in"

compose exec -T api node packages/api/src/cli/import-menu.ts
groups="$(curl -fsS -b "$jar" "$base/api/staff/ingredient-groups" | jq length)"
[ "$groups" -gt 0 ] || fail "the menu import added no groups"
check "the WhatsApp menu imports into the pantry ($groups groups)"

compose restart api >/dev/null
compose up -d --wait --wait-timeout 60 >/dev/null
[ "$(curl -fsS -b "$jar" "$base/api/me" | jq -r .email)" = "baker@example.com" ] ||
  fail "the session did not survive a restart"
check "data and sessions survive restarting the API"

compose run --rm -T backup once
gunzip -c backups/dominos-*.sql.gz | grep -q 'CREATE TABLE public.users' || fail "no usable backup"
check "a backup on demand holds the whole database"

echo "Smoke test passed."
