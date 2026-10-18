/**
 * Remove test fixtures that a mis-targeted test run wrote into a real database.
 *
 * On 2026-10-17T03:27Z a suite run resolved `nexus_db` instead of
 * `nexus_test_db` and left 8 stores, 18 products, 9 orders and a fixture
 * PLATFORM_OWNER behind. They surfaced as cards in the public catalogue showing
 * the product's initial instead of a photo, because a fixture never has an
 * image — `tests/testDatabaseUrl.ts` documents the hazard that caused it.
 *
 * Explicit and opt-in, like `fetch-voice-model.mjs`: a dry run by default, and
 * it names everything it would touch before it touches it.
 *
 *   node scripts/remove-test-fixtures.mjs              # dry run
 *   APPLY=true node scripts/remove-test-fixtures.mjs   # execute
 *
 * The window is configurable because the fixture burst is identified by *when*
 * it happened — fixture stores carry a generated millisecond suffix in their
 * name, not a flag, so there is nothing else to match on reliably.
 *
 *   FIXTURE_FROM=2026-10-17T03:27:00Z FIXTURE_TO=2026-10-17T03:28:00Z
 *
 * It also removes **orphaned fixture subscription plans**. Test runs left 31
 * behind (`iq-test-<ms>` priced 0/0 and `custom-<ms>` at 299), and
 * `GET /api/plans` returns every active plan — so the public pricing page
 * listed 35 tiers, 31 of them junk. They are matched on a strict pattern
 * (prefix plus a 13-digit millisecond stamp) and only deleted when nothing
 * references them, so a legitimately-named plan cannot be caught.
 *
 * Deletion order is deliberate and must not be left to cascade resolution:
 *
 *   1. ProductReview — its `order` and `orderItem` relations are
 *      `onDelete: Restrict` ("deleting the evidence would silently turn a
 *      verified review into an unverified one"), so the review goes first.
 *   2. Order — cascades OrderItem, Payment, Transaction and Shipment. Done
 *      before products, because `OrderItem.product` is `Restrict` and would
 *      block a product delete that cascaded from the store.
 *   3. User (the store owner) — `Store.owner` is `onDelete: Cascade`, so this
 *      takes the store, and the store cascades its products and their images.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FROM = new Date(process.env.FIXTURE_FROM ?? '2026-10-17T03:27:00.000Z');
const TO = new Date(process.env.FIXTURE_TO ?? '2026-10-17T03:28:00.000Z');
const APPLY = process.env.APPLY === 'true';

/**
 * Remove subscription plans that test runs left behind.
 *
 * Matched on `<prefix>-<13 digit ms>` rather than the prefix alone, so an
 * admin-created plan that happens to be called "custom-pricing" is not caught.
 * Never touches the four real tiers, never touches a plan any subscription or
 * invoice points at, and refuses to leave the install with no active plan —
 * `entitlement.service.ts` answers 503 when the table has none.
 */
const FIXTURE_PLAN_CODE = /^(iq-test|custom)-\d{13}$/;
const REAL_PLAN_CODES = ['starter', 'growth', 'pro', 'enterprise'];

async function removeFixturePlans() {
  const all = await prisma.subscriptionPlan.findMany({
    select: {
      id: true,
      code: true,
      monthlyPrice: true,
      _count: { select: { subscriptions: true, invoices: true } },
    },
  });

  const candidates = all.filter(
    p =>
      FIXTURE_PLAN_CODE.test(p.code) &&
      !REAL_PLAN_CODES.includes(p.code) &&
      p._count.subscriptions === 0 &&
      p._count.invoices === 0
  );

  const referenced = all.filter(
    p => FIXTURE_PLAN_CODE.test(p.code) && (p._count.subscriptions > 0 || p._count.invoices > 0)
  );

  console.log(`
  fixture plans: ${candidates.length} removable, ${referenced.length} left in place (referenced)`);
  for (const p of referenced) {
    console.log(`    keeping ${p.code} (subscriptions=${p._count.subscriptions} invoices=${p._count.invoices})`);
  }

  if (candidates.length === 0) return;

  const remaining = all.length - candidates.length;
  if (remaining < 1) {
    throw new Error('Refusing to remove every subscription plan; entitlements would answer 503.');
  }

  if (!APPLY) {
    console.log(`    would delete ${candidates.length} plan(s); ${remaining} would remain`);
    return;
  }

  const res = await prisma.subscriptionPlan.deleteMany({
    where: { id: { in: candidates.map(p => p.id) } },
  });
  console.log(`    deleted ${res.count} plan(s); ${await prisma.subscriptionPlan.count()} remain`);
}

async function main() {
  if (Number.isNaN(FROM.valueOf()) || Number.isNaN(TO.valueOf()) || FROM >= TO) {
    throw new Error('FIXTURE_FROM / FIXTURE_TO must be valid ISO dates with FROM before TO.');
  }

  const stores = await prisma.store.findMany({
    where: { createdAt: { gte: FROM, lt: TO } },
    select: { id: true, name: true, ownerId: true },
    orderBy: { createdAt: 'asc' },
  });

  if (stores.length === 0) {
    console.log(`No stores created between ${FROM.toISOString()} and ${TO.toISOString()}.`);
    await removeFixturePlans();
    return;
  }

  const storeIds = stores.map(s => s.id);
  const ownerIds = [...new Set(stores.map(s => s.ownerId))];

  /*
   * Guard 1: every genuine catalogue product has a photo and no fixture does,
   * so an image inside the window means the window is catching real data.
   */
  const withImages = await prisma.product.count({
    where: { storeId: { in: storeIds }, images: { some: {} } },
  });
  if (withImages > 0) {
    throw new Error(
      `Refusing to run: ${withImages} product(s) in the matched stores have images, ` +
        'so this window is not purely fixtures. Narrow FIXTURE_FROM/FIXTURE_TO.'
    );
  }

  const owners = await prisma.user.findMany({
    where: { id: { in: ownerIds } },
    select: {
      id: true,
      email: true,
      platformRole: true,
      ownedStores: { select: { id: true, name: true } },
    },
  });

  /*
   * Guard 2: deleting a user cascades EVERY store they own. If one of these
   * owners also holds a store outside the window, that is real data and this
   * script would take it silently.
   */
  for (const owner of owners) {
    const outside = owner.ownedStores.filter(s => !storeIds.includes(s.id));
    if (outside.length > 0) {
      throw new Error(
        `Refusing to run: ${owner.email} also owns ${outside.length} store(s) outside ` +
          `the window (${outside.map(s => s.name).join(', ')}). Deleting the user would cascade them.`
      );
    }
  }

  /*
   * Guard 3: never remove the last platform administrator. One of these
   * fixtures is a PLATFORM_OWNER, and leaving the install with none would lock
   * the admin console for everyone.
   */
  const totalAdmins = await prisma.user.count({ where: { platformRole: { not: null } } });
  const fixtureAdmins = owners.filter(o => o.platformRole);
  if (fixtureAdmins.length > 0 && totalAdmins - fixtureAdmins.length < 1) {
    throw new Error(
      'Refusing to run: this would delete every platform administrator. ' +
        'Promote a real account first (see scripts via npm run bootstrap).'
    );
  }

  const products = await prisma.product.count({ where: { storeId: { in: storeIds } } });
  const orders = await prisma.order.count({ where: { storeId: { in: storeIds } } });
  const reviews = await prisma.productReview.count({ where: { storeId: { in: storeIds } } });

  console.log(APPLY ? 'APPLYING' : 'DRY RUN — set APPLY=true to execute');
  console.log(`  window: ${FROM.toISOString()} .. ${TO.toISOString()}`);
  for (const store of stores) console.log(`    store   ${store.name}`);
  console.log(`  stores=${stores.length} products=${products} orders=${orders} reviews=${reviews} owners=${owners.length}`);
  for (const admin of fixtureAdmins) {
    console.log(`  note: ${admin.email} is ${admin.platformRole}; ${totalAdmins - fixtureAdmins.length} administrator(s) remain after this`);
  }

  if (!APPLY) return;

  await prisma.$transaction(async tx => {
    const r = await tx.productReview.deleteMany({ where: { storeId: { in: storeIds } } });
    const o = await tx.order.deleteMany({ where: { storeId: { in: storeIds } } });
    const u = await tx.user.deleteMany({ where: { id: { in: ownerIds } } });
    console.log(`  deleted reviews=${r.count} orders=${o.count} owners=${u.count}; stores and products cascaded`);
  });

  const remaining = await prisma.store.count({ where: { createdAt: { gte: FROM, lt: TO } } });
  const totalProducts = await prisma.product.count();
  const withPhotos = await prisma.product.count({ where: { images: { some: {} } } });

  console.log('\nAfter:');
  console.log(`  fixture stores remaining: ${remaining}`);
  console.log(`  stores: ${await prisma.store.count()}`);
  console.log(`  products: ${totalProducts} (with photos: ${withPhotos})`);

  await removeFixturePlans();

  if (remaining !== 0) throw new Error('Fixture stores still present after the delete.');
  if (totalProducts !== withPhotos) {
    console.log('  note: some remaining products still have no photo.');
  }
}

main()
  .catch(err => {
    console.error(`\nFailed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
