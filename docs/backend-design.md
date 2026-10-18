# Backend design

Dominos is moving from a static page that sends orders over WhatsApp to an app with accounts. Staff
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
dominos.kurelid.se  →  HostUp VPS, Docker Compose
  Caddy     automatic HTTPS; serves the React build and proxies /api/* to the API
  API       Hono on Node 22+, run straight from TypeScript (Node type stripping)
  Postgres  migrations applied by the API on start; nightly pg_dump plus HostUp snapshots
```

The browser sees one origin, so there is no CORS and the session cookie is first-party. Reminder
emails run from a systemd timer on the VPS rather than a scheduled GitHub Actions workflow. Email
goes out through SMTP (a transactional provider or a kurelid.se mailbox), since VPS hosts often
block sending mail directly.

| Path              | What                                                                       |
| ----------------- | -------------------------------------------------------------------------- |
| `/` (repo root)   | The React app. Moves to `apps/web` at cutover, when its deploy changes too |
| `packages/shared` | zod schemas and types for every request and response                       |
| `packages/api`    | The API, its Drizzle schema and SQL migrations (`drizzle/`)                |

Tests and local dev use [PGlite](https://pglite.dev), Postgres compiled to WebAssembly, so neither
needs Docker. Production uses a real Postgres with the same schema and queries.

## Data model

| Table                | Key columns                                                                                                                                  | Notes                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `users`              | email (unique, lower-cased), name, role, language, password_hash (null until the invitation is accepted), disabled_at                        | ✅ Built                                                     |
| `auth_tokens`        | user_id, kind `invite`/`reset`, token_hash, expires_at, used_at                                                                              | ✅ Built. Single use; invitations last 7 days, resets 1 hour |
| `sessions`           | token_hash, user_id, expires_at                                                                                                              | ✅ Built. 30 days, extended while in use                     |
| `ingredient_groups`  | name_en, name_sv, sort                                                                                                                       | ✅ Built. Meat / Veg / Extras                                |
| `ingredients`        | group_id, name_en, name_sv, in_stock, archived_at, sort                                                                                      | ✅ Built. Archived, never deleted, so old orders keep them   |
| `events`             | name, starts_at, location, orders_close_at, max_toppings (null = no limit), note_en/sv, ask_make_own, status `draft`/`published`/`cancelled` | ✅ Built. "Open", "closed" and "past" follow from the times  |
| `event_ingredients`  | event_id, ingredient_id                                                                                                                      | ✅ Built. The event's menu                                   |
| `event_invitations`  | event_id, user_id, status `invited`/`declined`, invited_at, last_reminded_at, first_seen_at                                                  | "Opened" means seen in the app                               |
| `orders`             | event_id, user_id, **unique (event_id, user_id)**, number, make_own, comment, baked_at                                                       | `number` is per event (#07)                                  |
| `order_toppings`     | order_id, ingredient_id                                                                                                                      |                                                              |
| `favourite_toppings` | user_id, ingredient_id                                                                                                                       | Pre-fills the pizza builder                                  |
| `reminders_sent`     | event_id, user_id, kind                                                                                                                      | Keeps the reminder job from sending twice                    |

Rules the API enforces (the screens only mirror them): an order needs an invitation that is not
declined, a published event and an open deadline; every topping must be on the event's menu and in
stock, and within `max_toppings`. Declining deletes the order. Removing a topping from a menu keeps
existing orders and emails those affected. There is always at least one enabled staff member.

## API

JSON under `/api`. Errors are `{ "error": { "code", "message" } }`, with the codes in
`packages/shared/src/errors.ts`.

**Auth** ✅ built

| Endpoint                        | Does                                                               |
| ------------------------------- | ------------------------------------------------------------------ |
| `POST /auth/login`              | Email and password; sets the session cookie, returns the user      |
| `POST /auth/logout`             | Ends the session on the server and clears the cookie               |
| `GET /auth/invitations/:token`  | Who the invitation is for, for the accept screen                   |
| `POST /auth/invitations/:token` | Name and password; activates the account and signs in              |
| `POST /auth/forgot`             | Emails a reset link if the account exists; always answers 204      |
| `POST /auth/reset`              | Token and new password; signs out every other session and signs in |
| `GET /me`                       | The signed-in user                                                 |
| `GET /health`                   | Checks the database answers                                        |

**Customer:** `PATCH /me` (name, language, reminders), `POST /me/password`, `GET`/`PUT
/me/favourite`, `GET /events` (only invited ones), `GET /events/:id` (menu and my order), `PUT`/`DELETE
/events/:id/order`, `POST /events/:id/decline`.

**Staff** (`/staff/…`, 401 signed out, 403 for customers)

| Endpoints ✅ built                                                                                                                      | Does                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `GET`/`POST /ingredient-groups`, `PATCH`/`DELETE /ingredient-groups/:id`                                                                | Groups in both languages; a group is deleted only when empty                                                            |
| `GET /ingredients[?archived=include]`, `POST`, `PATCH /ingredients/:id`                                                                 | Rename, move group, in stock, archive and restore                                                                       |
| `GET`/`POST /people`, `PATCH /people/:id`, `POST /people/:id/resend-invitation`                                                         | Invite with a role (emails the link), change email, name or role, disable; always one staff member left                 |
| `GET`/`POST /events`, `GET`/`PATCH`/`DELETE /events/:id`, `PUT /events/:id/menu`, `POST /events/:id/publish`, `POST /events/:id/cancel` | Drafts with a menu; publishing needs a menu and a future deadline; only drafts are deleted; cancelled events are frozen |

Still to come: `POST events/:id/invitations` (existing people and new ones, who get the account
invitation in the same email), `POST events/:id/reminders`, `GET events/:id/orders` (with prep
totals) and `PATCH orders/:id` (baked).

## Security

- Passwords: Argon2id. Unknown emails are checked against a dummy hash, so timing does not reveal
  which accounts exist, and `/auth/forgot` sends its email after answering for the same reason.
- Tokens in cookies and email links are 32 random bytes; the database keeps only their SHA-256.
- Email links carry the token in the fragment (`/invitation#…`), which browsers never send to a
  server or in a Referer header.
- Session cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, replaced on every sign-in.
- CSRF: request bodies must be JSON, which another site cannot send without a CORS preflight the
  API never answers, and form posts from other origins are refused.
- Rate limits, in memory: sign-in per address and per email, token endpoints per address, and
  reset emails per address and per email.

## Build order

1. **Foundation** ✅ Workspace, API, database and migrations, `create-staff`, every sign-in flow.
2. **Staff API and sign-in screens** ✅ Ingredients and groups, people and roles, events with menus
   (API only). Sign in, accept an invitation, forgot and reset password in the frontend, behind
   `VITE_ACCOUNTS=true`.
3. **Staff screens:** events and their menus, ingredients, people and roles (S1, S2, S5, S6 on the
   canvas).
4. **The core loop:** event invitations and their emails, the customer's events, the pizza builder,
   order placed.
5. **Running the night:** orders and prep list, baked, reminders, profile and favourite pizza.
6. **Cutover:** the VPS (Docker Compose, Caddy, Postgres, backups), the deploy pipeline, DNS for
   `dominos.kurelid.se`, importing `config/menu.json` as ingredients, removing WhatsApp and the
   `VITE_ACCOUNTS` flag.

The current app keeps working, and deploying to one.com, until step 6.
