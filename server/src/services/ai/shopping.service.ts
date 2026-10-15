import { ProductStatus, StoreStatus, Prisma } from '@prisma/client';
import { prisma } from '../../prisma.js';

/**
 * The catalogue, as the shopping assistant sees it.
 *
 * Every product the assistant mentions is read from the database here. It
 * never describes an item from memory and never invents a price: the shopper
 * is about to be asked to buy the thing, so what they are told it costs has to
 * be the row the order will be priced from.
 *
 * The selection rules are also the security boundary, exactly as in
 * `marketplace.controller.ts`: only ACTIVE products in ACTIVE stores, and only
 * the fields a shopper is meant to see. Cost price never leaves.
 */

export interface ShopProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  comparePrice: number | null;
  sku: string;
  category: string;
  image: string | null;
  inStock: boolean;
  availableStock: number;
  rating: { average: number; count: number };
  store: { id: string; name: string; handle: string };
  variants: {
    id: string;
    title: string;
    sku: string;
    price: number;
    inventoryQuantity: number;
  }[];
}

const PUBLIC_WHERE = {
  status: ProductStatus.ACTIVE,
  store: { status: StoreStatus.ACTIVE },
};

const INCLUDE = {
  images: { orderBy: { position: 'asc' } },
  variants: { orderBy: { price: 'asc' } },
  inventoryItems: true,
  store: { select: { id: true, name: true, domain: true, settings: { select: { storeUrl: true } } } },
} as const;

function toShopProduct(p: any): ShopProduct {
  const primary = p.images.find((i: any) => i.isPrimary) || p.images[0];
  const stock =
    p.inventoryItems.reduce((acc: number, i: any) => acc + i.availableStock, 0) +
    p.variants.reduce((acc: number, v: any) => acc + v.inventoryQuantity, 0);

  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    price: p.price,
    comparePrice: p.comparePrice,
    sku: p.sku,
    category: p.category,
    image: primary?.url ?? null,
    inStock: stock > 0 || p.inventoryPolicy === 'CONTINUE',
    availableStock: stock,
    rating: { average: p.ratingAverage ?? 0, count: p.ratingCount ?? 0 },
    store: {
      id: p.store.id,
      name: p.store.name,
      handle: p.store.settings?.storeUrl || p.store.domain?.split('.')[0] || p.store.id,
    },
    variants: p.variants.map((v: any) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      price: v.price,
      inventoryQuantity: v.inventoryQuantity,
    })),
  };
}

export interface SearchOptions {
  maxPrice?: number;
  limit?: number;
}

/**
 * What a search actually did, not just what it returned.
 *
 * The assistant speaks these results aloud, so it has to be able to say *how*
 * it matched. Returning a bare list is what let it answer "find me a white
 * wristwatch" with a lounge chair, a vase and a moisturiser, announced as
 * "3 that could match": nothing matched both words, the old fallback ORed the
 * terms, and the word "white" appears in those three descriptions. Three
 * products matched on one adjective in body text and were presented as if
 * they were watches.
 */
export interface SearchOutcome {
  results: ShopProduct[];
  /** True when every term matched. Anything else needs explaining out loud. */
  exact: boolean;
  /** Terms that had to be given up to find anything at all. */
  dropped: string[];
  /** Terms the catalogue only knew under another word: wristwatch → watch. */
  relaxed: { from: string; to: string }[];
}

/** Matches a term anywhere a shopper might expect it to. */
function fieldMatch(term: string): Prisma.ProductWhereInput {
  return {
    OR: [
      { title: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { category: { contains: term, mode: 'insensitive' } },
    ],
  };
}

/**
 * Matches a term where it names the thing, rather than merely mentioning it.
 *
 * This is the distinction the old search was missing. A chair whose
 * description says "white oak" is not a white thing a shopper asked for by
 * name; a product called "Minimal Dress Watch" is. At least one surviving term
 * has to match here, or the result is not offered at all.
 */
function namingMatch(term: string): Prisma.ProductWhereInput {
  return {
    OR: [
      { title: { contains: term, mode: 'insensitive' } },
      { category: { contains: term, mode: 'insensitive' } },
    ],
  };
}

/**
 * Compound words the catalogue spells shorter.
 *
 * "wristwatch" never matched "Dive Watch" because the containment runs the
 * wrong way: the catalogue word is inside the spoken one, not the reverse. So
 * a shopper asking for a wristwatch was told there were none, while four sat
 * in the catalogue. Suffixes of five characters or more only, and only against
 * a title or a category, so this cannot invent a match out of a fragment.
 */
async function relaxCompound(term: string): Promise<string | null> {
  if (term.length < 7) return null;

  for (let cut = 1; cut <= term.length - 5; cut++) {
    const suffix = term.slice(cut);
    const hit = await prisma.product.findFirst({
      where: { ...PUBLIC_WHERE, ...namingMatch(suffix) },
      select: { id: true },
    });
    if (hit) return suffix;
  }
  return null;
}

/**
 * Find products matching a spoken phrase.
 *
 * A transcript is not a search box: "a warm wool jumper for winter" has no
 * exact match anywhere. So the terms are tried together, then relaxed, then
 * given up one at a time — least important first — and whatever had to be
 * abandoned is reported so the assistant can say so rather than quietly
 * answering a different question.
 *
 * Postgres full-text search would be the better tool and is not reachable
 * through Prisma's portable API here; this stays honest about being a token
 * match rather than pretending to rank by relevance it has not computed.
 */
export async function searchCatalogue(
  query: string,
  options: SearchOptions = {}
): Promise<SearchOutcome> {
  const limit = options.limit ?? 5;
  const original = query
    .split(/\s+/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 2);

  const empty: SearchOutcome = { results: [], exact: false, dropped: [], relaxed: [] };
  if (original.length === 0) return empty;

  const priceFilter = options.maxPrice ? { price: { lte: options.maxPrice } } : {};

  const find = (where: Prisma.ProductWhereInput) =>
    prisma.product.findMany({
      where: { ...PUBLIC_WHERE, ...priceFilter, ...where },
      include: INCLUDE,
      take: limit,
      orderBy: [{ ratingCount: 'desc' }, { ratingAverage: 'desc' }],
    });

  // 1. Every term present. What the shopper actually asked for.
  const strict = await find({ AND: original.map(fieldMatch) });
  if (strict.length > 0) {
    return { results: strict.map(toShopProduct), exact: true, dropped: [], relaxed: [] };
  }

  // 2. Teach the unmatched compounds their catalogue spelling, then try again.
  const relaxed: { from: string; to: string }[] = [];
  const terms: string[] = [];
  for (const term of original) {
    const named = await prisma.product.findFirst({
      where: { ...PUBLIC_WHERE, ...fieldMatch(term) },
      select: { id: true },
    });
    if (named) {
      terms.push(term);
      continue;
    }
    const shorter = await relaxCompound(term);
    if (shorter) {
      relaxed.push({ from: term, to: shorter });
      terms.push(shorter);
    } else {
      terms.push(term);
    }
  }

  if (relaxed.length > 0) {
    const retry = await find({ AND: terms.map(fieldMatch) });
    if (retry.length > 0) {
      return { results: retry.map(toShopProduct), exact: false, dropped: [], relaxed };
    }
  }

  /*
   * 3. Give terms up, least important first.
   *
   * Importance is "does this word name a product" — a term found in a title or
   * a category outranks one that only ever appears in body text, and a longer
   * word outranks a shorter one. For "white wristwatch" that drops "white",
   * because four products are called a Watch and none is called white, which
   * is how the shopper ends up hearing about watches instead of a chair.
   */
  const ranked = await Promise.all(
    terms.map(async term => ({
      term,
      names: await prisma.product.count({ where: { ...PUBLIC_WHERE, ...namingMatch(term) } }),
    }))
  );
  ranked.sort((a, b) => {
    if (a.names > 0 !== b.names > 0) return a.names > 0 ? -1 : 1;
    return b.term.length - a.term.length;
  });

  for (let keep = ranked.length - 1; keep >= 1; keep--) {
    const surviving = ranked.slice(0, keep).map(r => r.term);

    // The quality bar: whatever is left must name a product, not merely be
    // mentioned inside one. Without this, a single common adjective matched in
    // body text is enough to return anything at all.
    const hits = await find({
      AND: [...surviving.map(fieldMatch), { OR: surviving.map(namingMatch) }],
    });

    if (hits.length > 0) {
      return {
        results: hits.map(toShopProduct),
        exact: false,
        dropped: ranked.slice(keep).map(r => r.term),
        relaxed,
      };
    }
  }

  // Nothing cleared the bar. Saying so is the honest answer, and a better one
  // than three products that happen to share an adjective.
  return { results: [], exact: false, dropped: [], relaxed };
}

export async function getShopProduct(productId: string): Promise<ShopProduct | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, ...PUBLIC_WHERE },
    include: INCLUDE,
  });
  return product ? toShopProduct(product) : null;
}

/**
 * Money, as a sentence.
 *
 * The assistant speaks its replies, and "£1234.5" is read aloud as a string of
 * digits. Rounded to whole currency units where it is exact, because "twelve
 * pounds" is what a person says and "twelve pounds zero zero" is not.
 */
export function spokenPrice(amount: number, currency = 'USD'): string {
  const symbol = currency === 'NGN' ? '₦' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? `${symbol}${rounded}` : `${symbol}${rounded.toFixed(2)}`;
}

/** Read a short list the way a person would say it. */
export function spokenList(items: string[]): string {
  if (items.length === 0) return 'nothing';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
