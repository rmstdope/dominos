#!/usr/bin/env bash
# Usage: database-dump.sh OUTPUT.sql.gz [docker compose options...]
set -euo pipefail
umask 077
output="${1:?Supply a new output filename ending in .sql.gz}"
shift
[[ "$output" == *.sql.gz && ! -e "$output" ]] || {
  echo "Refusing to overwrite a dump, or use a non-.sql.gz filename" >&2
  exit 1
}
partial="${output}.partial.$$"
trap 'rm -f "$partial" "$partial.gz"' EXIT
set -C
docker compose "$@" exec -T db pg_dump -U dominos -d dominos --no-owner --no-acl > "$partial"
gzip -c "$partial" > "$partial.gz"
# Atomic publication without overwriting a dump created concurrently.
ln "$partial.gz" "$output"
echo "Local dump saved to $output (not off-host disaster recovery)"
