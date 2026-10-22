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
  jq -e --arg revision "$REVISION" --arg owner "$GITHUB_REPOSITORY_OWNER" '
    .revision == $revision and (.images | keys == ["api","web"]) and
    (.images.web | test("^ghcr.io/" + $owner + "/dominos-web@sha256:[0-9a-f]{64}$")) and
    (.images.api | test("^ghcr.io/" + $owner + "/dominos-api@sha256:[0-9a-f]{64}$"))
  ' publication/deployment.json >/dev/null
  echo "preserved=true" >> "$GITHUB_OUTPUT"
  if [ "$run" = "$GITHUB_RUN_ID" ]; then echo "artifact_exists=true" >> "$GITHUB_OUTPUT"; fi
  echo "Preserving previously tested revision manifest from run $run"
  exit 0
done
echo "preserved=false" >> "$GITHUB_OUTPUT"
