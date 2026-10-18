/**
 * Add catalogue products to the existing merchant stores.
 *
 * Written to replace the 18 test fixtures that `remove-test-fixtures.mjs`
 * deleted — but these are real listings: named, described, priced, categorised,
 * stocked and photographed, in the seven stores that already trade.
 *
 * Explicit and opt-in, like the other scripts here:
 *
 *   node scripts/add-catalogue-products.mjs              # dry run
 *   APPLY=true node scripts/add-catalogue-products.mjs   # execute
 *
 * Idempotent on `[storeId, slug]`, which is a unique constraint, so a second
 * run reports every row as already present and writes nothing.
 *
 * ## About the photographs — read before changing `image`
 *
 * The repository contains exactly 38 product photographs and the existing 38
 * products use all of them, one each. There were no spare files, so each
 * listing below **shares the photograph of the product it is a sibling of**,
 * and every name was written to describe what that photograph actually shows:
 * the mug-set photo backs a mug set, the whole-bean photo backs whole beans,
 * the chukka photo backs a desert boot (the same style under its other name).
 *
 * This is a deliberate, visible compromise, not an oversight. Two cards in the
 * grid will show the same photograph. The `image` field is the only thing that
 * needs to change when a dedicated photo exists — drop the file into
 * `public/images/products/` and edit one line.
 *
 * ## About the prices
 *
 * They are on the same numeric scale as the existing catalogue, which is
 * priced in US dollars (a $34 candle, a $640 chair) even though
 * `DEFAULT_CURRENCY` is now NGN. Pricing these in naira would put ₦48,000
 * beside ₦34 and make every sort and filter nonsense. Converting the whole
 * catalogue is a separate decision and belongs in one pass over all 56 rows.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.env.APPLY === 'true';

/** `/images/products/<image>` must exist on disk; the script verifies it. */
const PRODUCTS = [
  // --- Northwind Audio ------------------------------------------------------
  {
    storeId: 'str_northwind_audio',
    title: 'Open-Back Studio Headphones',
    slug: 'open-back-studio-headphones',
    sku: 'NWA-HPH-101',
    price: 289,
    costPrice: 142,
    category: 'Audio',
    stock: 24,
    image: 'audio-studio-headphones.jpg',
    tags: ['headphones', 'open-back', 'studio'],
    description:
      'An open-back reference pair for mixing in a quiet room. 38mm drivers, a replaceable cable and a velour headband that stays comfortable across a long session.',
  },
  {
    storeId: 'str_northwind_audio',
    title: 'Sport True Wireless Earbuds',
    slug: 'sport-true-wireless-earbuds',
    sku: 'NWA-EAR-102',
    price: 109,
    costPrice: 48,
    category: 'Audio',
    stock: 61,
    image: 'audio-wireless-earbuds.jpg',
    tags: ['earbuds', 'wireless', 'sport'],
    description:
      'IPX5 earbuds with a wing-tip fit that holds through a run. Seven hours on a charge, twenty-eight with the case, and a transparency mode for traffic.',
  },

  // --- Cobble & Last --------------------------------------------------------
  {
    storeId: 'str_cobble_and_last',
    title: 'High-Top Canvas Sneaker',
    slug: 'high-top-canvas-sneaker',
    sku: 'CAL-CNV-101',
    price: 86,
    costPrice: 34,
    category: 'Footwear',
    stock: 38,
    image: 'shoes-canvas-sneaker.jpg',
    tags: ['sneaker', 'canvas', 'high-top'],
    description:
      'The low-top pattern cut higher, in 12oz cotton canvas on a vulcanised rubber sole. Unlined, so it softens to the foot over the first week.',
  },
  {
    storeId: 'str_cobble_and_last',
    title: 'Suede Desert Boot',
    slug: 'suede-desert-boot',
    sku: 'CAL-SDE-102',
    price: 178,
    costPrice: 76,
    category: 'Footwear',
    stock: 22,
    image: 'shoes-suede-chukka.jpg',
    tags: ['boot', 'suede', 'desert'],
    description:
      'Two-eyelet chukka in sand suede on a crepe wedge. Goodyear-welted, so it can be resoled rather than replaced.',
  },

  // --- Verdant Home ---------------------------------------------------------
  {
    storeId: 'str_verdant_home',
    title: 'Stoneware Mug, Set of Two',
    slug: 'stoneware-mug-set-of-two',
    sku: 'VDH-MUG-101',
    price: 34,
    costPrice: 12,
    category: 'Home & Living',
    stock: 54,
    image: 'home-stoneware-mugs.jpg',
    tags: ['stoneware', 'mug', 'kitchen'],
    description:
      'The four-piece set in a pair, for smaller kitchens. Reactive glaze over dark stoneware, 350ml, dishwasher and microwave safe.',
  },
  {
    storeId: 'str_verdant_home',
    title: 'Soy Wax Candle, Fig & Vetiver',
    slug: 'soy-wax-candle-fig-and-vetiver',
    sku: 'VDH-CND-102',
    price: 34,
    costPrice: 11,
    category: 'Home & Living',
    stock: 73,
    image: 'home-soy-candle.jpg',
    tags: ['candle', 'soy wax', 'fig'],
    description:
      'Green fig over vetiver and a little cedar, poured into the same ribbed glass. Cotton wick, 220g, around 45 hours.',
  },
  {
    storeId: 'str_verdant_home',
    title: 'Linen Cushion Cover, Ivory',
    slug: 'linen-cushion-cover-ivory',
    sku: 'VDH-CSH-103',
    price: 42,
    costPrice: 15,
    category: 'Home & Living',
    stock: 46,
    image: 'home-linen-cushion.jpg',
    tags: ['linen', 'cushion', 'ivory'],
    description:
      'Stonewashed European flax in undyed ivory, 50x50cm, with a hidden zip. Cover only, so it launders flat.',
  },

  // --- Rooted Skincare ------------------------------------------------------
  {
    storeId: 'str_rooted_skincare',
    title: 'Niacinamide Clarifying Serum',
    slug: 'niacinamide-clarifying-serum',
    sku: 'RTD-SRM-101',
    price: 44,
    costPrice: 12,
    category: 'Skincare',
    stock: 68,
    image: 'skincare-facial-serum.jpg',
    tags: ['serum', 'niacinamide', 'fragrance-free'],
    description:
      '30ml of 5% niacinamide with zinc PCA, for congested skin and uneven tone. Fragrance-free; use after cleansing, before moisturiser.',
  },
  {
    storeId: 'str_rooted_skincare',
    title: 'Foaming Cleansing Gel, 200ml',
    slug: 'foaming-cleansing-gel-200ml',
    sku: 'RTD-CLN-102',
    price: 31,
    costPrice: 9,
    category: 'Skincare',
    stock: 85,
    image: 'skincare-cleansing-gel.jpg',
    tags: ['cleanser', 'gel', 'gentle'],
    description:
      'The gentle cleanser in the larger pump bottle. Amino-acid surfactants and glycerin, pH 5.5, no sulfates or fragrance.',
  },
  {
    storeId: 'str_rooted_skincare',
    title: 'Rosehip Replenishing Oil',
    slug: 'rosehip-replenishing-oil',
    sku: 'RTD-OIL-103',
    price: 58,
    costPrice: 17,
    category: 'Skincare',
    stock: 41,
    image: 'skincare-brightening-oil.jpg',
    tags: ['oil', 'rosehip', 'night'],
    description:
      '30ml of cold-pressed rosehip with squalane and vitamin E, for dry skin overnight. Press in as the last step; it absorbs without a film.',
  },

  // --- Tandem Coffee Roasters ----------------------------------------------
  {
    storeId: 'str_tandem_coffee',
    title: 'Decaf Colombia, Whole Bean',
    slug: 'decaf-colombia-whole-bean',
    sku: 'TCR-DEC-101',
    price: 18.5,
    costPrice: 7.2,
    category: 'Coffee',
    stock: 64,
    image: 'coffee-single-origin.jpg',
    tags: ['decaf', 'colombia', 'whole bean'],
    description:
      'Sugarcane-process decaf from Huila. Cocoa, dried cherry and a soft finish; roasted for filter. 340g whole bean, roasted to order.',
  },
  {
    storeId: 'str_tandem_coffee',
    title: 'Single-Origin Kenya, Whole Bean',
    slug: 'single-origin-kenya-whole-bean',
    sku: 'TCR-SGL-102',
    price: 21,
    costPrice: 8.4,
    category: 'Coffee',
    stock: 52,
    image: 'coffee-single-origin.jpg',
    tags: ['kenya', 'single origin', 'whole bean'],
    description:
      'An SL28 lot from Nyeri: blackcurrant, tomato leaf and a hard, bright acidity. Best as filter. 340g whole bean.',
  },
  {
    storeId: 'str_tandem_coffee',
    title: 'Filter Blend, Medium Roast',
    slug: 'filter-blend-medium-roast',
    sku: 'TCR-FLT-103',
    price: 16.5,
    costPrice: 6.1,
    category: 'Coffee',
    stock: 96,
    image: 'coffee-espresso-blend.jpg',
    tags: ['blend', 'filter', 'medium roast'],
    description:
      'The house blend taken lighter for pour-over and batch brew. Red apple, almond and brown sugar. 340g whole bean or ground to order.',
  },

  // --- Meridian Desk Supply -------------------------------------------------
  {
    storeId: 'str_meridian_desk',
    title: 'Compact Mechanical Keyboard, Linear',
    slug: 'compact-mechanical-keyboard-linear',
    sku: 'MDS-KBD-101',
    price: 148,
    costPrice: 64,
    category: 'Desk & Tech',
    stock: 31,
    image: 'desk-mechanical-keyboard.jpg',
    tags: ['keyboard', 'mechanical', '65%'],
    description:
      'A 65% layout with linear switches, for a smaller desk and a quieter room. Hot-swap sockets, PBT caps, USB-C and QMK-compatible.',
  },
  {
    storeId: 'str_meridian_desk',
    title: 'Wireless Mouse, Graphite',
    slug: 'wireless-mouse-graphite',
    sku: 'MDS-MSE-102',
    price: 68,
    costPrice: 27,
    category: 'Desk & Tech',
    stock: 57,
    image: 'desk-wireless-mouse.jpg',
    tags: ['mouse', 'wireless', 'graphite'],
    description:
      'The low-profile mouse in graphite. Six buttons, a quiet scroll, 2.4GHz and Bluetooth with a switch on the base, and ten weeks per charge.',
  },
  {
    storeId: 'str_meridian_desk',
    title: 'Walnut Monitor Stand',
    slug: 'walnut-monitor-stand',
    sku: 'MDS-RSR-103',
    price: 112,
    costPrice: 44,
    category: 'Desk & Tech',
    stock: 26,
    image: 'desk-walnut-riser.jpg',
    tags: ['monitor', 'walnut', 'stand'],
    description:
      'Solid American walnut, 60cm wide, raising a monitor 11cm with room for a keyboard underneath. Oiled finish, felt-padded feet.',
  },

  // --- Aura Apparel Store ---------------------------------------------------
  {
    storeId: 'str_aura_apparel',
    title: 'Garment-Dyed Cotton Tee',
    slug: 'garment-dyed-cotton-tee',
    sku: 'AUR-TEE-101',
    price: 38,
    costPrice: 13,
    category: 'Apparel',
    stock: 92,
    image: 'apparel-cotton-tee.jpg',
    tags: ['tee', 'cotton', 'garment-dyed'],
    description:
      'The classic tee dyed after making up, so the colour settles unevenly and softens with every wash. 180gsm combed cotton, boxy through the body.',
  },
  {
    storeId: 'str_aura_apparel',
    title: 'Merino Wool V-Neck Sweater',
    slug: 'merino-wool-v-neck-sweater',
    sku: 'AUR-SWT-102',
    price: 104,
    costPrice: 41,
    category: 'Apparel',
    stock: 34,
    image: 'apparel-merino-sweater.jpg',
    tags: ['sweater', 'merino', 'v-neck'],
    description:
      'The crew sweater cut with a V neck, in the same 19.5-micron extra-fine merino. Fully fashioned, machine washable cold.',
  },
];

async function main() {
  const fs = await import('fs');
  const path = await import('path');

  if (PRODUCTS.length !== 18) {
    throw new Error(`Expected 18 listings, found ${PRODUCTS.length}.`);
  }

  // Every photograph must exist before anything is written: a product row
  // pointing at a missing file is exactly the broken card this replaces.
  const imageDir = path.join(process.cwd(), '..', 'public', 'images', 'products');
  const missing = [...new Set(PRODUCTS.map(p => p.image))].filter(
    f => !fs.existsSync(path.join(imageDir, f))
  );
  if (missing.length) {
    throw new Error(`Missing image file(s) in public/images/products: ${missing.join(', ')}`);
  }

  console.log(APPLY ? 'APPLYING' : 'DRY RUN — set APPLY=true to execute');

  let created = 0;
  let skipped = 0;

  for (const spec of PRODUCTS) {
    const store = await prisma.store.findUnique({
      where: { id: spec.storeId },
      select: { id: true, name: true },
    });
    if (!store) throw new Error(`Store ${spec.storeId} does not exist.`);

    const existing = await prisma.product.findUnique({
      where: { storeId_slug: { storeId: spec.storeId, slug: spec.slug } },
      select: { id: true },
    });
    if (existing) {
      console.log(`  exists   ${store.name} / ${spec.title}`);
      skipped++;
      continue;
    }

    /*
     * Reuse the ProductCategory row a sibling in the same store already points
     * at, so the new listing joins the existing taxonomy instead of sitting
     * outside it with a null categoryId.
     */
    const sibling = await prisma.product.findFirst({
      where: { storeId: spec.storeId, category: spec.category, categoryId: { not: null } },
      select: { categoryId: true },
    });

    if (!APPLY) {
      console.log(`  would add ${store.name} / ${spec.title}  ${spec.price}  <- ${spec.image}`);
      created++;
      continue;
    }

    /*
     * One transaction per listing: a product with no photo or no stock row is
     * worse than no product, since it shows as an initial and cannot be sold.
     */
    await prisma.$transaction(async tx => {
      const product = await tx.product.create({
        data: {
          storeId: spec.storeId,
          title: spec.title,
          // `name` duplicates `title` throughout this schema; the seed sets both.
          name: spec.title,
          slug: spec.slug,
          description: spec.description,
          price: spec.price,
          costPrice: spec.costPrice,
          sku: spec.sku,
          status: 'ACTIVE',
          category: spec.category,
          categoryId: sibling?.categoryId ?? null,
          tags: spec.tags,
        },
      });

      await tx.productImage.create({
        data: {
          productId: product.id,
          url: `/images/products/${spec.image}`,
          altText: spec.title,
          position: 0,
          isPrimary: true,
          // Null: these are catalogue files committed to the frontend, not a
          // merchant upload in the API's own uploads volume.
          storageKey: null,
        },
      });

      await tx.inventoryItem.create({
        data: {
          storeId: spec.storeId,
          productId: product.id,
          sku: spec.sku,
          stock: spec.stock,
          reservedStock: 0,
          availableStock: spec.stock,
          lowStockThreshold: 5,
        },
      });
    });

    console.log(`  added    ${store.name} / ${spec.title}  ${spec.price}  <- ${spec.image}`);
    created++;
  }

  console.log(`\n${APPLY ? 'Added' : 'Would add'}: ${created}   already present: ${skipped}`);

  if (APPLY) {
    const total = await prisma.product.count();
    const withPhotos = await prisma.product.count({ where: { images: { some: {} } } });
    const visible = await prisma.product.count({
      where: { status: 'ACTIVE', store: { status: 'ACTIVE' } },
    });
    console.log(`  products: ${total} (with photos: ${withPhotos}, publicly visible: ${visible})`);
    if (total !== withPhotos) {
      throw new Error(`${total - withPhotos} product(s) still have no photo.`);
    }
  }
}

main()
  .catch(err => {
    console.error(`\nFailed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
