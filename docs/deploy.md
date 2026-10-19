# Moving Dominos to the HostUp VPS

The app with accounts runs on one VPS with Docker Compose: Caddy serves the app and gets the HTTPS
certificate, the API sits behind it, Postgres keeps the data, and a backup job dumps the database
every night. Everything is in [`deploy/`](../deploy), and the whole stack is tested on every push
by the **Production stack** workflow (`deploy/smoke-test.sh`).

The new home is `dominos.rmstdope.eu` on the VPS at `136.148.215.87`; its DNS (at HostUp) already
points there. Until the switch, `dominos.kurelid.se` keeps serving the WhatsApp app from one.com.

## 1. Prepare the VPS

You run these on your own machine, in this repository.

1. Make an SSH key pair that only the GitHub deploy workflow will use. It is separate from your own
   key so it can be revoked on its own, and it has no passphrase because nobody is there to type one:

   ```sh
   ssh-keygen -t ed25519 -N "" -C github-deploy -f ~/.ssh/dominos-deploy
   ```

   This writes `~/.ssh/dominos-deploy` (private, goes into a GitHub secret in step 3) and
   `~/.ssh/dominos-deploy.pub` (public, goes onto the server next).

2. Prepare the server with [`deploy/setup-vps.sh`](../deploy/setup-vps.sh). It installs Docker and
   a firewall, creates the `deploy` user that logs in with the key above, turns off password logins
   and turns on security updates. Copy it up and run it as root, which uses your own key from the
   order:

   ```sh
   scp deploy/setup-vps.sh root@136.148.215.87:
   ssh root@136.148.215.87 bash setup-vps.sh "$(cat ~/.ssh/dominos-deploy.pub)"
   ```

   If HostUp gave you a root password rather than taking your key, first run
   `ssh-copy-id root@136.148.215.87`: after the script, root can only log in with a key.

## 2. Settings on the server

Make `/opt/dominos/.env` from [`deploy/.env.example`](../deploy/.env.example):

```sh
ssh -i ~/.ssh/dominos-deploy deploy@136.148.215.87
cd /opt/dominos && nano .env   # paste deploy/.env.example and fill in POSTGRES_PASSWORD
chmod 600 .env
```

`SITE` and `APP_ORIGIN` in the example are already `dominos.rmstdope.eu`. `SMTP_URL` can stay
empty to begin with: emails, invitation links included, then go to the API's log
(`docker compose logs api`).

## 3. Settings in GitHub

Repository → Settings → Secrets and variables → Actions:

| Kind     | Name              | Value                                      |
| -------- | ----------------- | ------------------------------------------ |
| secret   | `VPS_HOST`        | `136.148.215.87`                           |
| secret   | `VPS_SSH_KEY`     | the contents of `~/.ssh/dominos-deploy`    |
| secret   | `VPS_KNOWN_HOSTS` | the output of `ssh-keyscan 136.148.215.87` |
| variable | `VPS_SITE`        | `https://dominos.rmstdope.eu`              |

## 4. Deploy and try it

1. Actions → **Deploy to VPS** → Run workflow (from `main`). It builds the images, starts the stack
   (Caddy gets the HTTPS certificate on the first start) and checks the site answers.
2. Create the first staff account and fill the pantry from the old menu:

   ```sh
   ssh -i ~/.ssh/dominos-deploy deploy@136.148.215.87
   cd /opt/dominos
   docker compose exec api node packages/api/src/cli/create-staff.ts --email you@example.com --name "Your Name"
   docker compose exec api node packages/api/src/cli/import-menu.ts
   ```

3. Open the printed invitation link, choose a password, and try the whole night: an event, an
   invitation, an order.

## 5. Email

Pick the sender and fill in `SMTP_URL` and `MAIL_FROM` in `/opt/dominos/.env`, e.g. a mailbox at
one.com: `smtps://dominos%40kurelid.se:<password>@send.one.com:465` (the `@` in the username is
written `%40`). Then `docker compose up -d` and invite yourself to check it arrives.

## 6. Retire one.com

1. Tell people the new address. Optionally point `dominos.kurelid.se` at the new site with a
   redirect in one.com's control panel.
2. In the code: deploys on every green CI run go to the VPS, the one.com workflow and the WhatsApp
   app go away, and the accounts app stops needing `VITE_ACCOUNTS`.

## Running it

| To                   | On the server, in `/opt/dominos`                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| See what is running  | `docker compose ps`                                                                                                     |
| Read the logs        | `docker compose logs -f api` (or `web`, `db`, `backup`)                                                                 |
| Restart after `.env` | `docker compose up -d`                                                                                                  |
| Roll back            | run **Deploy to VPS** again from an older commit                                                                        |
| Restore a backup     | `gunzip -c backups/dominos-<date>.sql.gz \| docker compose exec -T db psql -U dominos dominos` (into an empty database) |
| Make someone staff   | `docker compose exec api node packages/api/src/cli/create-staff.ts --email … --name …`                                  |

Backups are in `/opt/dominos/backups`, one per night (02:00 UTC), kept for 30 days;
`docker compose run --rm backup once` takes one right away, e.g. before a risky change. Copy them off the server
now and then; HostUp's own snapshots cover the whole machine.
