import { PrismaClient, Role, StoreStatus, ProductStatus, InventoryMovementType } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * The marketplace catalogue.
 *
 * The public homepage lists products from every live store, so a single demo
 * store cannot exercise it: the point of `/` is breadth across merchants and
 * categories. This module holds that catalogue as data and applies it
 * idempotently, so it can be used both by a fresh `prisma:seed` and against an
 * existing database without duplicating rows.
 *
 * Two rules the content follows:
 *
 * 1. **Every image is a real photograph of the kind of product it is attached
 *    to**, served from `public/images/products/`. They were downloaded from
 *    Unsplash (whose licence permits this) and each file was verified to be a
 *    real JPEG before being committed, so no card falls back to a placeholder
 *    and no URL can rot.
 * 2. **No invented social proof.** Descriptions state materials, dimensions and
 *    construction — things a merchant knows about their own product. There are
 *    no review counts, star ratings, "as seen in" claims or sales statistics,
 *    because nothing in the schema records any of those.
 */

export interface CatalogueVariant {
  title: string;
  sku: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  inventory: number;
}

export interface CatalogueProduct {
  title: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  sku: string;
  category: string;
  tags: string[];
  /** Filename under `public/images/products/`. */
  image: string;
  extraImages?: string[];
  /** Stock for a product with no variants. Ignored when `variants` is set. */
  inventory?: number;
  variants?: CatalogueVariant[];
}

export interface CatalogueCategory {
  name: string;
  slug: string;
  description: string;
}

export interface CatalogueStore {
  /** Stable id so re-running is idempotent and the URLs stay put. */
  id: string;
  name: string;
  domain: string;
  handle: string;
  industry: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  announcementText?: string;
  categories: CatalogueCategory[];
  products: CatalogueProduct[];
}

const IMAGE_BASE = '/images/products';

/** Every photo is a real file in the repo, not a remote URL. */
function imageUrl(file: string) {
  return `${IMAGE_BASE}/${file}`;
}

const APPAREL: CatalogueCategory = { name: 'Apparel', slug: 'apparel', description: 'Everyday garments and outerwear' };
const BAGS: CatalogueCategory = { name: 'Bags & Accessories', slug: 'bags-accessories', description: 'Leather goods and carry' };
const WATCHES: CatalogueCategory = { name: 'Watches', slug: 'watches', description: 'Mechanical and quartz timepieces' };
const AUDIO: CatalogueCategory = { name: 'Audio', slug: 'audio', description: 'Headphones, earbuds and speakers' };
const FOOTWEAR: CatalogueCategory = { name: 'Footwear', slug: 'footwear', description: 'Sneakers, trainers and boots' };
const HOME: CatalogueCategory = { name: 'Home & Living', slug: 'home-living', description: 'Furniture, ceramics and textiles' };
const SKINCARE: CatalogueCategory = { name: 'Skincare', slug: 'skincare', description: 'Cleansers, serums and moisturisers' };
const COFFEE: CatalogueCategory = { name: 'Coffee', slug: 'coffee', description: 'Roasted whole bean and ground coffee' };
const DESK: CatalogueCategory = { name: 'Desk & Tech', slug: 'desk-tech', description: 'Keyboards, pointing devices and desk goods' };

const SIZES = ['Small', 'Medium', 'Large', 'X-Large'];

/** Apparel sizing, as four variants sharing one price. */
function sizeVariants(sku: string, price: number, stock: number[], costPrice?: number): CatalogueVariant[] {
  return SIZES.map((size, i) => ({
    title: size,
    sku: `${sku}-${size.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()}`,
    price,
    costPrice,
    inventory: stock[i] ?? 0,
  }));
}

/** UK shoe sizes, as five variants. */
function shoeVariants(sku: string, price: number, stock: number[], costPrice?: number): CatalogueVariant[] {
  return ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'].map((size, i) => ({
    title: size,
    sku: `${sku}-${size.replace(/\D/g, '')}`,
    price,
    costPrice,
    inventory: stock[i] ?? 0,
  }));
}

/**
 * Products added to the existing demo store (`str_aura_apparel`).
 *
 * The three products the demo store already has are created by `seed.ts`
 * itself; these extend it so Apparel, Bags and Watches each hold a real range
 * rather than one item apiece.
 */
export const DEMO_STORE_EXTRA_PRODUCTS: CatalogueProduct[] = [
  {
    title: 'Heavyweight Flannel Overshirt',
    slug: 'heavyweight-flannel-overshirt',
    description:
      'Brushed cotton flannel at 320gsm, cut as an overshirt to layer over a tee. Two chest pockets with box pleats, corozo buttons, and a straight hem.',
    price: 118.0,
    comparePrice: 145.0,
    costPrice: 48.0,
    sku: 'AUR-FLN-001',
    category: APPAREL.name,
    tags: ['cotton', 'outerwear', 'flannel'],
    image: 'apparel-flannel-overshirt.jpg',
    variants: sizeVariants('AUR-FLN-001', 118.0, [8, 14, 12, 6], 48.0),
  },
  {
    title: 'Merino Wool Crew Sweater',
    slug: 'merino-wool-crew-sweater',
    description:
      'Fine-gauge 100% extra-fine merino, machine washable on a wool cycle. Ribbed collar, cuffs and hem; full-fashioned shoulders.',
    price: 96.0,
    costPrice: 39.0,
    sku: 'AUR-MER-002',
    category: APPAREL.name,
    tags: ['merino', 'knitwear'],
    image: 'apparel-merino-sweater.jpg',
    variants: sizeVariants('AUR-MER-002', 96.0, [10, 18, 15, 9], 39.0),
  },
  {
    title: 'Wool-Blend Overcoat',
    slug: 'wool-blend-overcoat',
    description:
      'Single-breasted overcoat in a 70% wool blend with a twill viscose lining. Notch lapel, welt chest pocket, centre back vent, mid-thigh length.',
    price: 285.0,
    comparePrice: 340.0,
    costPrice: 124.0,
    sku: 'AUR-OVC-003',
    category: APPAREL.name,
    tags: ['wool', 'outerwear', 'coat'],
    image: 'apparel-wool-overcoat.jpg',
    variants: sizeVariants('AUR-OVC-003', 285.0, [4, 7, 6, 3], 124.0),
  },
  {
    title: 'Classic Cotton Tee',
    slug: 'classic-cotton-tee',
    description:
      'Combed ring-spun cotton at 180gsm with a set-in collar that holds its shape. Pre-shrunk, with twin-needle hems.',
    price: 32.0,
    costPrice: 9.5,
    sku: 'AUR-TEE-004',
    category: APPAREL.name,
    tags: ['cotton', 'basics'],
    image: 'apparel-cotton-tee.jpg',
    variants: sizeVariants('AUR-TEE-004', 32.0, [30, 42, 38, 20], 9.5),
  },
  {
    title: 'Canvas Weekender Duffel',
    slug: 'canvas-weekender-duffel',
    description:
      '18oz waxed cotton canvas with full-grain leather end caps and base. 42 litres, a zipped interior pocket, and a detachable webbing shoulder strap.',
    price: 164.0,
    costPrice: 71.0,
    sku: 'AUR-DUF-005',
    category: BAGS.name,
    tags: ['canvas', 'leather', 'travel'],
    image: 'bag-canvas-duffel.jpg',
    inventory: 22,
  },
  {
    title: 'Everyday Leather Crossbody',
    slug: 'everyday-leather-crossbody',
    description:
      'Vegetable-tanned full-grain leather that patinas with use. Fits a 10-inch tablet, with a slip pocket under the flap and a solid brass clasp.',
    price: 142.0,
    comparePrice: 169.0,
    costPrice: 58.0,
    sku: 'AUR-CRS-006',
    category: BAGS.name,
    tags: ['leather', 'everyday'],
    image: 'bag-leather-crossbody.jpg',
    inventory: 17,
  },
  {
    title: 'Leather Holdall',
    slug: 'leather-holdall',
    description:
      'Full-grain bridle leather holdall with a brass-zip top and reinforced carry handles. 38 litres, unlined so the leather can be fed and maintained.',
    price: 398.0,
    costPrice: 176.0,
    sku: 'AUR-HLD-007',
    category: BAGS.name,
    tags: ['leather', 'travel', 'bridle'],
    image: 'bag-leather-holdall.jpg',
    inventory: 6,
  },
  {
    title: 'Field Watch, Sapphire Crystal',
    slug: 'field-watch-sapphire-crystal',
    description:
      '38mm brushed steel case, automatic movement with a 41-hour power reserve, sapphire crystal, and 100m water resistance on a khaki webbing strap.',
    price: 420.0,
    costPrice: 193.0,
    sku: 'AUR-FLD-008',
    category: WATCHES.name,
    tags: ['automatic', 'field', 'sapphire'],
    image: 'watch-field.jpg',
    inventory: 11,
  },
  {
    title: 'Dive Watch, 200m',
    slug: 'dive-watch-200m',
    description:
      '40mm steel case with a 120-click unidirectional bezel, screw-down crown, automatic movement and 200m water resistance. Supplied on a steel bracelet.',
    price: 575.0,
    comparePrice: 690.0,
    costPrice: 248.0,
    sku: 'AUR-DIV-009',
    category: WATCHES.name,
    tags: ['automatic', 'dive', 'steel'],
    image: 'watch-dive.jpg',
    inventory: 8,
  },
  {
    title: 'Minimal Dress Watch',
    slug: 'minimal-dress-watch',
    description:
      '36mm case at 7mm thick, quartz movement, applied indices and a domed mineral crystal. Italian leather strap with quick-release spring bars.',
    price: 186.0,
    costPrice: 74.0,
    sku: 'AUR-DRS-010',
    category: WATCHES.name,
    tags: ['quartz', 'dress', 'leather'],
    image: 'watch-dress.jpg',
    inventory: 19,
  },
];

export const CATALOGUE_STORES: CatalogueStore[] = [
  {
    id: 'str_northwind_audio',
    name: 'Northwind Audio',
    domain: 'northwindaudio.com',
    handle: 'northwindaudio',
    industry: 'Electronics',
    ownerId: 'usr_northwind_owner',
    ownerEmail: 'owner@northwindaudio.com',
    ownerName: 'Priya Raman',
    announcementText: 'Free carry case with every pair of over-ear headphones.',
    categories: [AUDIO],
    products: [
      {
        title: 'Studio Over-Ear Headphones',
        slug: 'studio-over-ear-headphones',
        description:
          'Closed-back 45mm dynamic drivers with a detachable 3m coiled cable. Replaceable velour earpads and a 32-ohm impedance suited to an interface.',
        price: 249.0,
        comparePrice: 299.0,
        costPrice: 104.0,
        sku: 'NWA-STU-001',
        category: AUDIO.name,
        tags: ['over-ear', 'studio', 'wired'],
        image: 'audio-studio-headphones.jpg',
        variants: [
          { title: 'Matte Black', sku: 'NWA-STU-001-BLK', price: 249.0, costPrice: 104.0, inventory: 24 },
          { title: 'Silver', sku: 'NWA-STU-001-SLV', price: 249.0, costPrice: 104.0, inventory: 13 },
        ],
      },
      {
        title: 'Reference Monitor Headphones',
        slug: 'reference-monitor-headphones',
        description:
          'Open-back design for a wide stereo image, intended for mixing rather than isolation. 250-ohm, so it wants a headphone amplifier.',
        price: 329.0,
        costPrice: 147.0,
        sku: 'NWA-REF-002',
        category: AUDIO.name,
        tags: ['open-back', 'reference'],
        image: 'audio-reference-headphones.jpg',
        inventory: 9,
      },
      {
        title: 'Wireless Noise-Cancelling Headset',
        slug: 'wireless-noise-cancelling-headset',
        description:
          'Hybrid active noise cancellation with a transparency mode, Bluetooth 5.3 with multipoint, USB-C charging and a 3.5mm fallback cable.',
        price: 279.0,
        comparePrice: 319.0,
        costPrice: 118.0,
        sku: 'NWA-ANC-003',
        category: AUDIO.name,
        tags: ['wireless', 'anc', 'bluetooth'],
        image: 'audio-wireless-headset.jpg',
        inventory: 31,
      },
      {
        title: 'True Wireless Earbuds',
        slug: 'true-wireless-earbuds',
        description:
          'In-ear buds with three silicone tip sizes, IPX4 water resistance and a pocketable charging case. Each bud weighs 4.6g.',
        price: 129.0,
        costPrice: 44.0,
        sku: 'NWA-TWS-004',
        category: AUDIO.name,
        tags: ['earbuds', 'wireless', 'ipx4'],
        image: 'audio-wireless-earbuds.jpg',
        inventory: 48,
      },
      {
        title: 'Portable Bluetooth Speaker',
        slug: 'portable-bluetooth-speaker',
        description:
          'A 20W driver with a passive bass radiator in an IP67 rubberised housing. Pairs two units for stereo and charges over USB-C.',
        price: 89.0,
        costPrice: 31.0,
        sku: 'NWA-SPK-005',
        category: AUDIO.name,
        tags: ['speaker', 'portable', 'ip67'],
        image: 'audio-portable-speaker.jpg',
        inventory: 37,
      },
      {
        title: 'Bookshelf Speaker Pair',
        slug: 'bookshelf-speaker-pair',
        description:
          'Two-way passive bookshelf speakers: 5.25in woven mid-bass driver and a 1in silk dome tweeter, 6-ohm nominal. Sold as a matched pair.',
        price: 449.0,
        costPrice: 198.0,
        sku: 'NWA-BSH-006',
        category: AUDIO.name,
        tags: ['speaker', 'passive', 'hifi'],
        image: 'audio-bookshelf-speakers.jpg',
        inventory: 7,
      },
    ],
  },
  {
    id: 'str_cobble_and_last',
    name: 'Cobble & Last',
    domain: 'cobbleandlast.com',
    handle: 'cobbleandlast',
    industry: 'Footwear',
    ownerId: 'usr_cobble_owner',
    ownerEmail: 'owner@cobbleandlast.com',
    ownerName: 'Tomas Okafor',
    categories: [FOOTWEAR],
    products: [
      {
        title: 'Low-Top Canvas Sneaker',
        slug: 'low-top-canvas-sneaker',
        description:
          'Cotton canvas upper on a vulcanised rubber sole, with a cotton drill lining and a removable cushioned insole.',
        price: 74.0,
        costPrice: 26.0,
        sku: 'CAL-CNV-001',
        category: FOOTWEAR.name,
        tags: ['canvas', 'vulcanised', 'low-top'],
        image: 'shoes-canvas-sneaker.jpg',
        variants: shoeVariants('CAL-CNV-001', 74.0, [9, 16, 18, 12, 5], 26.0),
      },
      {
        title: 'Court Leather Trainer',
        slug: 'court-leather-trainer',
        description:
          'Full-grain leather upper with perforated side panels, a padded collar and a cup sole stitched as well as cemented.',
        price: 138.0,
        comparePrice: 165.0,
        costPrice: 57.0,
        sku: 'CAL-CRT-002',
        category: FOOTWEAR.name,
        tags: ['leather', 'court', 'trainer'],
        image: 'shoes-court-trainer.jpg',
        variants: shoeVariants('CAL-CRT-002', 138.0, [6, 11, 14, 10, 4], 57.0),
      },
      {
        title: 'Trail Runner GTX',
        slug: 'trail-runner-gtx',
        description:
          'Waterproof membrane with a 4mm lug outsole and a rock plate underfoot. 8mm heel-to-toe drop; 298g in a UK 9.',
        price: 152.0,
        costPrice: 64.0,
        sku: 'CAL-TRL-003',
        category: FOOTWEAR.name,
        tags: ['trail', 'waterproof', 'running'],
        image: 'shoes-trail-runner.jpg',
        variants: shoeVariants('CAL-TRL-003', 152.0, [7, 13, 15, 11, 6], 64.0),
      },
      {
        title: 'Suede Chukka Boot',
        slug: 'suede-chukka-boot',
        description:
          'Two-eyelet chukka in 1.6mm calf suede, Blake-stitched to a crepe rubber sole so it can be resoled.',
        price: 196.0,
        costPrice: 83.0,
        sku: 'CAL-CHK-004',
        category: FOOTWEAR.name,
        tags: ['suede', 'boot', 'blake-stitch'],
        image: 'shoes-suede-chukka.jpg',
        variants: shoeVariants('CAL-CHK-004', 196.0, [4, 9, 10, 7, 3], 83.0),
      },
    ],
  },
  {
    id: 'str_verdant_home',
    name: 'Verdant Home',
    domain: 'verdanthome.com',
    handle: 'verdanthome',
    industry: 'Home & Garden',
    ownerId: 'usr_verdant_owner',
    ownerEmail: 'owner@verdanthome.com',
    ownerName: 'Ines Carvalho',
    announcementText: 'Ceramics are hand-thrown, so each piece varies slightly.',
    categories: [HOME],
    products: [
      {
        title: 'Oak Lounge Chair',
        slug: 'oak-lounge-chair',
        description:
          'Solid white oak frame with a woven paper-cord seat. Finished in hard-wax oil. 72cm high, 68cm wide, 74cm deep; flat-packed with four bolts.',
        price: 640.0,
        comparePrice: 760.0,
        costPrice: 287.0,
        sku: 'VDH-CHR-001',
        category: HOME.name,
        tags: ['oak', 'furniture', 'seating'],
        image: 'home-oak-lounge-chair.jpg',
        inventory: 5,
      },
      {
        title: 'Soy Wax Candle, Cedar & Moss',
        slug: 'soy-wax-candle-cedar-moss',
        description:
          '220g of soy wax with a cotton wick in a reusable amber glass vessel. Roughly 45 hours of burn time.',
        price: 34.0,
        costPrice: 11.0,
        sku: 'VDH-CDL-002',
        category: HOME.name,
        tags: ['candle', 'soy', 'cedar'],
        image: 'home-soy-candle.jpg',
        inventory: 64,
      },
      {
        title: 'Stoneware Mug, Set of Four',
        slug: 'stoneware-mug-set-of-four',
        description:
          'Four 350ml stoneware mugs with a reactive glaze, so colour varies between pieces. Dishwasher and microwave safe.',
        price: 58.0,
        costPrice: 21.0,
        sku: 'VDH-MUG-003',
        category: HOME.name,
        tags: ['stoneware', 'tableware', 'glazed'],
        image: 'home-stoneware-mugs.jpg',
        inventory: 29,
      },
      {
        title: 'Hand-Thrown Ceramic Vase',
        slug: 'hand-thrown-ceramic-vase',
        description:
          'Thrown on the wheel in red earthenware with a matte white glaze and a sealed interior. 24cm tall with a 9cm opening.',
        price: 76.0,
        costPrice: 28.0,
        sku: 'VDH-VSE-004',
        category: HOME.name,
        tags: ['ceramic', 'vase', 'handmade'],
        image: 'home-ceramic-vase.jpg',
        inventory: 14,
      },
      {
        title: 'Linen Cushion Cover',
        slug: 'linen-cushion-cover',
        description:
          'Stonewashed 100% European flax linen with a concealed zip. 50 x 50cm; cover only, insert sold separately.',
        price: 42.0,
        costPrice: 14.5,
        sku: 'VDH-CSH-005',
        category: HOME.name,
        tags: ['linen', 'textiles', 'cushion'],
        image: 'home-linen-cushion.jpg',
        variants: [
          { title: 'Oatmeal', sku: 'VDH-CSH-005-OAT', price: 42.0, costPrice: 14.5, inventory: 23 },
          { title: 'Slate', sku: 'VDH-CSH-005-SLT', price: 42.0, costPrice: 14.5, inventory: 18 },
          { title: 'Olive', sku: 'VDH-CSH-005-OLV', price: 42.0, costPrice: 14.5, inventory: 11 },
        ],
      },
    ],
  },
  {
    id: 'str_rooted_skincare',
    name: 'Rooted Skincare',
    domain: 'rootedskincare.com',
    handle: 'rootedskincare',
    industry: 'Health & Beauty',
    ownerId: 'usr_rooted_owner',
    ownerEmail: 'owner@rootedskincare.com',
    ownerName: 'Lena Fischer',
    categories: [SKINCARE],
    products: [
      {
        title: 'Hydrating Facial Serum',
        slug: 'hydrating-facial-serum',
        description:
          '30ml of a lightweight serum with multi-weight hyaluronic acid and panthenol. Fragrance-free; apply to damp skin before moisturiser.',
        price: 46.0,
        costPrice: 13.0,
        sku: 'RTD-SRM-001',
        category: SKINCARE.name,
        tags: ['serum', 'hyaluronic', 'fragrance-free'],
        image: 'skincare-facial-serum.jpg',
        inventory: 52,
      },
      {
        title: 'Gentle Cleansing Gel',
        slug: 'gentle-cleansing-gel',
        description:
          '150ml of a non-foaming gel cleanser with amino-acid surfactants, pH balanced to 5.5. Removes sunscreen without stripping.',
        price: 28.0,
        costPrice: 8.0,
        sku: 'RTD-CLN-002',
        category: SKINCARE.name,
        tags: ['cleanser', 'ph-balanced'],
        image: 'skincare-cleansing-gel.jpg',
        inventory: 71,
      },
      {
        title: 'Daily Mineral Moisturiser SPF 30',
        slug: 'daily-mineral-moisturiser-spf-30',
        description:
          '50ml moisturiser with non-nano zinc oxide for broad-spectrum SPF 30. No white cast on application; reapply every two hours in direct sun.',
        price: 38.0,
        comparePrice: 45.0,
        costPrice: 12.0,
        sku: 'RTD-SPF-003',
        category: SKINCARE.name,
        tags: ['spf', 'mineral', 'moisturiser'],
        image: 'skincare-mineral-moisturiser.jpg',
        inventory: 44,
      },
      {
        title: 'Vitamin C Brightening Oil',
        slug: 'vitamin-c-brightening-oil',
        description:
          '20ml of a squalane-based oil with 5% tetrahexyldecyl ascorbate, a stable oil-soluble vitamin C. Use at night in an amber dropper bottle.',
        price: 54.0,
        costPrice: 17.0,
        sku: 'RTD-VTC-004',
        category: SKINCARE.name,
        tags: ['vitamin-c', 'facial-oil'],
        image: 'skincare-brightening-oil.jpg',
        inventory: 26,
      },
    ],
  },
  {
    id: 'str_tandem_coffee',
    name: 'Tandem Coffee Roasters',
    domain: 'tandemcoffee.com',
    handle: 'tandemcoffee',
    industry: 'Food & Beverage',
    ownerId: 'usr_tandem_owner',
    ownerEmail: 'owner@tandemcoffee.com',
    ownerName: 'Marcus Bell',
    announcementText: 'Roasted to order every Tuesday and Friday.',
    categories: [COFFEE],
    products: [
      {
        title: 'Single-Origin Ethiopia, Whole Bean',
        slug: 'single-origin-ethiopia-whole-bean',
        description:
          'Washed heirloom varietals from Yirgacheffe, roasted light for filter. Tasting notes of bergamot, peach and jasmine. Roast date printed on every bag.',
        price: 19.5,
        costPrice: 7.2,
        sku: 'TCR-ETH-001',
        category: COFFEE.name,
        tags: ['single-origin', 'light-roast', 'filter'],
        image: 'coffee-single-origin.jpg',
        variants: [
          { title: '250g', sku: 'TCR-ETH-001-250', price: 19.5, costPrice: 7.2, inventory: 60 },
          { title: '1kg', sku: 'TCR-ETH-001-1KG', price: 68.0, costPrice: 26.0, inventory: 22 },
        ],
      },
      {
        title: 'Espresso Blend, Dark Roast',
        slug: 'espresso-blend-dark-roast',
        description:
          'A Brazil and Sumatra blend roasted dark for espresso, built to hold up in milk. Notes of cocoa, molasses and toasted almond.',
        price: 17.0,
        comparePrice: 21.0,
        costPrice: 6.1,
        sku: 'TCR-ESP-002',
        category: COFFEE.name,
        tags: ['blend', 'dark-roast', 'espresso'],
        image: 'coffee-espresso-blend.jpg',
        variants: [
          { title: '250g', sku: 'TCR-ESP-002-250', price: 17.0, costPrice: 6.1, inventory: 83 },
          { title: '1kg', sku: 'TCR-ESP-002-1KG', price: 58.0, costPrice: 22.0, inventory: 31 },
        ],
      },
    ],
  },
  {
    id: 'str_meridian_desk',
    name: 'Meridian Desk Supply',
    domain: 'meridiandesk.com',
    handle: 'meridiandesk',
    industry: 'Electronics',
    ownerId: 'usr_meridian_owner',
    ownerEmail: 'owner@meridiandesk.com',
    ownerName: 'Daniel Ferreira',
    categories: [DESK],
    products: [
      {
        title: 'Mechanical Keyboard, Tactile',
        slug: 'mechanical-keyboard-tactile',
        description:
          '75% layout with hot-swappable sockets, tactile switches rated to 50 million actuations, a gasket mount and double-shot PBT keycaps.',
        price: 164.0,
        comparePrice: 199.0,
        costPrice: 68.0,
        sku: 'MDS-KBD-001',
        category: DESK.name,
        tags: ['mechanical', 'hot-swap', '75-percent'],
        image: 'desk-mechanical-keyboard.jpg',
        variants: [
          { title: 'Tactile Brown', sku: 'MDS-KBD-001-BRN', price: 164.0, costPrice: 68.0, inventory: 19 },
          { title: 'Linear Red', sku: 'MDS-KBD-001-RED', price: 164.0, costPrice: 68.0, inventory: 14 },
        ],
      },
      {
        title: 'Low-Profile Wireless Mouse',
        slug: 'low-profile-wireless-mouse',
        description:
          '68g mouse with an 8000 DPI optical sensor, Bluetooth and a 2.4GHz dongle, and a USB-C rechargeable cell rated at roughly 70 hours.',
        price: 72.0,
        costPrice: 24.0,
        sku: 'MDS-MSE-002',
        category: DESK.name,
        tags: ['wireless', 'mouse', 'usb-c'],
        image: 'desk-wireless-mouse.jpg',
        inventory: 41,
      },
      {
        title: 'Walnut Laptop Riser',
        slug: 'walnut-laptop-riser',
        description:
          'Solid American walnut riser that lifts a laptop 11cm, with a cable channel at the rear and cork feet. Holds up to 8kg.',
        price: 96.0,
        costPrice: 37.0,
        sku: 'MDS-RSR-003',
        category: DESK.name,
        tags: ['walnut', 'ergonomics', 'riser'],
        image: 'desk-walnut-riser.jpg',
        inventory: 16,
      },
      {
        title: 'Full-Grain Leather Desk Mat',
        slug: 'full-grain-leather-desk-mat',
        description:
          '90 x 43cm mat in 2mm full-grain leather with a wool-felt backing. Edges are skived and burnished rather than painted.',
        price: 118.0,
        costPrice: 46.0,
        sku: 'MDS-MAT-004',
        category: DESK.name,
        tags: ['leather', 'desk-mat', 'felt'],
        image: 'desk-leather-mat.jpg',
        inventory: 23,
      },
    ],
  },
];

/**
 * Create one product with its images, variants and inventory.
 *
 * Idempotent on `(storeId, slug)`, which is the product's unique key, so
 * applying the catalogue twice does not duplicate anything.
 */
async function createProduct(
  prisma: PrismaClient,
  storeId: string,
  categoryIdByName: Map<string, string>,
  spec: CatalogueProduct
): Promise<boolean> {
  const existing = await prisma.product.findFirst({
    where: { storeId, slug: spec.slug },
    select: { id: true },
  });
  if (existing) return false;

  const images = [spec.image, ...(spec.extraImages ?? [])];

  const product = await prisma.product.create({
    data: {
      storeId,
      title: spec.title,
      name: spec.title,
      slug: spec.slug,
      description: spec.description,
      price: spec.price,
      comparePrice: spec.comparePrice,
      costPrice: spec.costPrice,
      sku: spec.sku,
      status: ProductStatus.ACTIVE,
      category: spec.category,
      categoryId: categoryIdByName.get(spec.category),
      tags: spec.tags,
      images: {
        create: images.map((file, index) => ({
          url: imageUrl(file),
          altText: spec.title,
          isPrimary: index === 0,
          position: index,
        })),
      },
      ...(spec.variants
        ? {
            variants: {
              create: spec.variants.map(v => ({
                title: v.title,
                sku: v.sku,
                price: v.price,
                comparePrice: v.comparePrice,
                costPrice: v.costPrice,
                inventoryQuantity: v.inventory,
              })),
            },
          }
        : {}),
    },
    include: { variants: true },
  });

  // Inventory is tracked per variant when there are variants, and once at
  // product level when there are not — the same shape the products API creates,
  // so stock, movements and the storefront's stock check all line up.
  const rows = product.variants.length
    ? product.variants.map(v => ({ variantId: v.id as string | undefined, sku: v.sku, qty: v.inventoryQuantity }))
    : [{ variantId: undefined, sku: product.sku, qty: spec.inventory ?? 0 }];

  for (const row of rows) {
    const item = await prisma.inventoryItem.create({
      data: {
        storeId,
        productId: product.id,
        variantId: row.variantId,
        sku: row.sku,
        stock: row.qty,
        availableStock: row.qty,
        reservedStock: 0,
        lowStockThreshold: 5,
      },
    });

    await prisma.inventoryMovement.create({
      data: {
        storeId,
        inventoryItemId: item.id,
        productId: product.id,
        variantId: row.variantId,
        changeQuantity: row.qty,
        newQuantity: row.qty,
        type: InventoryMovementType.INITIAL,
        reason: 'Initial stock import from the marketplace catalogue',
      },
    });
  }

  return true;
}

/** Ensure the store's categories exist and return a name -> id map. */
async function ensureCategories(
  prisma: PrismaClient,
  storeId: string,
  categories: CatalogueCategory[]
) {
  const map = new Map<string, string>();
  for (const category of categories) {
    const existing = await prisma.productCategory.findFirst({
      where: { storeId, name: category.name },
      select: { id: true },
    });
    if (existing) {
      map.set(category.name, existing.id);
      continue;
    }
    const created = await prisma.productCategory.create({
      data: { storeId, name: category.name, slug: category.slug, description: category.description },
    });
    map.set(category.name, created.id);
  }
  return map;
}

/**
 * Apply the catalogue.
 *
 * Idempotent throughout: stores, owners, categories and products are each
 * created only when absent, so this is safe to run against a database that has
 * already had it applied.
 */
export async function applyCatalogue(
  prisma: PrismaClient,
  options: { demoStoreId?: string; log?: (message: string) => void } = {}
) {
  const log = options.log ?? (() => {});
  const passwordHash = await bcrypt.hash('Password123!', 10);
  let storesCreated = 0;
  let productsCreated = 0;

  for (const spec of CATALOGUE_STORES) {
    let store = await prisma.store.findUnique({ where: { id: spec.id }, select: { id: true } });

    if (!store) {
      await prisma.user.upsert({
        where: { email: spec.ownerEmail },
        update: {},
        create: {
          id: spec.ownerId,
          email: spec.ownerEmail,
          name: spec.ownerName,
          passwordHash,
          plan: 'pro',
          isVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      store = await prisma.store.create({
        data: {
          id: spec.id,
          name: spec.name,
          domain: spec.domain,
          currency: 'USD — US Dollar',
          timezone: 'America/New_York',
          industry: spec.industry,
          status: StoreStatus.ACTIVE,
          ownerId: spec.ownerId,
        },
        select: { id: true },
      });

      await prisma.storeMember.create({
        data: { userId: spec.ownerId, storeId: spec.id, role: Role.OWNER },
      });

      await prisma.storeSettings.create({
        data: {
          storeId: spec.id,
          storeName: spec.name,
          storeUrl: spec.handle,
          currency: 'USD — US Dollar',
          industry: spec.industry,
          announcementText: spec.announcementText ?? '',
          activeTheme: 'nexus-dark',
          primaryColor: '#FFBD2E',
          customDomain: spec.domain,
        },
      });

      storesCreated += 1;
      log(`  store created: ${spec.name}`);
    }

    const categoryIds = await ensureCategories(prisma, spec.id, spec.categories);
    for (const product of spec.products) {
      if (await createProduct(prisma, spec.id, categoryIds, product)) productsCreated += 1;
    }
  }

  // Extend the demo store, so its three original products sit in a real range.
  if (options.demoStoreId) {
    const demo = await prisma.store.findUnique({
      where: { id: options.demoStoreId },
      select: { id: true },
    });
    if (demo) {
      const categoryIds = await ensureCategories(prisma, demo.id, [APPAREL, BAGS, WATCHES]);
      for (const product of DEMO_STORE_EXTRA_PRODUCTS) {
        if (await createProduct(prisma, demo.id, categoryIds, product)) productsCreated += 1;
      }
    }
  }

  log(`Catalogue applied: ${storesCreated} stores, ${productsCreated} products created`);
  return { storesCreated, productsCreated };
}
