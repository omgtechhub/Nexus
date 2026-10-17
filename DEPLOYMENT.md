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
the next request is unauthenticated. Terminate TLS in front of the frontend
container and set `FRONTEND_URL=https://...`.

### 3. Point the webhooks at the API

In each gateway's dashboard, set the webhook URL and copy the signing secret
into `.env`:

| Gateway | Webhook URL | Secret |
|---|---|---|
| Paystack | `https://yourdomain.com/api/webhooks/paystack` | signs with the secret key; `PAYSTACK_WEBHOOK_SECRET` optional |
| Paystack (plans) | `https://yourdomain.com/api/saas-webhooks/paystack` | as above |
| Flutterwave | `https://yourdomain.com/api/webhooks/flutterwave` | `FLUTTERWAVE_WEBHOOK_SECRET` — **required** |
| Flutterwave (plans) | `https://yourdomain.com/api/saas-webhooks/flutterwave` | as above |

Flutterwave verification has no fallback: with the secret hash unset, every
Flutterwave webhook is rejected with a 401 and those orders never move to
CONFIRMED.

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

# 5. Confirm
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
proper migration history (`server/prisma/migrations/`, baseline + 4), so:

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
