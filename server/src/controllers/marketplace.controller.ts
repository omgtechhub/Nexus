import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { ProductStatus, StoreStatus } from '@prisma/client';

/**
 * The marketplace catalogue: every published product across every live store.
 *
 * The per-store storefront (`storefront.controller.ts`) answers what one
 * merchant sells. This answers what anyone can buy on Nexus, which is what the
 * public homepage needs. The two deliberately return the same product shape, so
 * the frontend keeps one product type and one product card.
 *
 * Everything here is unauthenticated, so the selection rules are the security
 * boundary: only ACTIVE products, only in ACTIVE stores, and only the store
 * fields a shopper is meant to see (id, display name, public handle). Owner
 * identity, contact details, cost prices and settings never leave.
 */

/** The relations needed to build a public product payload. */
const PRODUCT_INCLUDE = {
  variants: { orderBy: { price: 'asc' } },
  images: { orderBy: { position: 'asc' } },
  inventoryItems: true,
  store: { select: { id: true, name: true, domain: true, settings: { select: { storeUrl: true } } } },
} as const;

/** Only published products belonging to a live store are purchasable. */
const PUBLIC_PRODUCT_WHERE = {
  status: ProductStatus.ACTIVE,
  store: { status: StoreStatus.ACTIVE },
};

/**
 * Public product payload. Mirrors the per-store storefront shape and adds the
 * selling store, because a marketplace card has to say who the buyer is buying
 * from.
 *
 * `costPrice` exists on the row and is deliberately absent here: it is the
 * merchant's margin, not shopper-facing.
 */
function toPublicProduct(p: any) {
  const primaryImg = p.images.find((img: any) => img.isPrimary) || p.images[0];
  const totalStock =
    p.inventoryItems.reduce((acc: number, item: any) => acc + item.availableStock, 0) +
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
    tags: p.tags,
    images: p.images.map((img: any) => img.url),
    primaryImage: primaryImg ? primaryImg.url : undefined,
    inStock: totalStock > 0 || p.inventoryPolicy === 'CONTINUE',
    availableStock: totalStock,
    createdAt: p.createdAt,
    /* Read straight off the row. These are maintained by the review
       endpoints inside the same transaction as the review itself, so a card
       can show stars without a per-product aggregate query. A product nobody
       has reviewed reports 0/0, and the card is expected to render "No
       reviews yet" rather than an empty five-star run. */
    rating: { average: p.ratingAverage ?? 0, count: p.ratingCount ?? 0 },
    store: p.store
      ? {
          id: p.store.id,
          name: p.store.name,
          handle: p.store.settings?.storeUrl || p.store.domain.split('.')[0] || p.store.id,
        }
      : undefined,
    variants: p.variants.map((v: any) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      price: v.price,
      comparePrice: v.comparePrice,
      option1: v.option1,
      option2: v.option2,
      option3: v.option3,
      inventoryQuantity: v.inventoryQuantity,
    })),
  };
}

/**
 * Public: cross-store product listing with search, category, price range,
 * sorting and pagination.
 */
export async function getMarketplaceProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      q,
      category,
      storeId,
      sort = 'newest',
      page = '1',
      limit = '24',
      minPrice,
      maxPrice,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(48, Math.max(1, parseInt(limit as string, 10) || 24));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { ...PUBLIC_PRODUCT_WHERE };

    if (category && category !== 'all') {
      where.category = { equals: category as string, mode: 'insensitive' };
    }

    if (storeId) {
      where.storeId = storeId as string;
    }

    if (q) {
      const term = (q as string).trim();
      if (term) {
        where.OR = [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { category: { contains: term, mode: 'insensitive' } },
        ];
      }
    }

    const min = minPrice !== undefined ? parseFloat(minPrice as string) : NaN;
    const max = maxPrice !== undefined ? parseFloat(maxPrice as string) : NaN;
    if (!Number.isNaN(min) || !Number.isNaN(max)) {
      where.price = {
        ...(Number.isNaN(min) ? {} : { gte: min }),
        ...(Number.isNaN(max) ? {} : { lte: max }),
      };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    if (sort === 'price_desc') orderBy = { price: 'desc' };
    if (sort === 'title_asc') orderBy = { title: 'asc' };
    /* Best rated first, then by how many reviews back that rating, so a
       lone 5-star review does not outrank a product with fifty of them. */
    if (sort === 'rating_desc') orderBy = [{ ratingAverage: 'desc' }, { ratingCount: 'desc' }];

    const [totalCount, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: PRODUCT_INCLUDE as any,
      }),
    ]);

    return res.json({
      products: products.map(toPublicProduct),
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public: the categories that actually have something for sale, with counts.
 *
 * Grouped over the live product set rather than over the per-store
 * `ProductCategory` table, so a category never appears with nothing behind it.
 */
export async function getMarketplaceCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const grouped = await prisma.product.groupBy({
      by: ['category'],
      where: PUBLIC_PRODUCT_WHERE as any,
      _count: { _all: true },
      orderBy: { _count: { category: 'desc' } },
      take: 24,
    });

    return res.json({
      categories: grouped
        .filter((g) => Boolean(g.category))
        .map((g) => ({ name: g.category, productCount: g._count._all })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public: the homepage payload.
 *
 * Every section is derived from data that exists. There is no `featured` column
 * on Product, so nothing here claims to be hand-picked:
 *  - `newArrivals` is recency.
 *  - `deals` are products whose own `comparePrice` sits above their price.
 *  - `bestsellers` come from summed `OrderItem.quantity`, so they are real
 *    sales, and the array is simply empty until the marketplace has sold
 *    something.
 */
export async function getMarketplaceHome(_req: Request, res: Response, next: NextFunction) {
  try {
    const [newArrivals, dealCandidates, topSellers, categories] = await Promise.all([
      prisma.product.findMany({
        where: PUBLIC_PRODUCT_WHERE as any,
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: PRODUCT_INCLUDE as any,
      }),
      prisma.product.findMany({
        where: { ...PUBLIC_PRODUCT_WHERE, comparePrice: { not: null } } as any,
        orderBy: { updatedAt: 'desc' },
        take: 32,
        include: PRODUCT_INCLUDE as any,
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 40,
      }),
      prisma.product.groupBy({
        by: ['category'],
        where: PUBLIC_PRODUCT_WHERE as any,
        _count: { _all: true },
        orderBy: { _count: { category: 'desc' } },
        take: 12,
      }),
    ]);

    // A product that sold may since have been archived, or its store
    // deactivated, so the ids go back through the public rules before being
    // returned.
    const sellerIds = topSellers.map((t) => t.productId).filter(Boolean) as string[];
    const bestsellerRows = sellerIds.length
      ? await prisma.product.findMany({
          where: { ...PUBLIC_PRODUCT_WHERE, id: { in: sellerIds } } as any,
          include: PRODUCT_INCLUDE as any,
        })
      : [];

    const soldBy = new Map(topSellers.map((t) => [t.productId, t._sum.quantity || 0]));
    const bestsellers = bestsellerRows
      .sort((a, b) => (soldBy.get(b.id) || 0) - (soldBy.get(a.id) || 0))
      .slice(0, 8)
      .map((p) => ({ ...toPublicProduct(p), unitsSold: soldBy.get(p.id) || 0 }));

    return res.json({
      newArrivals: newArrivals.map(toPublicProduct),
      // comparePrice is nullable but not necessarily *above* price, so the
      // discount is confirmed here rather than claimed by the query.
      deals: dealCandidates
        .map(toPublicProduct)
        .filter((p) => typeof p.comparePrice === 'number' && p.comparePrice > p.price)
        .slice(0, 8),
      bestsellers,
      categories: categories
        .filter((g) => Boolean(g.category))
        .map((g) => ({ name: g.category, productCount: g._count._all })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public: one product, addressed by its store and slug.
 *
 * `(storeId, slug)` is the product's unique key in the schema, so the pair is
 * the natural public address and no new column is needed.
 */
export async function getMarketplaceProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeId, productSlug } = req.params;

    const product = await prisma.product.findFirst({
      where: { ...PUBLIC_PRODUCT_WHERE, storeId, slug: productSlug } as any,
      include: PRODUCT_INCLUDE as any,
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const related = await prisma.product.findMany({
      where: {
        ...PUBLIC_PRODUCT_WHERE,
        category: product.category,
        id: { not: product.id },
      } as any,
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: PRODUCT_INCLUDE as any,
    });

    return res.json({
      product: toPublicProduct(product),
      related: related.map(toPublicProduct),
    });
  } catch (error) {
    next(error);
  }
}
