# Nexus Commerce — Production Deployment & Disaster Recovery Guide

## System Architecture

1. **Frontend**: Vite + React SPA, served by NGINX (`Dockerfile` + `nginx.conf`).
2. **API**: Node.js + Express + Prisma (port 5000, not published to the host).
3. **Database**: PostgreSQL 16, multi-tenant row isolation.
4. **Cache**: Redis 7.

## Release order for the first deploy

Two changes in this release interact badly if they land together. Deploy in
this order.

### 1. Email first, and prove it works

The session-token change below signs everybody out. If SMTP is misconfigured
at that moment, every user is simultaneously logged out **and** unable to reset
their password — the one failure that turns a routine deploy into a lockout.

So: deploy with SMTP configured, confirm a real reset email arrives, and only
then proceed. The API refuses to boot in production without usable
credentials, which catches the blatant case; it cannot tell you the mailbox
actually receives.

### 2. Session hashing signs everyone out, once

Session tokens are now stored as SHA-256 digests, so existing rows no longer
match the cookies clients hold. Every user signs in again — once.

There is deliberately no dual-read migration. Accepting both the old and new
formats during a transition would mean shipping code that still honours the
exact plaintext credential the change exists to eliminate, which is a strange
thing to do for the sake of one forced re-login. Pick a low-traffic window
instead.

### 3. One merchant account per seller

A partial unique index now enforces at most one OWNER membership per user. No
existing account violated it when this was written; if yours does, the
migration fails loudly rather than silently dropping a membership. Resolve the
duplicate first.

---

> **Note on background jobs.** `server/src/jobs/jobQueue.ts` is an in-process
> queue: an array, drained by the same process that serves requests. It has no
> persistence, no retries and no scheduler. Redis is in the stack and
> `REDIS_URL` is read into config, but **nothing uses it yet** — an earlier
> version of this guide advertised "Redis 7 + BullMQ worker queue", which was
> never built. Consequences to plan around:
>
> - A restart mid-queue drops whatever was pending (a receipt email, a
>   low-stock alert). Nothing retries it.
> - `PROCESS_SUBSCRIPTION_RENEWALS` and `PROCESS_GRACE_PERIODS` exist as job
>   types but **nothing schedules them**, so subscriptions do not renew on
>   their own. Drive them from an external cron hitting an admin endpoint, or
>   move the queue onto Redis, before relying on recurring billing.
> - Running more than one API replica means each one has its own queue.
>
> **Recommendation: run a single API instance and leave `SCHEDULER_ENABLED`
> at `true`.** The jobs are safe against double-running — each claims its row
> before acting — so a second replica is wasteful rather than wrong, but there
> is no reason to take on that shape before you need it.
>
> Revisit when you add a replica, or when losing a queued email to a restart
> stops being acceptable. At that point the fix is not the flag: it is moving
> the queue onto Redis, which is already in the stack and used by nothing.

---

## Before the first deploy

### 1. Configure secrets

```bash
cp .env.example .env            # compose + frontend build args
cp server/.env.example server/.env   # only needed for non-container deploys
```

Fill in every value marked required in `.env`. `docker-compose.yml` uses
`${VAR:?...}` for those, so compose **refuses to start** rather than booting a
stack with a placeholder secret.

Generate the session secret properly:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. TLS is mandatory

The session cookie is issued `SameSite=None; Secure` when `NODE_ENV=production`
(`auth.controller.ts`). A browser **silently discards a Secure cookie sent over
plain HTTP**, so on an `http://` deployment every login appears to succeed and
the next request is unauthenticated. `server.ts` calls
`assertSessionCookieCanWork()` on boot to catch the obvious case, but it cannot
tell whether the thing in front of it actually terminates TLS.

`nginx.conf` now serves 443 itself and redirects 80. It needs two files in
`TLS_CERT_DIR` (default `./certs`), and **nginx will not start without them** —
the correct failure, since the alternative is a stack that reports itself up
and cannot log anyone in.

#### Cloudflare Origin Certificate (recommended)

Valid 15 years, no renewal cron, and no need to open port 80 to the world for
an ACME challenge. It is not publicly trusted, which is fine: Cloudflare is the
only thing that should ever connect to the origin.

1. Add your domain to Cloudflare (free plan) and point its nameservers there.
2. **SSL/TLS → Origin Server → Create Certificate.** Accept the defaults
   (RSA, 15 years). Cloudflare shows the certificate and the private key once.
3. On the box, save them as `origin.pem` and `origin.key`:

   ```bash
   mkdir -p ~/nexus/certs && chmod 700 ~/nexus/certs
   nano ~/nexus/certs/origin.pem   # paste the certificate
   nano ~/nexus/certs/origin.key   # paste the private key
   chmod 600 ~/nexus/certs/origin.key
   ```

4. **SSL/TLS → Overview → set the mode to "Full (strict)".** Anything less
   either refuses the origin cert or talks to your origin in plaintext.
5. In DNS, the `A` record for the apex (and `www`) must be **Proxied** (orange
   cloud). Grey-cloud it and traffic bypasses Cloudflare, which both exposes
   the origin IP and breaks the real-client-IP restoration below.

#### Why the real client IP matters here

Behind Cloudflare every request arrives from a Cloudflare edge address.
`nginx.conf` trusts `CF-Connecting-IP` **only from the published Cloudflare
ranges** (`set_real_ip_from`), then forwards exactly one address as
`X-Forwarded-For`, so `TRUST_PROXY=1` resolves `req.ip` to the real client.

Without that, every rate limiter in the API sees one client for the entire
internet and a single visitor can lock out everybody. Do **not** "fix" it by
raising `TRUST_PROXY` or using `$proxy_add_x_forwarded_for`: both let a caller
who reaches the origin directly prepend a forged address and choose its own
rate-limit identity.

As hardening, restrict inbound 443 to the Cloudflare ranges in the Oracle
security list, and enable **Authenticated Origin Pulls** so the origin accepts
only Cloudflare's client certificate.

### 3. Point the webhooks at the API

In each gateway's dashboard, set the webhook URL and copy the signing secret
into `.env`:

| Gateway | Webhook URL | Secret |
|---|---|---|
| Paystack | `https://yourdomain.com/api/webhooks/paystack` | signs with the secret key; `PAYSTACK_WEBHOOK_SECRET` optional |
| Paystack (plans) | `https://yourdomain.com/api/saas-webhooks/paystack` | as above |

Paystack signs with the secret key it already has, so `PAYSTACK_WEBHOOK_SECRET`
may be left blank (`paystack.provider.ts` falls back to `PAYSTACK_SECRET_KEY`).

Flutterwave is **off the merchant-facing surface** — the provider class and its
webhook route survive and fail closed on an unusable key, so there is nothing
to configure and no route money can take through an account that does not
exist. Do not re-add it to the gateway list without wiring
`FLUTTERWAVE_WEBHOOK_SECRET`, which has no fallback.

**Webhooks are what confirms an order.** The return leg verifies too, but a
shopper who closes the tab after paying leaves the webhook as the only path to
`CONFIRMED`. Send a test event from the Paystack dashboard and confirm a 200
before taking a real order.

---

## Host: Oracle Cloud Always Free (ARM)

The stack is designed for one box that stays running: the job scheduler is an
in-process `setInterval`, uploads live on a disk, and the voice workers hold
their models in memory. A serverless or sleep-on-idle host breaks all three —
most visibly, abandoned-checkout stock release stops and reserved inventory is
never returned.

Oracle's Always Free ARM tier fits because it is a real VM, so
`docker-compose.yml` runs unmodified, Postgres included.

### 1. Create the instance

| Setting | Value |
|---|---|
| Shape | `VM.Standard.A1.Flex` (Ampere ARM) |
| OCPU / memory | 2 OCPU / 12 GB — the whole Always Free allowance |
| Image | Ubuntu 24.04 (**aarch64** build) |
| Boot volume | 50 GB default is ample; the models are ~143 MB |

**The allowance was halved on 15 June 2026**, from 4 OCPU/24 GB to 2 OCPU/12 GB,
with no announcement. Guides still quoting the old figures are stale. 12 GB is
roughly ten times what this stack needs, so the cut does not affect it.

Expect **"Out of Capacity"** on your first attempts — ARM capacity in popular
regions is routinely exhausted. Try the other availability domains in your home
region, and retry; it is a queue, not a refusal. Note also that Oracle reclaims
instances it considers idle, which this one will not be.

### 2. Open the firewall — in *both* places

This is the single most common way an Oracle deploy appears broken. Adding an
ingress rule to the VCN security list is **not enough**: the instance image
also ships its own `iptables` rules with a `REJECT` at the end of the `INPUT`
chain, so the port stays shut and every request simply times out with no error
anywhere.

1. **VCN → Security Lists → Default → Add Ingress Rules:** source `0.0.0.0/0`,
   TCP, destination ports 80 and 443. (For hardening, use the Cloudflare ranges
   as the source instead of `0.0.0.0/0`.)
2. **On the instance**, insert the rules ahead of that `REJECT` and persist
   them:

   ```bash
   sudo iptables -I INPUT -p tcp --dport 80  -j ACCEPT
   sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```

   `-I` inserts at the top of the chain, which is what puts them before the
   `REJECT`. Appending with `-A` puts them after it and changes nothing.

Leave 5432 and 6379 closed. Compose binds Postgres and Redis to `127.0.0.1`
only, so they are already unreachable from outside the host.

### 3. Install Docker

```bash
curl -fsSL https://get.docker.com | sh      # arm64 is supported
sudo usermod -aG docker "$USER" && newgrp docker
```

### 4. Build on the box, not on your laptop

```bash
git clone <your repo> ~/nexus && cd ~/nexus
cp .env.example .env && nano .env           # fill in every required value
docker compose up -d --build
docker compose exec api npx prisma migrate deploy

# Provision the first platform owner and the subscription tiers. Without this
# the install is unusable - see "First-run provisioning" below.
docker compose exec   -e BOOTSTRAP_OWNER_EMAIL=you@yourdomain.com   -e BOOTSTRAP_OWNER_PASSWORD='<a real password>'   api npm run bootstrap
```

**Build on the ARM host.** `server/prisma/schema.prisma` declares no
`binaryTargets`, so Prisma generates engines for the platform it is generated
on — a native build gets `linux-arm64` automatically, while an image
cross-built on an x86 machine ships the wrong engine and the API fails at its
first query.

The images are already ARM-ready: `node:20-bookworm-slim`, `postgres:16-alpine`
and `redis:7-alpine` are all multi-arch, and `onnxruntime-node` publishes
CPU builds for `linux-arm64`. The API image is Debian slim rather than Alpine
because that runtime needs glibc — do not "optimise" it to Alpine.

### 5. Confirm

```bash
curl -fsS http://localhost/health                      # nginx, port 80
curl -fsSk https://localhost/health                     # nginx, TLS
docker compose exec api node -e "fetch('http://127.0.0.1:5000/ready').then(r=>r.json()).then(console.log)"
docker compose logs api | grep -i "scheduler\|email"   # jobs started, SMTP chosen
```

Then, from outside, confirm through Cloudflare that a deep link works
(`https://yourdomain.com/seller/orders` on a hard refresh, not just `/`) — that
is the `try_files` fallback, and it is the thing that silently breaks.

### What you own on this host

There is no managed layer here, so: OS patching (`unattended-upgrades` is on by
default on Ubuntu), `docker compose pull && up -d` for image updates, and
**backups are yours**. Nothing else in this guide will remind you:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > db-$(date +%F).sql.gz
docker run --rm -v nexus_uploads_data:/u -v "$PWD":/out alpine tar czf /out/uploads-$(date +%F).tar.gz -C /u .
```

A database dump without the uploads archive restores to a site full of dead
image URLs. Take both, and keep them off the box.

---

## Deployment Modes

### 1. Docker Compose (single host)

```bash
# 1. Secrets, as above.

# 2. Optionally pre-fetch the speech models so the first voice request does not
#    pull ~143 MB from HuggingFace. They are baked into the image if present.
npm --prefix server run voice:fetch-model

# 3. Build and launch
docker compose up -d --build

# 4. Apply migrations (see the warning below — never `db push` here)
docker compose exec api npx prisma migrate deploy

# 5. Provision the first owner and the plans (once per install)
docker compose exec   -e BOOTSTRAP_OWNER_EMAIL=you@yourdomain.com   -e BOOTSTRAP_OWNER_PASSWORD='<a real password>'   api npm run bootstrap

# 6. Confirm
curl -fsS http://localhost/health          # nginx
docker compose exec api node -e "fetch('http://127.0.0.1:5000/ready').then(r=>r.json()).then(console.log)"
```

### 2. Standalone Node.js & managed database

```bash
cd server
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm start

cd ..
npm ci
npm run build          # serve dist/ behind a web server with an SPA fallback
```

A non-container frontend needs the same two rules `nginx.conf` encodes: an
SPA fallback to `index.html`, and `/api` + `/uploads` proxied to the API.
Without the fallback, every deep link 404s on refresh.

---

## Migrations

**Use `prisma migrate deploy`. Never `prisma db push` against production.**

This guide previously said to run `npx prisma db push --accept-data-loss`.
That command ignores the migration history entirely and reshapes the live
schema to match `schema.prisma` — and `--accept-data-loss` is the flag that
authorises it to **drop columns and tables** to get there. The repository has a
proper migration history (`server/prisma/migrations/`, baseline + 7), so:

| Situation | Command |
|---|---|
| Deploying to production | `npx prisma migrate deploy` |
| Creating a migration while developing | `npx prisma migrate dev --name <what_changed>` |
| Checking for drift before a release | `npx prisma migrate status` |

`migrate deploy` applies only pending migrations, in order, and never
reshapes anything that is not in one. It is safe to run on every deploy and is
a no-op when there is nothing pending.

Do not run `prisma:seed` against production — it is written for a test
database and deletes rows.

---

## First-run provisioning

**A migrated database is not yet a working install.** Run this once, after
`prisma migrate deploy`:

```bash
docker compose exec   -e BOOTSTRAP_OWNER_EMAIL=you@yourdomain.com   -e BOOTSTRAP_OWNER_PASSWORD='<a real password>'   api npm run bootstrap
```

Add `-e BOOTSTRAP_DRY_RUN=true` first to see exactly what it would do without
writing anything.

### What it fixes

An empty database is deadlocked, and every symptom looks like a different bug:

| Symptom | Cause |
|---|---|
| Nobody can reach `/admin` | `platformRole` is set in **one place in the codebase** — `prisma/seed.ts`, which is forbidden here because it `deleteMany`s every table. No signup path reaches the role. |
| Every gated merchant action answers **503** | `entitlement.service.ts` refuses on an empty plans table rather than granting a generous default — correct, but fatal when the table is empty. |
| New merchants have no subscription | `saasBilling.service.ts` returns `null` when no plan resolves, silently. |
| The pricing page is blank | `GET /api/plans` has nothing to return. |
| Plans can't be created to fix it | `POST /api/admin/plans` is behind `requirePlatformAdmin`. No admin, no plans. |

Before this command the only way out was hand-written SQL against production.

### What it does, and what it refuses to do

It is **not a seed**: no deletes, no truncation, no downgrades. Every step is
create-if-missing, so it is safe to re-run on a live install.

- Creates the four tiers — `starter` ₦50,000, `growth` ₦80,000, `pro`
  ₦150,000, `enterprise` ₦450,000 per month, annual at ten months for twelve.
- **Leaves an existing tier alone.** Prices are editable at
  `PATCH /api/admin/plans/:id`, and restoring these figures on every run would
  make this script a second pricing authority that overrules the console. Pass
  `BOOTSTRAP_UPDATE_PLANS=true` to overwrite deliberately.
- Promotes the named account to `PLATFORM_OWNER`, or creates it when the
  database has nobody to promote. The created account is `isVerified` on
  purpose: it is the account you use to prove SMTP works, so it cannot depend
  on a verification email arriving first.
- **Never overwrites an existing `platformRole`.** Re-promoting an account
  somebody deliberately reduced is not a provisioning decision.
- **Never prints the password.** The pre-deploy audit found reset tokens
  written to stdout in full, which turns a log aggregator into a credential
  store.
- Fails loudly if no active `starter` tier exists afterwards, because
  `DEFAULT_PLAN_CODE` resolves against it and entitlements would keep
  answering 503.

### After it runs

Sign in with that address, open `/admin`, and check the plan prices read in
naira. If `DEFAULT_CURRENCY` and the plan rows disagree on currency, the dry
run says so — Paystack rejects a currency the account has not enabled, so that
mismatch fails at initialize rather than merely displaying oddly.

---

## Persistence

Three volumes hold state that must survive a redeploy:

| Volume | Holds | Lost without it |
|---|---|---|
| `postgres_data` | the database | everything |
| `uploads_data` | product images (`/app/uploads`) | every image a merchant uploaded |
| `voice_models` | Whisper/speaker ONNX models | re-downloaded on each cold start |

### Sizing for voice

Transcription runs in worker threads so it cannot block the API. **Each worker
holds its own copy of the model (~76 MB for base.en)**, so `VOICE_WORKERS=2`
costs roughly 150 MB on top of the Node runtime. Raise it only alongside the
container's memory limit; `VOICE_MAX_QUEUE` refuses excess work with a 503
rather than letting a backlog grow unbounded.

`uploads_data` is the one worth checking after any compose edit. Images are
written to the API container's local disk, so without the mount they are
deleted with the container on the next `up --build`. Back it up alongside the
database — a restored database full of dead image URLs is not a restored site.

---

## Disaster Recovery & Backup

### Objectives
- **RPO**: < 1 hour
- **RTO**: < 15 minutes

### Backup

```bash
# Database
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --format=custom > "nexus_prod_$(date +%Y%m%d_%H%M%S).dump"

# Uploaded images — the database alone is not a complete backup
docker run --rm -v nexus_uploads_data:/data -v "$PWD:/backup" alpine \
  tar czf "/backup/nexus_uploads_$(date +%Y%m%d_%H%M%S).tar.gz" -C /data .
```

### Restore

```bash
docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists < nexus_prod_YYYYMMDD_HHMMSS.dump

docker run --rm -v nexus_uploads_data:/data -v "$PWD:/backup" alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/nexus_uploads_YYYYMMDD_HHMMSS.tar.gz -C /data"

# Confirm the schema matches the code, then apply anything pending
docker compose exec api npx prisma migrate status
docker compose exec api npx prisma migrate deploy
```

---

## Rollback

If a release fails its health checks (`GET /ready` returns 503):

1. **Roll the image back** to the previous tag and `docker compose up -d`.
2. **Leave the database alone.** Migrations are additive; rolling the schema
   back is a restore from snapshot, not a `migrate` command. Never run a
   destructive schema change in production without a verified dump taken
   first.

---

## Monitoring & Health Checks

- **Frontend**: `GET /health` → `ok` (served by nginx)
- **API liveness**: `GET /health` → `{"status":"ok"}`
- **API readiness**: `GET /ready` → `{"status":"ready","database":"connected"}`,
  503 when the database is unreachable. This is the one to wire to the load
  balancer.

Both containers declare a `HEALTHCHECK`, so `docker compose ps` reports
health directly.

### What to watch in the logs

The API logs structured JSON via pino. These are the lines that mean something
is wrong in a way no health check will catch:

| Message | Meaning |
|---|---|
| `Transactional email FAILED to send` | SMTP rejected a message; that user got nothing |
| `Password reset email was NOT delivered` | an account is unrecoverable |
| `SaaS subscription underpaid; plan not granted` | gateway took less than the invoice; needs a human |
| `Blocked a cross-origin state change` | CSRF guard fired, or `FRONTEND_URL` is wrong |
| `Transcriber worker errored` / `exited` | a voice worker died; the pool respawns it, but repeated entries mean the model or the host is unhealthy |
| `Payout transfer could not be started` | a merchant payout did not reach Paystack; the obligation is back at PENDING and still owed |
| `CORS rejected origin` | `FRONTEND_URL` does not match the origin actually serving the app |
