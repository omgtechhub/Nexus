import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { TEST_DATABASE_URL } from './testDatabaseUrl';

/**
 * Prepares the test database once per run.
 *
 * Migrates the schema, then empties every table so a run starts from a known
 * state regardless of what the previous one left behind.
 */
export default async function setup() {
  // Deliberately not process.env.DATABASE_URL: Vitest loads the development
  // .env into this process, so that would be the development database.
  const url = TEST_DATABASE_URL;

  assertIsATestDatabase(url);

  // `migrate deploy` applies committed migrations without prompting and without
  // ever offering to reset, which `migrate dev` can do.
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await truncateEverything(prisma);
  } finally {
    await prisma.$disconnect();
  }

  // Several suites assert against seeded rows — the `starter` plan's price, for
  // one — so the baseline has to be the seed, not an empty schema. The seed
  // clears data first via its own hand-written deleteMany list; the truncate
  // above still runs because that list has to be updated by hand whenever a
  // model is added, and a forgotten one would leave rows behind.
  execSync('npx tsx prisma/seed.ts', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });
}

/**
 * Refuses to touch anything but a database named for testing.
 *
 * This function is the only thing standing between a mistyped environment
 * variable and the development data. It fails closed.
 */
function assertIsATestDatabase(url: string) {
  let name: string;
  try {
    name = new URL(url).pathname.replace(/^\//, '');
  } catch {
    throw new Error('DATABASE_URL is not a valid URL.');
  }

  if (!/_test(_db)?$/.test(name)) {
    throw new Error(
      `Refusing to run the suite against "${name}". The test database name must ` +
        `end in _test or _test_db, so a misconfigured DATABASE_URL can never ` +
        `truncate development or production data.`
    );
  }
}

/**
 * Empties the schema in one statement.
 *
 * Discovered from the catalogue rather than listed by hand: a model added later
 * would otherwise silently keep its rows between runs. CASCADE handles the
 * foreign keys, so no ordering is needed.
 */
async function truncateEverything(prisma: PrismaClient) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `;
  if (tables.length === 0) return;

  const list = tables.map(t => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
