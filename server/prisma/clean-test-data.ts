import { PrismaClient } from '@prisma/client';
import { applyCatalogue } from './catalogue.js';

/**
 * Remove accumulated test-run data from a database, then apply the marketplace
 * catalogue.
 *
 * Nine phases of integration tests ran against the development database before
 * `nexus_test_db` existed, leaving 495 stores and 250 products named after the
 * epoch millisecond they were created in. They are what the public storefront
 * was listing.
 *
 *   npx tsx prisma/clean-test-data.ts            # dry run, prints the plan
 *   npx tsx prisma/clean-test-data.ts --apply    # performs the deletion
 *
 * THIS DELETES ROWS AND CANNOT BE UNDONE. Take a dump first.
 *
 * It never runs against a database whose name ends in `_test`/`_test_db`: the
 * suite owns those and recreates them per run, so pointing this at one would
 * only ever be a mistake.
 */

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

/**
 * A test fixture names itself with `Date.now()`. That 13-digit stamp is the
 * signature, and it is the only thing used to classify a row — not a guess
 * from the shape of a name, which would risk a real store called
 * "Phase 9 Store".
 */
const STAMP = /\d{13}/;

/**
 * The same signature in an email address, where the stamp sits immediately
 * before the `@`: `admin_p8_1790634535858@nexus.io`, `shopper_1791554365@…`.
 *
 * The range is 10–13 digits because fixtures were stamped with both
 * `Date.now()` (milliseconds) and `date +%s` (seconds), and anchoring on `@`
 * keeps it from matching a number that happens to appear in a real local part.
 */
const EMAIL_STAMP = /\d{10,13}@/;

/** Rows that must survive regardless of what any pattern says. */
const PROTECTED_STORE_IDS = new Set(['str_aura_apparel']);
const PROTECTED_USER_EMAILS = new Set(['alex@nexuscommerce.io', 'admin@nexuscommerce.io']);

function assertNotTestDatabase() {
  const url = process.env.DATABASE_URL || '';
  const name = url.split('/').pop()?.split('?')[0] || '';
  if (/_test(_db)?$/.test(name)) {
    throw new Error(
      `Refusing to run against "${name}": the Vitest suite owns that database and rebuilds it per run.`
    );
  }
  return name;
}

async function main() {
  const dbName = assertNotTestDatabase();
  console.log(`Database: ${dbName}`);
  console.log(APPLY ? 'Mode: APPLY (rows will be deleted)\n' : 'Mode: DRY RUN (nothing will change)\n');

  const stores = await prisma.store.findMany({
    select: {
      id: true,
      name: true,
      owner: { select: { id: true, email: true, platformRole: true } },
      _count: { select: { products: true, orders: true } },
    },
  });

  const doomed = stores.filter(
    s =>
      !PROTECTED_STORE_IDS.has(s.id) &&
      !PROTECTED_USER_EMAILS.has(s.owner.email) &&
      (STAMP.test(s.name) || STAMP.test(s.owner.email))
  );
  const kept = stores.filter(s => !doomed.includes(s));

  console.log(`Stores: ${stores.length} total, ${doomed.length} to delete, ${kept.length} to keep`);
  console.log('\nKEEPING these stores:');
  for (const s of kept) {
    console.log(`  ${s.name}  (${s.owner.email})  products=${s._count.products} orders=${s._count.orders}`);
  }

  const doomedStoreIds = doomed.map(s => s.id);
  const productCount = await prisma.product.count({ where: { storeId: { in: doomedStoreIds } } });
  const orderCount = await prisma.order.count({ where: { storeId: { in: doomedStoreIds } } });

  /**
   * Test users to remove as well. A User is the parent of a Store, so deleting
   * the store leaves the owner behind; left alone they would fill the platform
   * console's merchant list with epoch-stamped names.
   *
   * Guards: never a platform administrator, never a protected address, and
   * never a user still referenced by a Customer row in a surviving store.
   * `Customer.userId` is SetNull so it would not cascade, but silently
   * unlinking a real buyer from their order history is not worth the tidiness.
   */
  const survivingCustomerUserIds = new Set(
    (
      await prisma.customer.findMany({
        where: { storeId: { notIn: doomedStoreIds }, userId: { not: null } },
        select: { userId: true },
      })
    ).map(c => c.userId as string)
  );

  const candidateUsers = await prisma.user.findMany({
    select: { id: true, email: true, platformRole: true, ownedStores: { select: { id: true } } },
  });

  /**
   * Platform administrators are included rather than skipped.
   *
   * An earlier version of this filtered on `platformRole: null`, reasoning that
   * an admin account is too important to delete automatically. That left 34
   * epoch-stamped PLATFORM_OWNER accounts created by the Phase 8 billing tests
   * — full-privilege accounts, all sharing the seed password. A stamped address
   * is a test fixture whatever role it holds, and the real administrator is
   * unstamped and on the protected list, so the protection belongs there and
   * not in a blanket role exemption.
   */
  const doomedUsers = candidateUsers.filter(
    u =>
      (STAMP.test(u.email) || EMAIL_STAMP.test(u.email)) &&
      !PROTECTED_USER_EMAILS.has(u.email) &&
      !survivingCustomerUserIds.has(u.id) &&
      // Every store they own must itself be going.
      u.ownedStores.every(s => doomedStoreIds.includes(s.id))
  );

  const doomedAdmins = doomedUsers.filter(u => u.platformRole);
  if (doomedAdmins.length) {
    console.log(`\nIncludes ${doomedAdmins.length} stamped accounts holding a platform role:`);
    for (const a of doomedAdmins) console.log(`  ${a.email} [${a.platformRole}]`);
  }

  console.log(`\nWould delete:`);
  console.log(`  ${doomed.length} stores  ->  cascades to ${productCount} products and ${orderCount} orders`);
  console.log(`  ${doomedUsers.length} test users (of ${candidateUsers.length} non-admin users)`);

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to perform it.');
    await prisma.$disconnect();
    return;
  }

  /**
   * Orders before stores, because `OrderItem.productId` is `onDelete: Restrict`
   * — deliberately, so a deleted product cannot orphan a line on someone's
   * order. That means deleting a store cannot cascade all the way through in a
   * single statement: the Product delete is blocked by the order lines still
   * referencing it. Removing the orders first takes their items with them
   * (every Order relation does cascade), which clears the way.
   */
  const crossStore = await prisma.orderItem.count({
    where: {
      order: { storeId: { notIn: doomedStoreIds } },
      product: { storeId: { in: doomedStoreIds } },
    },
  });
  if (crossStore > 0) {
    throw new Error(
      `Aborting: ${crossStore} order lines in a store being KEPT reference a product in a ` +
        'store being deleted. Deleting would damage surviving order history.'
    );
  }

  const deletedOrders = await prisma.order.deleteMany({ where: { storeId: { in: doomedStoreIds } } });
  console.log(`Deleted ${deletedOrders.count} orders (with their items, addresses, payments and shipments)`);

  const deletedStores = await prisma.store.deleteMany({ where: { id: { in: doomedStoreIds } } });
  console.log(`\nDeleted ${deletedStores.count} stores (and everything scoped to them)`);

  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: doomedUsers.map(u => u.id) } },
  });
  console.log(`Deleted ${deletedUsers.count} test users`);

  // No stray-product sweep here on purpose. Every product in a surviving store
  // was enumerated before this ran and all of them are real, so a pattern
  // match over titles would be a risk taken for no benefit.

  console.log('\nApplying the marketplace catalogue...');
  await applyCatalogue(prisma, { demoStoreId: 'str_aura_apparel', log: msg => console.log(msg) });

  const live = await prisma.product.count({
    where: { status: 'ACTIVE', store: { status: 'ACTIVE' } },
  });
  const liveStores = await prisma.store.count({ where: { status: 'ACTIVE' } });
  const withImage = await prisma.product.count({
    where: { status: 'ACTIVE', store: { status: 'ACTIVE' }, images: { some: {} } },
  });
  console.log(`\nResult: ${live} live products across ${liveStores} live stores, ${withImage} with at least one image`);

  await prisma.$disconnect();
}

main().catch(async err => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
