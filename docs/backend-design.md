# Backend design

Dominos began as a static page that sent orders over WhatsApp and is now an app with accounts. Staff
plan pizza events, pick the menu, invite people and see orders; customers order for the events they
are invited to. The screens are mocked up on the
[design canvas](https://claude.ai/artifact/NLMMJjZcGKJ4zX6YAdZzJr) (direction A, "Late oven").

## Decisions

- **Invite-only.** Nobody can register. Staff invite a person by email; accepting the invitation
  is how the account gets a password. Customers only see events they were invited to.
- **One pizza per person per event**, enforced by a unique key on orders.
- **Two roles:** `customer` and `staff`. Staff can order too.
- **All TypeScript**, in one pnpm workspace with types shared between the API and the frontend.
- **One HostUp VPS** (Stockholm) runs everything; one.com cannot run Node.
- **English and Swedish** everywhere, emails included, as the app is today.

## Architecture

```
dominos.rmstdope.eu  →  HostUp VPS, Docker Compose
  Caddy     automatic HTTPS; serves the React build and proxies /api/* to the API
  API       Hono on Node 22+, run straight from TypeScript (Node type stripping)
  Postgres  migrations applied by the API on start; nightly pg_dump plus HostUp snapshots
```

The browser sees one origin, so there is no CORS and the session cookie is first-party. Reminder
emails are sent by the API itself, which checks every ten minutes (no cron or GitHub Actions
schedule to keep running); the `reminders_sent` table makes each one go out once. Email
goes out through SMTP (HostUp's relay), since VPS hosts often
block sending mail directly.

| Path              | What                                                        |
| ----------------- | ----------------------------------------------------------- |
| `/` (repo root)   | The React app                                               |
| `packages/shared` | zod schemas and types for every request and response        |
| `packages/api`    | The API, its Drizzle schema and SQL migrations (`drizzle/`) |

Tests and local dev use [PGlite](https://pglite.dev), Postgres compiled to WebAssembly, so neither
needs Docker. Production uses a real Postgres with the same schema and queries.

## Data model

| Table               | Key columns                                                                                                                                  | Notes                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `users`             | email (unique, lower-cased), name, role, language, password_hash (null until the invitation is accepted), disabled_at                        | ✅ Built                                                     |
| `auth_tokens`       | user_id, kind `invite`/`reset`, token_hash, expires_at, used_at                                                                              | ✅ Built. Single use; invitations last 7 days, resets 1 hour |
| `sessions`          | token_hash, user_id, expires_at                                                                                                              | ✅ Built. 30 days, extended while in use                     |
| `ingredient_groups` | name_en, name_sv, sort                                                                                                                       | ✅ Built. Meat / Veg / Extras                                |
| `ingredients`       | group_id, name_en, name_sv, archived_at, sort                                                                                                | ✅ Built. Archived, never deleted, so old orders keep them   |
| `events`            | name, starts_at, location, orders_close_at, max_toppings (null = no limit), note_en/sv, ask_make_own, status `draft`/`published`/`cancelled` | ✅ Built. "Open", "closed" and "past" follow from the times  |
| `event_ingredients` | event_id, ingredient_id                                                                                                                      | ✅ Built. The event's menu                                   |
| `event_invitations` | event_id, user_id, status `invited`/`declined`, invited_at, last_reminded_at, first_seen_at                                                  | "Opened" means seen in the app                               |
| `orders`            | event_id, user_id, **unique (event_id, user_id)**, number, make_own, comment, late, baked_at                                                 | `number` is per event (#07)                                  |
| `order_toppings`    | order_id, ingredient_id                                                                                                                      |                                                              |
