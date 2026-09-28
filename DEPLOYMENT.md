# Nexus Commerce — Production Deployment & Disaster Recovery Guide

## System Architecture

Nexus Commerce is designed as a multi-tenant SaaS commerce platform composed of:

1. **Frontend**: Vite + React Single Page Application (rendered via NGINX container).
2. **API Gateway / Backend**: Node.js + Express + Prisma ORM (port 5000).
3. **Database**: PostgreSQL 16 relational database with multi-tenant row isolation.
4. **Queue & Caching**: Redis 7 + BullMQ worker queue for transactional email, stock monitoring, and background jobs.

---

## Deployment Modes

### 1. Docker Compose (Recommended for Staging / Single Host)

```bash
# 1. Clone repository & configure production secrets
cp .env.example .env
cp server/.env.example server/.env

# 2. Update .env with production credentials (DATABASE_URL, SESSION_SECRET, etc.)

# 3. Build and launch containers
docker-compose up -d --build

# 4. Run database migrations
docker exec -it nexus_api npx prisma db push --accept-data-loss
```

### 2. Standalone Node.js & Managed Database (AWS / GCP / DigitalOcean)

```bash
# Server Setup
cd server
npm ci
npx prisma generate
npx prisma db push
npm run build
npm start

# Frontend Setup
cd ..
npm ci
npm run build
```

---

## Disaster Recovery & Backup Strategy (RPO / RTO)

### Objectives
- **RPO (Recovery Point Objective)**: < 1 hour (Data loss window)
- **RTO (Recovery Time Objective)**: < 15 minutes (Downtime target)

### Automated PostgreSQL Backup Procedure
Automated S3 snapshot daily + continuous WAL archiving:
```bash
pg_dump -U nexus_user -h localhost -d nexus_db --format=custom --file=/backups/nexus_prod_$(date +%Y%m%d_%H%M%S).dump
```

### Restoration Procedure
```bash
# 1. Drop existing temporary connections
pg_restore -U nexus_user -h localhost -d nexus_db --clean /backups/nexus_prod_YYYYMMDD_HHMMSS.dump

# 2. Re-run Prisma validation
npx prisma db push
```

---

## Zero-Downtime Rollback Strategy

If a deployment fails health checks (`GET /ready` returns 503):

1. **Rollback Container Image**:
   ```bash
   docker-compose rollout undo deployment/nexus_api
   ```
2. **Database Migration Safety**: All Prisma migrations use additive columns. Never run destructive schema rollbacks in production without a verified snapshot.

---

## Monitoring & Health Checks

- **Application Liveness**: `GET /health` -> `{"status":"ok"}`
- **Cluster Readiness**: `GET /ready` -> `{"status":"ready","database":"connected"}`
