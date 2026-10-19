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

| Path              | What                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| `src/`            | The React app: `src/accounts/` has the screens, `src/i18n/` languages |
| `packages/api`    | The API (Hono, Drizzle, Postgres), its migrations in `drizzle/`       |
| `packages/shared` | zod schemas and types shared by the API and the app                   |
| `deploy/`         | Images, the compose stack, the server setup script and a smoke test   |
| `e2e/`            | Playwright tests of the build against the real API                    |

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

Every push to `main` runs CI, and a green CI run triggers **Deploy to VPS**: it builds the web and
API images for that commit, pushes them to the GitHub container registry and restarts the stack on
the HostUp VPS, then checks the site answers. The **Production stack** workflow tests the images and
the compose stack together whenever they could have changed. To roll back, revert on `main`.

CI runs in Playwright's container image, whose tag in `.github/workflows/ci.yml` must match the
`@playwright/test` version in the lockfile; CI fails with a pointer to it when they drift.

Setting up the server, the repository secrets, email and backups, and running it day to day, are in
[docs/deploy.md](docs/deploy.md).
