import { defineConfig } from 'vitest/config';
import { TEST_ENV } from './tests/testDatabaseUrl';

/**
 * The suite runs against its own database.
 *
 * It used to run against the development one. Two things went wrong with that:
 * test rows accumulated in the data David was browsing — the dev database had
 * reached 558 users, all but five of them left by test runs — and a run started
 * while the dev server was up intermittently reported tests skipped, because
 * both processes contended for the same connections. A run must not depend on
 * whether anything else is running.
 *
 * `tests/testDatabaseUrl.ts` holds the connection string, because globalSetup
 * needs the same value and must not resolve it independently.
 */
export default defineConfig({
  test: {
    // Every suite shares one database. Running files in parallel — the default —
    // means two of them create, mutate and count the same tables at the same
    // time, which is what produced the intermittent skipped runs. Sequential
    // files cost a little wall time and buy a deterministic result.
    fileParallelism: false,
    env: TEST_ENV,
    globalSetup: ['./tests/globalSetup.ts'],
    hookTimeout: 60_000,
    testTimeout: 30_000,
    include: ['tests/**/*.test.ts'],
  },
});
