#!/usr/bin/env bash
# A workflow rerun must not assign a new digest pair to an already released revision.
set -euo pipefail
: "${GITHUB_REPOSITORY:?}" "${GITHUB_RUN_ID:?}" "${REVISION:?}" "${GITHUB_OUTPUT:?}"
mkdir -p publication
runs="$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/ci.yml/runs?event=push&branch=main&head_sha=$REVISION&per_page=100" \
  --jq '.workflow_runs[] | select(.conclusion == "success" or (.id | tostring) == env.GITHUB_RUN_ID) | .id')"
for run in $runs; do
  artifact="$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$run/artifacts" \
    --jq '.artifacts[] | select(.name == "deployment-manifest" and .expired == false) | .id' | head -1)"
  [ -n "$artifact" ] || continue
  gh api "repos/$GITHUB_REPOSITORY/actions/artifacts/$artifact/zip" > publication/existing.zip
  unzip -p publication/existing.zip deployment.json > publication/deployment.json
  node --input-type=module - "$REVISION" "$GITHUB_REPOSITORY_OWNER" <<'JS'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const [revision, owner] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync("publication/deployment.json", "utf8"));
assert.equal(Object.keys(manifest).sort().join(","), "images,revision");
assert.equal(manifest.revision, revision);
assert.equal(Object.keys(manifest.images).sort().join(","), "api,web");
for (const service of ["api", "web"]) {
  const prefix = `ghcr.io/${owner}/dominos-${service}@sha256:`;
  const ref = manifest.images[service];
  assert(typeof ref === "string" && ref.startsWith(prefix) &&
    /^[a-f0-9]{64}$/.test(ref.slice(prefix.length)), "Invalid immutable image reference");
}
JS
  echo "preserved=true" >> "$GITHUB_OUTPUT"
  if [ "$run" = "$GITHUB_RUN_ID" ]; then echo "artifact_exists=true" >> "$GITHUB_OUTPUT"; fi
  echo "Preserving previously tested revision manifest from run $run"
  exit 0
done
echo "preserved=false" >> "$GITHUB_OUTPUT"
