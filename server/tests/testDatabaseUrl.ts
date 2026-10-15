/**
 * The one place the test database is named.
 *
 * Both `vitest.config.ts` (which injects it into the worker processes) and
 * `globalSetup.ts` (which migrates and truncates, in the main process) import
 * this. They must not resolve it separately: Vitest loads the development
 * `.env` into its main process, so a globalSetup that read `process.env`
 * directly saw `nexus_db` and tried to truncate the development data. The guard
 * in globalSetup caught it, which is the only reason that was a failed run
 * rather than 558 lost rows.
 *
 * Built here rather than read from a committed `.env.test` so nothing
 * password-shaped is tracked in git, and a fresh clone runs the suite with no
 * setup beyond creating the database. Override where the local Postgres differs.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/nexus_test_db?schema=public&connection_limit=5';

/** Local-only values; `src/config` validates them at import time and exits without. */
export const TEST_ENV = {
  DATABASE_URL: TEST_DATABASE_URL,
  NODE_ENV: 'test',
  SESSION_SECRET: process.env.TEST_SESSION_SECRET ?? 'test-only-session-secret-value',
  FRONTEND_URL: 'http://localhost:5173',

  /**
   * Payments run against the sandbox provider.
   *
   * It has to be asked for. The real providers now throw when they have no
   * usable key instead of fabricating a success, which is what let an
   * unconfigured install report "payment confirmed" with no money taken. The
   * factory refuses this flag outright when NODE_ENV is production.
   */
  PAYMENTS_SANDBOX: 'true',
  SANDBOX_WEBHOOK_SECRET: 'test-only-sandbox-webhook-secret',
};

/** Sign a webhook body the way the sandbox provider expects. */
export const TEST_WEBHOOK_SECRET = TEST_ENV.SANDBOX_WEBHOOK_SECRET;
