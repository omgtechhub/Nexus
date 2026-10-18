/**
 * Reprice the catalogue in naira.
 *
 * The seeded catalogue was priced in US dollar amounts — a 34 candle, a 640
 * lounge chair — while `DEFAULT_CURRENCY` is NGN, so the storefront rendered
 * that candle as "₦34". Two separate problems came out of that, and this
 * script fixes both:
 *
 *  1. **The figures.** Converted at the official CBN rate and rounded to
 *     realistic retail points, so a shopper sees ₦45,000 for a candle rather
 *     than ₦34 or a raw ₦45,288.
 *
 *  2. **The currency the order is actually taken in.** Every store carried
 *     `StoreSettings.currency = 'USD — US Dollar'`, and
 *     `pricing/quote.service.ts` reads exactly that field through
 *     `currencyCodeOf` to set the order's currency. **Paystack rejects a
 *     currency the merchant account has not enabled**, so with a Nigerian
 *     account every checkout would have failed at `transaction/initialize`
 *     with "Currency not supported by merchant" — a repriced catalogue that
 *     still could not take a single payment.
 *
 *   node scripts/reprice-catalogue-ngn.mjs              # dry run, full table
 *   APPLY=true node scripts/reprice-catalogue-ngn.mjs   # execute
 *
 * ## The rate, and what it does not include
 *
 * ₦1,332 per USD: the CBN official rate on 2026-10-18 (the parallel market was
 * about ₦1,370 the same day). It is a single constant, so re-running against a
 * different rate is one edit.
 *
 * This is a **straight conversion**, not Nigerian landed retail. Imported
 * premium goods carry duty, shipping and local margin on top, so a Lagos shop
 * would ask more than these figures for the same headphones. Applying that
 * markup is a commercial decision rather than arithmetic — set `MARKUP` above
 * 1 if you want it.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.env.APPLY === 'true';

/** CBN official USD/NGN, 2026-10-18. */
const RATE = Number(process.env.NGN_RATE ?? 1332);

/** Multiplier for duty, shipping and local margin. 1 = straight conversion. */
const MARKUP = Number(process.env.NGN_MARKUP ?? 1);

const NGN_LABEL = 'NGN — Nigerian Naira';

/**
 * No price in this catalogue exceeds $640, so anything above this is already
 * naira and converting again would multiply it a second time.
 */
const ALREADY_NGN_ABOVE = 5000;

/**
 * Round to a price a shop would actually put on a label.
 *
 * Nearest ₦1,000 normally; nearest ₦5,000 once the figure is large enough that
 * ₦1,000 is noise. A raw conversion reads as machine output (₦45,288), which is
 * exactly what makes a demo catalogue look unfinished.
 */
function retailRound(amount) {
  const n = amount * RATE * MARKUP;
  if (n >= 200_000) return Math.round(n / 5_000) * 5_000;
  return Math.max(1_000, Math.round(n / 1_000) * 1_000);
}

const naira = n =>
  '₦' + Math.round(n).toLocaleString('en-NG');

async function main() {
  if (!Number.isFinite(RATE) || RATE <= 0) throw new Error(`NGN_RATE must be a positive number, got ${RATE}`);
  if (!Number.isFinite(MARKUP) || MARKUP <= 0) throw new Error(`NGN_MARKUP must be positive, got ${MARKUP}`);

  const products = await prisma.product.findMany({
    select: {
      id: true,
      title: true,
      price: true,
      costPrice: true,
      comparePrice: true,
      store: { select: { name: true } },
    },
    orderBy: [{ store: { name: 'asc' } }, { title: 'asc' }],
  });

  if (products.length === 0) {
    console.log('No products. Nothing to do.');
    return;
  }

  // Guard: refuse to convert a catalogue that has already been converted.
  const converted = products.filter(p => p.price > ALREADY_NGN_ABOVE);
  if (converted.length > 0) {
    throw new Error(
      `Refusing to run: ${converted.length} product(s) are already priced above ` +
        `${ALREADY_NGN_ABOVE} (e.g. "${converted[0].title}" at ${converted[0].price}), ` +
        'so this catalogue looks converted already. Converting twice would multiply it again.'
    );
  }

  console.log(APPLY ? 'APPLYING' : 'DRY RUN — set APPLY=true to execute');
  console.log(`  rate: ₦${RATE}/USD  markup: ${MARKUP}x\n`);

  let store = '';
  for (const p of products) {
    if (p.store.name !== store) {
      store = p.store.name;
      console.log(`  ${store}`);
    }
    console.log(
      `    ${String(p.price).padStart(7)} -> ${naira(retailRound(p.price)).padStart(12)}   ${p.title}`
    );
  }

  const stores = await prisma.store.findMany({
    select: { id: true, name: true, currency: true, settings: { select: { id: true, currency: true } } },
  });
  const needCurrency = stores.filter(
    s => s.currency !== NGN_LABEL || (s.settings && s.settings.currency !== NGN_LABEL)
  );

  console.log(`\n  stores to switch to "${NGN_LABEL}": ${needCurrency.length}`);
  for (const s of needCurrency) {
    console.log(`    ${s.name}: store=${JSON.stringify(s.currency)} settings=${JSON.stringify(s.settings?.currency ?? null)}`);
  }

  if (!APPLY) {
    console.log(`\nWould reprice ${products.length} product(s).`);
    return;
  }

  await prisma.$transaction(async tx => {
    for (const p of products) {
      await tx.product.update({
        where: { id: p.id },
        data: {
          price: retailRound(p.price),
          // Margins stay proportional: converting the price and leaving the
          // cost in dollars would report a ~1332x margin on every sale and
          // poison every profitability figure the dashboard computes.
          costPrice: p.costPrice === null ? null : retailRound(p.costPrice),
          comparePrice: p.comparePrice === null ? null : retailRound(p.comparePrice),
        },
      });
    }

    // Both fields: `quote.service.ts` reads StoreSettings.currency for the
    // order, and Store.currency is what the merchant sees in Settings. Leaving
    // them disagreeing is how a display says one thing and the charge another.
    await tx.store.updateMany({ data: { currency: NGN_LABEL } });
    await tx.storeSettings.updateMany({ data: { currency: NGN_LABEL } });
  });

  const after = await prisma.product.aggregate({
    _min: { price: true },
    _max: { price: true },
    _count: true,
  });
  const stillUsd = await prisma.store.count({ where: { NOT: { currency: NGN_LABEL } } });
  const settingsStillUsd = await prisma.storeSettings.count({ where: { NOT: { currency: NGN_LABEL } } });

  console.log('\nAfter:');
  console.log(`  products repriced: ${after._count}`);
  console.log(`  price range: ${naira(after._min.price)} .. ${naira(after._max.price)}`);
  console.log(`  stores not on NGN: ${stillUsd}   store settings not on NGN: ${settingsStillUsd}`);

  if (stillUsd !== 0 || settingsStillUsd !== 0) {
    throw new Error('Some stores are still not on NGN.');
  }
}

main()
  .catch(err => {
    console.error(`\nFailed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
