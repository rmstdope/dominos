# Moving Dominos to the HostUp VPS

The app with accounts runs on one VPS with Docker Compose: Caddy serves the app and gets the HTTPS
certificate, the API sits behind it, Postgres keeps the data, and a backup job dumps the database
every night. Everything is in [`deploy/`](../deploy), and the whole stack is tested on every push
by the **Production stack** workflow (`deploy/smoke-test.sh`).

Until the switch, `dominos.kurelid.se` keeps serving the WhatsApp app from one.com. The steps
below bring the VPS up next to it, test it on its own address, and only then move the domain.

## 1. Order and prepare the VPS

1. Order a HostUp VPS: **Nano** (1 vCPU, 2 GB) is plenty. Pick **Ubuntu 26.04 LTS** (supported until 2031; 24.04 works too) and add your own
   SSH key so you can log in as root.
2. Make a key pair for the deploy workflow, on your own machine:

   ```sh
   ssh-keygen -t ed25519 -N "" -C github-deploy -f ~/.ssh/dominos-deploy
   ```

3. Prepare the server (installs Docker and a firewall, creates the `deploy` user, turns off
   password logins and turns on security updates):

   ```sh
   scp deploy/setup-vps.sh root@<vps-ip>:
   ssh root@<vps-ip> bash setup-vps.sh "$(cat ~/.ssh/dominos-deploy.pub)"
   ```

## 2. Settings on the server

Make `/opt/dominos/.env` from [`deploy/.env.example`](../deploy/.env.example):

```sh
ssh deploy@<vps-ip> -i ~/.ssh/dominos-deploy
cd /opt/dominos && nano .env   # paste deploy/.env.example and fill it in
chmod 600 .env
```

For a first test before the domain moves, use the server's own address over plain HTTP:

```sh
SITE=:80
APP_ORIGIN=http://<vps-ip>
```

`SMTP_URL` can stay empty to begin with: emails, invitation links included, then go to the API's
log (`docker compose logs api`).

## 3. Settings in GitHub

Repository → Settings → Secrets and variables → Actions:

| Kind     | Name              | Value                                         |
| -------- | ----------------- | --------------------------------------------- |
| secret   | `VPS_HOST`        | the VPS's IP address                          |
| secret   | `VPS_SSH_KEY`     | the contents of `~/.ssh/dominos-deploy`       |
| secret   | `VPS_KNOWN_HOSTS` | the output of `ssh-keyscan <vps-ip>`          |
| variable | `VPS_SITE`        | `http://<vps-ip>` now, the real address later |

## 4. Deploy and try it

1. Actions → **Deploy to VPS** → Run workflow (from `main`). It builds the images, starts the stack
   and checks the site answers.
2. Create the first staff account and fill the pantry from the old menu:

   ```sh
   ssh deploy@<vps-ip> -i ~/.ssh/dominos-deploy
   cd /opt/dominos
   docker compose exec api node packages/api/src/cli/create-staff.ts --email you@example.com --name "Your Name"
   docker compose exec api node packages/api/src/cli/import-menu.ts
   ```

3. Open the printed invitation link (with the VPS's address in it), choose a password, and try the
   whole night: an event, an invitation, an order.

## 5. Email

Pick the sender and fill in `SMTP_URL` and `MAIL_FROM` in `/opt/dominos/.env`, e.g. a kurelid.se
mailbox at one.com: `smtps://dominos%40kurelid.se:<password>@send.one.com:465` (the `@` in the
username is written `%40`). Then `docker compose up -d` and invite yourself to check it arrives.

## 6. Move the domain

1. In one.com's DNS for kurelid.se, point `dominos` at the VPS: an `A` record to its IPv4 address
   (and `AAAA` to its IPv6 one). Delete whatever `dominos` pointed at before.
2. When `dig +short dominos.kurelid.se` shows the VPS, set in `/opt/dominos/.env`:

   ```sh
   SITE=dominos.kurelid.se
   APP_ORIGIN=https://dominos.kurelid.se
   ```

   and `docker compose up -d`. Caddy gets the certificate within a minute.

3. Set the GitHub variable `VPS_SITE` to `https://dominos.kurelid.se`.
4. Last, in the code: deploys on every green CI run go to the VPS, the one.com workflow and the
   WhatsApp app go away, and the accounts app stops needing `VITE_ACCOUNTS`.

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
