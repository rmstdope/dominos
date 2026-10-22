# Dominos 🍕

Pizza nights, ordered ahead. Staff plan an event, choose its menu from the pantry and invite
people by email; guests sign in, build their pizza before orders close, and staff see the orders
and a prep list on the night. Live at [dominos.rmstdope.eu](https://dominos.rmstdope.eu).

Everything is invite-only: nobody can register, an account is created by accepting an invitation,
and guests only see the events they were invited to. One pizza per person per event. The design,
data model and API are in [docs/backend-design.md](docs/backend-design.md).

## Languages

English and Swedish, emails included. A toggle in the header switches between them, the choice is
remembered in the browser, and the first visit follows the browser language. Ingredient and group
names are entered by staff in both languages.

## Layout

| Path              | What                                                                    |
| ----------------- | ----------------------------------------------------------------------- |
| `src/`            | The React app: `src/accounts/` has the screens, `src/i18n/` languages   |
| `packages/api`    | The API (Hono, Drizzle, Postgres), its migrations in `drizzle/`         |
| `packages/shared` | zod schemas and types shared by the API and the app                     |
| `deploy/`         | Images, reviewed runtime bundle, dump helper and production smoke tests |
| `e2e/`            | Playwright tests of the build against the real API                      |

Stack: Vite, React 19, TypeScript, Tailwind CSS 4, TanStack Query, React Router, Hono, Drizzle,
Vitest + Testing Library, Playwright.

## Develop

```sh
pnpm install
pnpm dev:api        # the API on :3000
pnpm dev            # the app on :5173, with /api proxied to the API
pnpm --filter @dominos/api create-staff --email you@example.com --name "Your Name"
pnpm --filter @dominos/api import-menu   # optional: fill the pantry from config/menu.json
pnpm test:watch     # Vitest in watch mode
pnpm check          # everything CI runs: lint, types, format, unit and API tests, build, e2e
```

Locally the API needs no database server: without `DATABASE_URL` it keeps an embedded
[PGlite](https://pglite.dev) database in `packages/api/.data/`, and without `SMTP_URL` it prints
emails, links included, to its log. `create-staff` prints an invitation link; open it to choose a
password. Settings are listed in `packages/api/.env.example`. After changing
`packages/api/src/db/schema.ts`, run `pnpm --filter @dominos/api db:generate` to write the migration;
the API applies migrations when it starts.

## Deploy

Every push to `main` runs application checks and an isolated production-image stack/browser test.
Only after both succeed does a separate publication job push the exact tested web/API images and
emit one immutable `deployment-manifest`. CI does not SSH to or modify the VPS.
The shared host tooling imports the reviewed `deploy/runtime` bundle and, after explicit operator
activation, polls approved main manifests. Database storage is stable across releases; application
rollback never rolls back database contents. Only backward-compatible migrations are permitted.

CI runs in Playwright's container image, whose tag in `.github/workflows/ci.yml` must match the
`@playwright/test` version in the lockfile; CI fails with a pointer to it when they drift.

Registration, the separately authorized fresh-database rollout, host settings, email, local
dump/restore and the explicitly accepted lack of off-host backups are in
[docs/deploy.md](docs/deploy.md).
