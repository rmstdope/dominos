# Running Dominos on the HostUp VPS

Dominos runs on one VPS with Docker Compose: Caddy serves the app and gets the HTTPS
certificate, the API sits behind it, Postgres keeps the data, and a backup job dumps the database
every night. Everything is in [`deploy/`](../deploy), and the whole stack is tested on every push
by the **Production stack** workflow (`deploy/smoke-test.sh`).

It lives at `dominos.rmstdope.eu`, on the VPS at `136.148.215.87`; the domain's DNS is at HostUp.
Every green CI run on `main` is deployed by the **Deploy to VPS** workflow. The steps below set up
a server from scratch, as was done for this one.

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
   ssh root@136.148.215.87 bash setup-vps.sh < ~/.ssh/dominos-deploy.pub
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

Mail goes out through HostUp's relay, which needs no login: it trusts the VPS's address.

1. In HostUp's DNS for `rmstdope.eu`, add three TXT records:

   | Name                  | Value                                            |
   | --------------------- | ------------------------------------------------ |
   | `_hostup.rmstdope.eu` | `v=mc1 auth=h_MTM2LjE0OC4yMTUuODc=_29b82ae43920` |
   | `rmstdope.eu`         | `v=spf1 include:spf.hostup.se ~all`              |
   | `_dmarc.rmstdope.eu`  | `v=DMARC1; p=none`                               |

   The first lets the relay send for the domain, the SPF record tells receivers to trust it, and
   Gmail and Outlook want a DMARC record too.

   The relay also refuses a sender domain without an MX record (`554 5.7.27 Sender domain cannot
receive mail`). Ours is `rmstdope.eu MX 10 mail.rmstdope.eu`, which is the VPS. Nothing there
   receives mail, so replies and bounces are lost.

2. In `/opt/dominos/.env`:

   ```sh
   SMTP_URL=smtp://relay.hostup.se:587?requireTLS=true
   MAIL_FROM=Dominos <dominos@rmstdope.eu>
   ```

   Then `docker compose up -d` and invite yourself to check it arrives (and not in spam).

## 6. Sharing the VPS with other sites

The VPS also serves `retroquest.rmstdope.eu`. Only one program can hold ports 80 and 443, so a
small shared **edge** Caddy does: it lives in `/opt/edge` (its files are in the RetroQuest
repository, `deploy/edge/`), gets the HTTPS certificates for every name, and forwards
`dominos.rmstdope.eu` to this stack's `web` service over Docker's `dominos_default` network.

Behind the edge, this stack's Caddy serves plain HTTP and publishes its ports on the server's own
loopback only, so nothing reaches it but the edge. In `/opt/dominos/.env`:

```sh
SITE=:80
HTTP_PORT=127.0.0.1:8080
HTTPS_PORT=127.0.0.1:8443
```

`APP_ORIGIN` stays `https://dominos.rmstdope.eu`: it is still the address visitors use, and it
keeps the session cookie secure. The [`Caddyfile`](../deploy/Caddyfile) believes `X-Forwarded-For`
only from private (Docker) addresses and hands the API the visitor's address alone, so the API's
rate limits still count each visitor, not the edge.

That trust covers Docker's own gateway address too, which is where a visitor reaching a published
port appears from. So on the server these ports stay on loopback: published on the public address
without the edge, a visitor could send their own `X-Forwarded-For` and slip the rate limits.

Switching an existing server over, in this order:

1. Change `/opt/dominos/.env` as above, then `cd /opt/dominos && docker compose up -d --wait`. The
   ports are freed and Dominos is unreachable until the next step, a few seconds.
2. Start the edge (`cd /opt/edge && docker compose up -d`, set up as the RetroQuest repository's
   `docs/deploy.md` describes). It joins `dominos_default`, so Dominos must be up first, and it gets
   a fresh certificate for `dominos.rmstdope.eu` on its first start.

If the network is ever recreated (`docker compose down` in `/opt/dominos`), restart the edge too:
`cd /opt/edge && docker compose restart`. The old `caddy-data` volume is no longer used.

The deploy workflow's check of `VPS_SITE` goes through the edge, so it still proves the site
answers.

## Running it

| To                   | On the server, in `/opt/dominos`                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| See what is running  | `docker compose ps`                                                                                                     |
| Read the logs        | `docker compose logs -f api` (or `web`, `db`, `backup`)                                                                 |
| Restart after `.env` | `docker compose up -d`                                                                                                  |
| Roll back            | revert the commit on `main`: CI tests the revert and deploys it                                                         |
| Restore a backup     | `gunzip -c backups/dominos-<date>.sql.gz \| docker compose exec -T db psql -U dominos dominos` (into an empty database) |
| Make someone staff   | `docker compose exec api node packages/api/src/cli/create-staff.ts --email … --name …`                                  |

Backups are in `/opt/dominos/backups`, one per night (02:00 UTC), kept for 30 days;
`docker compose run --rm backup once` takes one right away, e.g. before a risky change. Copy them off the server
now and then; HostUp's own snapshots cover the whole machine.
