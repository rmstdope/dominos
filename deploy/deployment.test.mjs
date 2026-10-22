import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { gunzipSync } from "node:zlib";

// All scratch files stay inside the repository, never system temporary directories.
function fixture(t) {
  const dir = mkdtempSync(resolve("deploy/.test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function executable(dir, name, source) {
  writeFileSync(`${dir}/${name}`, `#!/usr/bin/env bash\nset -euo pipefail\n${source}\n`, {
    mode: 0o700,
  });
}

function dump(dir, output, env = {}) {
  return spawnSync("bash", ["deploy/database-dump.sh", output], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, ...env },
  });
}

test("local dump propagates pg_dump failure, removes partials and publishes nothing", (t) => {
  const dir = fixture(t);
  executable(dir, "docker", 'printf "incomplete SQL"; exit 23');
  const result = dump(dir, `${dir}/failed.sql.gz`);
  assert.equal(result.status, 23);
  assert.throws(() => readFileSync(`${dir}/failed.sql.gz`), { code: "ENOENT" });
});

test("local dump publishes a restorable gzip and refuses to overwrite it", (t) => {
  const dir = fixture(t);
  executable(dir, "docker", 'printf "CREATE TABLE example (id int);\\n"');
  const output = `${dir}/database.sql.gz`;
  assert.equal(dump(dir, output).status, 0);
  assert.equal(gunzipSync(readFileSync(output)).toString(), "CREATE TABLE example (id int);\n");
  const before = readFileSync(output);
  assert.notEqual(dump(dir, output).status, 0);
  assert.deepEqual(readFileSync(output), before);
});

test("local dump does not publish when compression fails", (t) => {
  const dir = fixture(t);
  executable(dir, "docker", 'printf "SQL"');
  executable(dir, "gzip", 'printf "partial gzip"; exit 24');
  assert.equal(dump(dir, `${dir}/failed.sql.gz`).status, 24);
  assert.throws(() => readFileSync(`${dir}/failed.sql.gz`), { code: "ENOENT" });
});

test("rerunning publication preserves the current run's immutable manifest", (t) => {
  const dir = fixture(t);
  const revision = "a".repeat(40);
  const manifest = {
    revision,
    images: {
      web: `ghcr.io/rmstdope/dominos-web@sha256:${"b".repeat(64)}`,
      api: `ghcr.io/rmstdope/dominos-api@sha256:${"c".repeat(64)}`,
    },
  };
  executable(
    dir,
    "gh",
    `case "$2" in
      */runs\\?*) echo 123 ;;
      */runs/123/artifacts) echo 456 ;;
      */artifacts/456/zip) echo archive ;;
      *) exit 90 ;;
    esac`,
  );
  executable(dir, "unzip", `printf '%s' '${JSON.stringify(manifest)}'`);
  // The real jq validates immutable repositories/revision; only network/archive transport is fake.
  const result = spawnSync("bash", [resolve("deploy/preserve-manifest.sh")], {
    cwd: dir,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
      GITHUB_REPOSITORY: "rmstdope/dominos",
      GITHUB_REPOSITORY_OWNER: "rmstdope",
      GITHUB_RUN_ID: "123",
      GITHUB_OUTPUT: `${dir}/output`,
      REVISION: revision,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(`${dir}/publication/deployment.json`)), manifest);
  assert.match(readFileSync(`${dir}/output`, "utf8"), /preserved=true\nartifact_exists=true/);
});
