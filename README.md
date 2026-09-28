# Nexus Commerce — Production-Ready SaaS Commerce Platform

Nexus Commerce is a Shopify-like, multi-tenant SaaS commerce platform built with React, Vite, TypeScript, Express, PostgreSQL, Prisma, Redis, and Tailwind CSS.

---

## Key Features

- **Multi-Tenant Architecture**: Complete tenant isolation across products, inventory, customers, orders, discounts, analytics, team members, custom domains, and SaaS subscriptions.
- **Authentication & RBAC**: Argon2id/bcrypt password hashing, HttpOnly session cookies, OAuth 2.0 architecture, and fine-grained store roles (`OWNER`, `ADMIN`, `STAFF`, `VIEWER`) + platform roles (`PLATFORM_OWNER`, `PLATFORM_ADMIN`).
- **Storefront Builder & Custom Domains**: Merchant-configurable themes, custom pages, navigation builder, and domain verification.
- **Payments & Billing**: Real payment verification (Paystack/Flutterwave), server-calculated order totals, refund handling, and multi-tier SaaS subscription billing (`Starter`, `Growth`, `Pro`, `Enterprise`) with sequential `NX-INV-1000` invoices.
- **Security & Observability**: Helmet headers, rate limiting on sensitive endpoints, structured Pino logging, zero-downtime health probes (`/health`, `/ready`), and security audit compliance.

---

## Quick Start (Development)

### Backend
```bash
cd server
npm install
npx prisma db push
npm run prisma:seed
npm run dev
```

### Frontend
```bash
npm install
npm run dev
```

---

## Running Tests

```bash
cd server
npm run test
```

## Production Build & Deployment

See [DEPLOYMENT.md](file:///c:/xampp/htdocs/nexus/DEPLOYMENT.md) for full Docker Compose and production deployment instructions.
