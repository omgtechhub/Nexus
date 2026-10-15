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

### First run

```bash
npm install
cd server && npm install && npx prisma db push && npm run prisma:seed && cd ..
```

### Every run

```bash
npm run dev
```

That starts **both** halves — the API on `http://localhost:5000` and the web app on
`http://localhost:5173` — with their output interleaved and prefixed `[api]` / `[web]`.
Stopping it with Ctrl-C stops both.

The app needs both. Every page past the marketing site calls the API, and with nothing
listening on port 5000 the browser reports a bare `Failed to fetch` with no status code
and no server log — which reads like a bug in the page rather than a missing process.
`npm run dev` checks both ports before it starts anything and tells you which one is
occupied, rather than coming half up.

To run one half on its own:

```bash
npm run dev:web    # Vite only
npm run dev:api    # API only
```

> The API's CORS allow-list is pinned to `FRONTEND_URL` in `server/.env`
> (`http://localhost:5173`). If the web app ends up on a different port, requests reach
> the server and are rejected there — so the preflight treats a busy 5173 as fatal too
> rather than letting Vite silently move to 5174.

---

## Running Tests

```bash
npm run test:api     # or: cd server && npm run test
```

## Production Build & Deployment

See [DEPLOYMENT.md](file:///c:/xampp/htdocs/nexus/DEPLOYMENT.md) for full Docker Compose and production deployment instructions.
