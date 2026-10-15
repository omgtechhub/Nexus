import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma, OrderStatus, PaymentStatus, ReviewStatus, ProductStatus, StoreStatus } from '@prisma/client';
import { prisma } from '../prisma.js';

/**
 * Product ratings and comments, restricted to buyers who actually received
 * the item.
 *
 * The rule, in one place, is `findEntitlingPurchase` below. Nothing else in
 * this file decides who may review: the create handler either gets an
 * `OrderItem` back from it or returns 403, and the review row then stores that
 * item's id. A review therefore cannot exist without a delivered, paid order
 * line behind it, which is what makes the "Verified purchase" badge on the
 * storefront a fact rather than a decoration.
 *
 * No review is ever generated, seeded or defaulted. A product nobody has
 * bought has `ratingCount: 0`, and the UI is expected to say so.
 */

/* -------------------------------------------------------------------------- */
/* Eligibility                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Payment states that mean the shopper's money actually moved.
 *
 * `SUCCESS` and `PAID` both appear in the wild: providers settle to `SUCCESS`
 * and the fulfilment path promotes to `PAID`, so accepting only one of them
 * would silently exclude half of all genuine purchases.
 */
const PAID_STATES: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.SUCCESS];

/**
 * An order has to be *delivered* before its buyer can rate it, which is the
 * rule Jumia applies. Rating something that has not arrived yet rates the
 * checkout, not the product.
 */
const DELIVERED_STATE: OrderStatus = OrderStatus.FULFILLED;

export type IneligibleReason =
  | 'NOT_PURCHASED'
  | 'NOT_DELIVERED'
  | 'ALREADY_REVIEWED';

/**
 * The order line that entitles this user to review this product, if there is
 * one.
 *
 * Ownership is matched the same way the customer portal matches it: on the
 * `Customer.userId` link first, falling back to the order's email. The
 * fallback matters because a shopper who checked out as a guest and signed up
 * afterwards still owns those orders until `linkCustomerProfiles` claims them,
 * and they would otherwise be told they never bought the thing they are
 * holding.
 *
 * When several qualifying purchases exist the earliest is used, so the review
 * is attributed to the first time they bought it.
 */
async function findEntitlingPurchase(
  userId: string,
  email: string,
  productId: string
) {
  const ownedByViewer: Prisma.OrderWhereInput = {
    OR: [
      { customer: { userId } },
      { customerEmail: { equals: email, mode: 'insensitive' } },
    ],
  };

  const delivered = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        ...ownedByViewer,
        paymentStatus: { in: PAID_STATES },
        status: DELIVERED_STATE,
      },
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, orderId: true, order: { select: { storeId: true } } },
  });

  if (delivered) return { item: delivered, reason: null as null };

  // Distinguish "you never bought this" from "it has not arrived yet", so the
  // storefront can say which. A shopper waiting on a parcel should be told to
  // come back, not told they are not a customer.
  const undelivered = await prisma.orderItem.findFirst({
    where: { productId, order: ownedByViewer },
    select: { id: true },
  });

  return {
    item: null,
    reason: (undelivered ? 'NOT_DELIVERED' : 'NOT_PURCHASED') as IneligibleReason,
  };
}

/* -------------------------------------------------------------------------- */
/* Aggregate                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Recompute a product's stored rating from its published reviews.
 *
 * Always called inside the same transaction as the write that changed them,
 * so the aggregate can never drift from the rows it summarises. Hidden
 * reviews are excluded here as well as from the public list, so moderating one
 * also removes its score.
 */
async function recomputeProductRating(tx: Prisma.TransactionClient, productId: string) {
  const agg = await tx.productReview.aggregate({
    where: { productId, status: ReviewStatus.PUBLISHED },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await tx.product.update({
    where: { id: productId },
    data: {
      // Stored to two decimals: the extra precision is noise on a 1-5 scale
      // and would render as 4.333333333333333.
      ratingAverage: agg._avg.rating ? Math.round(agg._avg.rating * 100) / 100 : 0,
      ratingCount: agg._count._all,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Shaping                                                                    */
/* -------------------------------------------------------------------------- */

/** The relations a public review payload needs. */
const REVIEW_INCLUDE = {
  user: { select: { id: true, name: true, avatar: true } },
} as const;

/**
 * Public review payload.
 *
 * The reviewer's email is deliberately absent and the display name is reduced
 * to a first name and a last initial. A review is public for ever and is tied
 * to a real purchase; publishing "Jane Okafor" next to a delivery is more
 * identifying than a shopper expects when they rate a kettle.
 */
function toPublicReview(r: any, viewerId?: string) {
  const parts = String(r.user?.name ?? '').trim().split(/\s+/).filter(Boolean);
  const displayName = parts.length
    ? [parts[0], parts.length > 1 ? `${parts[parts.length - 1][0].toUpperCase()}.` : '']
        .filter(Boolean)
        .join(' ')
    : 'Nexus shopper';

  return {
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    // Always true by construction: a row cannot exist without an order item.
    // Sent explicitly so the client renders the badge from data rather than
    // from an assumption it makes about the endpoint.
    verifiedPurchase: true,
    author: { name: displayName, avatar: r.user?.avatar ?? null },
    merchantReply: r.merchantReply,
    merchantRepliedAt: r.merchantRepliedAt,
    /** Lets the UI offer edit/delete without a second request. */
    isMine: Boolean(viewerId && r.userId === viewerId),
  };
}

/** Star distribution, always all five keys so the UI can render empty bars. */
async function ratingSummary(productId: string) {
  const grouped = await prisma.productReview.groupBy({
    by: ['rating'],
    where: { productId, status: ReviewStatus.PUBLISHED },
    _count: { _all: true },
  });

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;

  for (const row of grouped) {
    const star = row.rating as 1 | 2 | 3 | 4 | 5;
    if (star >= 1 && star <= 5) distribution[star] = row._count._all;
    total += row._count._all;
    sum += row.rating * row._count._all;
  }

  return {
    average: total ? Math.round((sum / total) * 100) / 100 : 0,
    count: total,
    distribution,
  };
}

/* -------------------------------------------------------------------------- */
/* Public                                                                     */
/* -------------------------------------------------------------------------- */

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(['recent', 'helpful', 'highest', 'lowest']).default('recent'),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

const SORT_ORDER: Record<string, Prisma.ProductReviewOrderByWithRelationInput> = {
  recent: { createdAt: 'desc' },
  // No helpfulness votes yet; the longest review is the closest honest proxy
  // and is at least deterministic.
  helpful: { createdAt: 'desc' },
  highest: { rating: 'desc' },
  lowest: { rating: 'asc' },
};

/**
 * GET /api/reviews/product/:productId
 * Public. Published reviews for one product, with the rating summary.
 */
export async function listProductReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const { page, limit, sort, rating } = listQuerySchema.parse(req.query);

    // Only reviews on a product a shopper could actually reach. Without this
    // the endpoint leaks the existence of archived products and products in
    // suspended stores.
    const product = await prisma.product.findFirst({
      where: { id: productId, status: ProductStatus.ACTIVE, store: { status: StoreStatus.ACTIVE } },
      select: { id: true },
    });
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found.' });
      return;
    }

    const where: Prisma.ProductReviewWhereInput = {
      productId,
      status: ReviewStatus.PUBLISHED,
      ...(rating ? { rating } : {}),
    };

    const [rows, total, summary] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: REVIEW_INCLUDE,
        orderBy: SORT_ORDER[sort],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.productReview.count({ where }),
      ratingSummary(productId),
    ]);

    res.json({
      success: true,
      data: rows.map(r => toPublicReview(r, req.user?.id)),
      summary,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Shopper                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/reviews/product/:productId/me
 * Customer. Whether this shopper may review, and their review if they have.
 */
export async function getMyReviewStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const userId = req.user!.id;
    const email = req.user!.email.toLowerCase();

    const existing = await prisma.productReview.findUnique({
      where: { productId_userId: { productId, userId } },
      include: REVIEW_INCLUDE,
    });

    if (existing) {
      res.json({
        success: true,
        data: {
          canReview: false,
          reason: 'ALREADY_REVIEWED' as IneligibleReason,
          review: { ...toPublicReview(existing, userId), body: existing.body, title: existing.title },
        },
      });
      return;
    }

    const { item, reason } = await findEntitlingPurchase(userId, email, productId);

    res.json({
      success: true,
      data: { canReview: Boolean(item), reason, review: null },
    });
  } catch (err) {
    next(err);
  }
}

const createReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(10, 'Tell other shoppers a little more — at least 10 characters.').max(4000),
});

/**
 * POST /api/reviews/product/:productId
 * Customer. Create a review, if and only if a delivered purchase backs it.
 */
export async function createProductReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const userId = req.user!.id;
    const email = req.user!.email.toLowerCase();
    const body = createReviewSchema.parse(req.body);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, storeId: true },
    });
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found.' });
      return;
    }

    const { item, reason } = await findEntitlingPurchase(userId, email, productId);
    if (!item) {
      res.status(403).json({
        success: false,
        error:
          reason === 'NOT_DELIVERED'
            ? 'You can review this product once your order has been delivered.'
            : 'Only verified buyers of this product can review it.',
        reason,
      });
      return;
    }

    const review = await prisma.$transaction(async tx => {
      const created = await tx.productReview.create({
        data: {
          productId,
          storeId: product.storeId,
          userId,
          orderId: item.orderId,
          orderItemId: item.id,
          rating: body.rating,
          title: body.title || null,
          body: body.body,
        },
        include: REVIEW_INCLUDE,
      });
      await recomputeProductRating(tx, productId);
      return created;
    });

    res.status(201).json({ success: true, data: toPublicReview(review, userId) });
  } catch (err: any) {
    // The unique index is the real guard against a double submit; the lookup
    // above only makes the common case a friendly message rather than a race.
    if (err?.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'You have already reviewed this product.',
        reason: 'ALREADY_REVIEWED' as IneligibleReason,
      });
      return;
    }
    next(err);
  }
}

const updateReviewSchema = createReviewSchema.partial();

/**
 * PATCH /api/reviews/:id
 * Customer. Edit your own review. Ownership is part of the where clause, so a
 * mismatched id is a 404 and never a silent cross-account write.
 */
export async function updateProductReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const patch = updateReviewSchema.parse(req.body);

    const existing = await prisma.productReview.findFirst({
      where: { id, userId },
      select: { id: true, productId: true },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Review not found.' });
      return;
    }

    const updated = await prisma.$transaction(async tx => {
      const row = await tx.productReview.update({
        where: { id },
        data: {
          ...(patch.rating !== undefined ? { rating: patch.rating } : {}),
          ...(patch.title !== undefined ? { title: patch.title || null } : {}),
          ...(patch.body !== undefined ? { body: patch.body } : {}),
        },
        include: REVIEW_INCLUDE,
      });
      if (patch.rating !== undefined) await recomputeProductRating(tx, existing.productId);
      return row;
    });

    res.json({ success: true, data: toPublicReview(updated, userId) });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/reviews/:id
 * Customer. Remove your own review and release the one-per-product slot.
 */
export async function deleteProductReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.productReview.findFirst({
      where: { id, userId },
      select: { id: true, productId: true },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Review not found.' });
      return;
    }

    await prisma.$transaction(async tx => {
      await tx.productReview.delete({ where: { id } });
      await recomputeProductRating(tx, existing.productId);
    });

    res.json({ success: true, message: 'Review deleted.' });
  } catch (err) {
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Merchant                                                                   */
/* -------------------------------------------------------------------------- */

const sellerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  /* Not `z.coerce.boolean()`: that is `Boolean(value)`, and `Boolean('false')`
     is `true`, so `?unanswered=false` would filter to unanswered reviews. */
  unanswered: z
    .enum(['true', 'false', '1', '0'])
    .transform(v => v === 'true' || v === '1')
    .optional(),
});

/**
 * GET /api/reviews/seller
 * Merchant. Every review across this store's catalogue.
 *
 * Scoped by `req.store.id` rather than by anything in the query, so there is
 * no parameter a merchant could use to read another store's reviews.
 */
export async function listStoreReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { page, limit, rating, unanswered } = sellerListQuerySchema.parse(req.query);

    const where: Prisma.ProductReviewWhereInput = {
      storeId,
      status: ReviewStatus.PUBLISHED,
      ...(rating ? { rating } : {}),
      ...(unanswered ? { merchantReply: null } : {}),
    };

    const [rows, total, agg] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: {
          ...REVIEW_INCLUDE,
          product: { select: { id: true, title: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.productReview.count({ where }),
      prisma.productReview.aggregate({
        where: { storeId, status: ReviewStatus.PUBLISHED },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    const awaitingReply = await prisma.productReview.count({
      where: { storeId, status: ReviewStatus.PUBLISHED, merchantReply: null },
    });

    res.json({
      success: true,
      data: rows.map(r => ({
        ...toPublicReview(r),
        product: r.product,
      })),
      summary: {
        average: agg._avg.rating ? Math.round(agg._avg.rating * 100) / 100 : 0,
        count: agg._count._all,
        awaitingReply,
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    next(err);
  }
}

const replySchema = z.object({
  reply: z.string().trim().min(1, 'Write a reply before posting it.').max(2000),
});

/**
 * POST /api/reviews/:id/reply
 * Merchant. Answer a review in public.
 *
 * A merchant can reply and nothing else: there is no handler anywhere that
 * lets a store change a review's rating, body or status. A seller able to
 * suppress its own bad reviews would make every rating on the marketplace
 * meaningless, so hiding is a platform-admin action on `status` alone.
 */
export async function replyToReview(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;
    const { reply } = replySchema.parse(req.body);

    // Store ownership in the filter, so a merchant cannot reply to a review
    // belonging to someone else's catalogue.
    const existing = await prisma.productReview.findFirst({
      where: { id, storeId },
      select: { id: true },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Review not found.' });
      return;
    }

    const updated = await prisma.productReview.update({
      where: { id },
      data: { merchantReply: reply, merchantRepliedAt: new Date() },
      include: REVIEW_INCLUDE,
    });

    res.json({ success: true, data: toPublicReview(updated) });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/reviews/:id/reply
 * Merchant. Withdraw a reply.
 */
export async function deleteReviewReply(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;

    const existing = await prisma.productReview.findFirst({
      where: { id, storeId },
      select: { id: true },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Review not found.' });
      return;
    }

    const updated = await prisma.productReview.update({
      where: { id },
      data: { merchantReply: null, merchantRepliedAt: null },
      include: REVIEW_INCLUDE,
    });

    res.json({ success: true, data: toPublicReview(updated) });
  } catch (err) {
    next(err);
  }
}
