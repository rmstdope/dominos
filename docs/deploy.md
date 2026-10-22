# Shared-host deployment

Dominos uses the reusable deployment tooling in
[`rmstdope/rmstdope-infra`](https://github.com/rmstdope/rmstdope-infra).
CI publishes images; it never SSHes to a host or changes a live installation.
The shared Caddy ingress owns ports 80/443 and HTTPS. The web image serves static
HTTP on 8080; `/api` and `/api/*` go directly to the API on 3000, preserving the
prefix. Only these HTTP services join `rmstdope-proxy`. Postgres stays on an
internal private network, with no published ports.

## Merge and rollout are separate

This change does **not** authorize installation, initial deployment, resuming
automation, or removal of old resources.

Before merging publication changes, an operator must ensure the old **Deploy to
VPS** workflow cannot run: a `workflow_run` listener from the old default branch
can observe CI completion during a cutover. This PR deletes that workflow, but
does not disable it through GitHub's API or revoke credentials. Separately
authorize a sequenced cutover (for example, remove the legacy workflow first,
wait for any old run to finish, then merge publication). Revoke only its obsolete
CI SSH key, preserving unrelated operator access. Do not start two Caddy stacks
on public ports 80/443.

Inspect the existing VPS state first. The shared installation starts a **fresh
database**, not the retired Dominos data. Do not delete, rename, import, or reuse
old volumes, `/opt/dominos`, dumps, or settings implicitly.

## What CI publishes

`.github/workflows/ci.yml` runs formatting, lint, types, unit/API tests, production
build, and end-to-end tests. A second job builds the production images and runs
`deploy/smoke-test.sh` in disposable Docker networks/storage. It tests HTTP
behavior, real invitation/session flows, secure cookies, migration compatibility,
persistence, a failed candidate, dump/restore, and a browser sign-in.

Only a successful **push to main**, after both jobs succeed, gets package-write
permission in a separate job. It downloads the exact tested Docker archives;
it does not rebuild. Its one `deployment-manifest` artifact contains
`deployment.json`:

```json
{
  "revision": "<full 40-character Git revision>",
  "images": {
    "web": "ghcr.io/rmstdope/dominos-web@sha256:<digest>",
    "api": "ghcr.io/rmstdope/dominos-api@sha256:<digest>"
  }
}
```

No deployment is triggered by a pull request or `workflow_run`. Reruns preserve an
existing manifest for the revision. Existing revision tags are reused and tested;
publication refuses to repoint a tag at different contents after a partial run.
Manifests are retained for 90 days, image archives for two days (a later
publish-only rerun needs a new image-test job if its archive has expired).
Do not delete released GHCR digests; an artifact alone does not retain images.

## Reviewed runtime bundle

`deploy/runtime/` contains exactly `app.json`, `compose.json`, and `route.caddy`.
Review all three together. The host imports and freezes these files; routine
releases change only the web/API digests, never the database image or storage.
The database image is an immutable Postgres 17 Alpine index digest. Its named
volume is **`rmstdope-dominos-db-v1`**, independent of release directories.
No build directives, host mounts, public ports or Docker socket are in the bundle.
Web/API retain their image-native healthchecks; API health queries the database.
Runtime memory limits are web 128 MiB, API 384 MiB and Postgres 512 MiB, with
bounded CPU, process counts and logs. Check real usage during authorized rollout;
these limits are not a substitute for shared-host capacity planning.

Provision protected host settings **before registration**: root-owned directory
`/srv/rmstdope/secrets/dominos`, mode 0700, files mode 0600, never committed.
The release environment supplies `SECRETS_DIR=/srv/rmstdope/secrets/dominos`.
The reviewed bundle references:

| File      | Required contents                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| `db.env`  | `POSTGRES_USER=dominos`, `POSTGRES_DB=dominos`, `POSTGRES_PASSWORD=<new strong password>`                  |
| `api.env` | `DATABASE_URL=postgres://dominos:<URL-encoded same password>@db:5432/dominos`, `SMTP_URL`, and `MAIL_FROM` |

These are **setting names and examples**, not real credentials. Do not expose
actual values in terminal logs or PRs. Compose fixes `APP_ORIGIN` to
`https://dominos.rmstdope.eu`, `TRUST_PROXY=true`, `COOKIE_SECURE=true`, and port 3000. The API receives the original host/HTTPS/client address directly from
shared Caddy, not from a second web proxy. Only trusted services may join the
shared proxy network; do not expose API port 3000 separately.

With the reviewed infrastructure version installed, use an explicitly reviewed
checkout (not a mutable remote URL):

```sh
sudo rmstdope-deploy app register dominos --bundle /path/to/reviewed/dominos/deploy/runtime
```

Registration validates Compose/Caddy and freezes the approved bundle. It is not a
live rollout. Use the infrastructure runbook to provision GHCR read access,
deploy an explicitly approved digest pair, verify health/revision/mail, enroll
at a **paused baseline**, and only then explicitly resume main polling.
The dedicated read-only GitHub token needs access to `rmstdope/dominos`.

## Initial staff and mail

For maintenance, identify the active release's generated Compose file and
environment file from the infrastructure installation. Use its project name
and exact files, not a separate checkout/project (which could create a second
database network). Below, `COMPOSE_FILE`, `RELEASE_ENV` and `PROJECT` mean those
reviewed active paths/name; they are not application secrets.

```sh
docker compose -p "$PROJECT" --env-file "$RELEASE_ENV" -f "$COMPOSE_FILE" \
  exec api node packages/api/src/cli/create-staff.ts --email you@example.com --name "Your Name"
docker compose -p "$PROJECT" --env-file "$RELEASE_ENV" -f "$COMPOSE_FILE" \
  exec api node packages/api/src/cli/import-menu.ts
```

Keep the staff invitation link private; open it and choose a password. Menu
import is optional and uses only the committed `config/menu.json`. Other local
configuration files are excluded from Docker build contexts.

For HostUp relay mail, set `SMTP_URL=smtp://relay.hostup.se:587?requireTLS=true`
and `MAIL_FROM=Dominos <dominos@rmstdope.eu>`. Verify current relay authorization,
SPF, DMARC and an MX record for the sender domain with the provider; the relay
rejects a domain without MX. A sender without a receiving mailbox loses replies
and bounces. Verify real invitation delivery during the authorized rollout.
Without SMTP, the API logs invitation links rather than sending them: treat logs
as sensitive and do not use that mode unintentionally in production.

## Data, migrations and application rollback

The API applies Drizzle migrations on startup. Only **backward-compatible**
migrations may ship in ordinary releases: additive nullable/defaulted columns,
new tables, and old-app-compatible read/write behavior. Do not drop/rename
columns, tighten constraints incompatibly, or change existing data semantics.
Review migrations and update the compatibility fixture to the actual previous
release before introducing schema changes. Destructive changes require a
separate approved maintenance plan, not a generic migration engine.

The smoke test currently starts real historical API revision
`7019b744a1c15e68112624407217e8bf4f4cd161` (schema through `0002`), seeds a
staff account/session, starts the current image to apply `0003`, then starts
that old application again against the migrated schema and verifies old writes.
This tests the existing additive migration; it is not a blanket proof for future
migrations. The test also restores the current image after an unhealthy candidate
without deleting data.

Application rollback restores image digests, **not database contents or schema**.
Never use `docker compose down -v` on production. Runtime bundle, Postgres version,
secret and storage changes require explicit reviewed maintenance; this increment
does not update frozen bundles automatically.

## Local dumps and isolated restore

**There are no off-VPS backups. Host/disk loss can lose all application data.**
This risk is explicitly accepted for now; local dumps are useful for operator
mistakes, not disaster recovery. No offsite-backup gate blocks activation.
No automatic backup service is included.

Create an operator-owned mode-0700 local backup directory on stable host storage
outside release directories. Take a dump before maintenance, and periodically
as an explicitly scheduled operator task if desired:

```sh
deploy/database-dump.sh "/srv/rmstdope/backups/dominos/dominos-$(date -u +%Y%m%dT%H%M%SZ).sql.gz" \
  -p "$PROJECT" --env-file "$RELEASE_ENV" -f "$COMPOSE_FILE"
```

The helper checks `pg_dump` and gzip separately, cleans failed partial files,
uses mode-0600 files, and atomically publishes without overwriting an existing
dump. It does not silently accept the success of gzip after `pg_dump` failed.
Retain dumps intentionally; no automatic retention/deletion is enabled.

Test restore into an **isolated empty database**, never over production. Example
using an already provisioned isolated Compose project:

```sh
gzip -dc /path/to/dump.sql.gz > ./restore.sql
docker compose -p "$ISOLATED_PROJECT" -f "$ISOLATED_COMPOSE" exec -T db \
  psql -U dominos -d dominos_restore -v ON_ERROR_STOP=1 < ./restore.sql
rm ./restore.sql
```

Check users, sessions and expected business data in the restored database.
The CI smoke actually creates `dominos_restore`, restores the dump with
`ON_ERROR_STOP`, and checks persisted users/sessions. Recovering production
contents requires a separately approved downtime/restore plan.

## Local verification

```sh
pnpm check
node --test deploy/*.test.mjs
deploy/smoke-test.sh
```

The last command needs Docker Compose, curl, jq, pnpm and installed Playwright
Chromium. It builds current images, uses only generated `dominos-smoke-*`
networks/volumes and localhost:18080, then removes its isolated data. It never
uses the production volume or reads actual host settings.
