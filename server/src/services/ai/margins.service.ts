import { PaymentStatus, OrderStatus, ProductStatus, StoreStatus } from '@prisma/client';
import { prisma } from '../../prisma.js';

/**
 * Profit, loss and price position — computed, never estimated.
 *
 * Nexus IQ could already say what a store sold. It could not say whether that
 * was worth doing, which is the question a merchant actually asks, so this
 * adds the two figures that answer it: margin against recorded cost, and where
 * a price sits against the rest of the marketplace.
 *
 * **Unknown cost is reported, not assumed.** `costPrice` is nullable, and a
 * product without one cannot have a margin. Treating a missing cost as zero
 * would turn every such sale into pure profit and report a number that is not
 * merely wrong but flattering, which is the worst direction for a figure a
 * merchant may price against. Every result here therefore carries how much of
 * the revenue it could and could not account for, and the wording the
 * assistant speaks is required to pass that on.
 */

/** Payment states where the money actually moved. */
const PAID_STATES: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.SUCCESS];

/** A cancelled or refunded order is not a sale, whatever it was paid. */
const EXCLUDED_STATES: OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.REFUNDED];

export interface ProductMargin {
  productId: string;
  title: string;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  /** Percent of revenue. Null when this product has no recorded cost. */
  marginPercent: number | null;
  costKnown: boolean;
}

export interface ProfitSummary {
  windowDays: number;
  currency: string;
  orders: number;
  revenue: number;
  /** Cost of the goods whose cost is recorded. */
  cost: number;
  /** Revenue minus cost, across the covered portion only. */
  profit: number;
  marginPercent: number | null;
  /** Revenue from lines whose product has a recorded cost. */
  coveredRevenue: number;
  /** Revenue that could not be costed, and so is excluded from `profit`. */
  uncostedRevenue: number;
  /** 0-1. How much of the revenue the profit figure actually accounts for. */
  coverage: number;
  productsMissingCost: number;
  /** Loss-making products, worst first. */
  lossMakers: ProductMargin[];
  topProfitable: ProductMargin[];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Profit and loss for a store over a window, from its own order lines.
 *
 * Cost comes from the product's `costPrice` *now*, not from what it was on
 * the day of the sale, because Nexus does not snapshot cost onto the order
 * line. That is a real limitation: re-pricing a supplier retroactively
 * restates past margin. It is recorded here rather than hidden because a
 * merchant comparing this against their own books deserves to know why the
 * numbers differ.
 */
export async function computeProfitSummary(
  storeId: string,
  windowDays = 30
): Promise<ProfitSummary> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [store, orders] = await Promise.all([
    prisma.store.findUnique({
      where: { id: storeId },
      select: { settings: { select: { currency: true } } },
    }),
    prisma.order.findMany({
      where: {
        storeId,
        createdAt: { gte: since },
        paymentStatus: { in: PAID_STATES },
        status: { notIn: EXCLUDED_STATES },
      },
      select: {
        id: true,
        items: {
          select: {
            productId: true,
            productTitle: true,
            quantity: true,
            total: true,
            product: { select: { id: true, title: true, costPrice: true } },
          },
        },
      },
    }),
  ]);

  const byProduct = new Map<string, ProductMargin>();
  let revenue = 0;
  let cost = 0;
  let coveredRevenue = 0;
  let uncostedRevenue = 0;

  for (const order of orders) {
    for (const item of order.items) {
      revenue += item.total;

      const unitCost = item.product?.costPrice ?? null;
      const costKnown = unitCost !== null && unitCost !== undefined;
      const lineCost = costKnown ? unitCost! * item.quantity : 0;

      if (costKnown) {
        cost += lineCost;
        coveredRevenue += item.total;
      } else {
        uncostedRevenue += item.total;
      }

      const key = item.productId;
      const existing = byProduct.get(key);
      if (existing) {
        existing.unitsSold += item.quantity;
        existing.revenue += item.total;
        existing.cost += lineCost;
        existing.costKnown = existing.costKnown && costKnown;
      } else {
        byProduct.set(key, {
          productId: key,
          title: item.product?.title ?? item.productTitle,
          unitsSold: item.quantity,
          revenue: item.total,
          cost: lineCost,
          profit: 0,
          marginPercent: null,
          costKnown,
        });
      }
    }
  }

  const products = [...byProduct.values()].map(p => {
    const profit = p.costKnown ? p.revenue - p.cost : 0;
    return {
      ...p,
      revenue: round(p.revenue),
      cost: round(p.cost),
      profit: round(profit),
      marginPercent: p.costKnown && p.revenue > 0 ? round((profit / p.revenue) * 100) : null,
    };
  });

  const costed = products.filter(p => p.costKnown);
  const profit = coveredRevenue - cost;

  return {
    windowDays,
    currency: store?.settings?.currency || 'USD',
    orders: orders.length,
    revenue: round(revenue),
    cost: round(cost),
    profit: round(profit),
    marginPercent: coveredRevenue > 0 ? round((profit / coveredRevenue) * 100) : null,
    coveredRevenue: round(coveredRevenue),
    uncostedRevenue: round(uncostedRevenue),
    coverage: revenue > 0 ? round(coveredRevenue / revenue) : 0,
    productsMissingCost: products.filter(p => !p.costKnown).length,
    lossMakers: costed.filter(p => p.profit < 0).sort((a, b) => a.profit - b.profit).slice(0, 5),
    topProfitable: costed.filter(p => p.profit > 0).sort((a, b) => b.profit - a.profit).slice(0, 5),
  };
}

export interface PriceBenchmark {
  productId: string;
  title: string;
  category: string;
  yourPrice: number;
  /** Null when no other live store sells in this category. */
  marketMedian: number | null;
  marketLow: number | null;
  marketHigh: number | null;
  /** How many other stores' products the comparison is drawn from. */
  sampleSize: number;
  /** Percent above (+) or below (-) the market median. */
  differencePercent: number | null;
  position: 'above' | 'below' | 'in line' | 'unknown';
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Where this store's prices sit against the rest of the marketplace.
 *
 * This is the honest reading of "analyse the market" for a platform with no
 * external price feed: the comparison is against other live Nexus stores
 * selling in the same category, and nothing else. It is a real benchmark
 * because those are real listings a shopper can see beside this merchant's —
 * but it is not the open market, and the wording the assistant speaks says so
 * rather than implying Nexus has been shopping around the wider web.
 *
 * A category with fewer than `MIN_SAMPLE` products elsewhere returns
 * `position: 'unknown'`. A median of two listings is not a market, and
 * reporting one as though it were is how a merchant ends up cutting a price
 * against a single competitor's outlier.
 */
const MIN_SAMPLE = 3;

export async function computePriceBenchmarks(
  storeId: string,
  limit = 10
): Promise<PriceBenchmark[]> {
  const mine = await prisma.product.findMany({
    where: { storeId, status: ProductStatus.ACTIVE },
    select: { id: true, title: true, category: true, price: true },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
  if (mine.length === 0) return [];

  const categories = [...new Set(mine.map(p => p.category))];

  // Everyone else's live listings in those categories, in one query.
  const others = await prisma.product.findMany({
    where: {
      storeId: { not: storeId },
      status: ProductStatus.ACTIVE,
      store: { status: StoreStatus.ACTIVE },
      category: { in: categories },
    },
    select: { category: true, price: true },
  });

  const byCategory = new Map<string, number[]>();
  for (const product of others) {
    const list = byCategory.get(product.category);
    if (list) list.push(product.price);
    else byCategory.set(product.category, [product.price]);
  }

  return mine.map(product => {
    const prices = byCategory.get(product.category) ?? [];

    if (prices.length < MIN_SAMPLE) {
      return {
        productId: product.id,
        title: product.title,
        category: product.category,
        yourPrice: round(product.price),
        marketMedian: null,
        marketLow: null,
        marketHigh: null,
        sampleSize: prices.length,
        differencePercent: null,
        position: 'unknown' as const,
      };
    }

    const mid = median(prices);
    const difference = mid > 0 ? ((product.price - mid) / mid) * 100 : 0;

    return {
      productId: product.id,
      title: product.title,
      category: product.category,
      yourPrice: round(product.price),
      marketMedian: round(mid),
      marketLow: round(Math.min(...prices)),
      marketHigh: round(Math.max(...prices)),
      sampleSize: prices.length,
      differencePercent: round(difference),
      // A 5% band counts as in line: narrower than that reads as noise on a
      // median drawn from a handful of listings.
      position: difference > 5 ? 'above' : difference < -5 ? 'below' : 'in line',
    };
  });
}

/**
 * The margin and price facts, as lines for the assistant's system prompt.
 *
 * Appended to `buildStoreContext`, so a spoken or typed question is answered
 * from the same figures either way.
 */
export async function buildMarginContext(storeId: string): Promise<string[]> {
  const [profit, benchmarks] = await Promise.all([
    computeProfitSummary(storeId),
    computePriceBenchmarks(storeId, 5),
  ]);

  const lines: string[] = [];
  const cur = profit.currency;

  lines.push(`- revenue in the last ${profit.windowDays} days: ${cur} ${profit.revenue}`);

  if (profit.coveredRevenue > 0) {
    const verdict = profit.profit >= 0 ? 'profit' : 'loss';
    lines.push(
      `- gross ${verdict} in the last ${profit.windowDays} days: ${cur} ${Math.abs(profit.profit)} ` +
        `(margin ${profit.marginPercent}% on ${cur} ${profit.coveredRevenue} of costed sales)`
    );
  } else {
    lines.push(
      '- gross profit: cannot be calculated, because no product sold in this ' +
        'window has a cost price recorded'
    );
  }

  if (profit.uncostedRevenue > 0) {
    lines.push(
      `- NOT included in that profit figure: ${cur} ${profit.uncostedRevenue} of revenue from ` +
        `${profit.productsMissingCost} product(s) with no cost price recorded ` +
        `(coverage ${Math.round(profit.coverage * 100)}% of revenue)`
    );
  }

  for (const loser of profit.lossMakers) {
    lines.push(
      `- selling at a loss: ${loser.title}, ${cur} ${Math.abs(loser.profit)} lost on ` +
        `${loser.unitsSold} unit(s), margin ${loser.marginPercent}%`
    );
  }
  for (const winner of profit.topProfitable.slice(0, 3)) {
    lines.push(
      `- most profitable: ${winner.title}, ${cur} ${winner.profit} profit, margin ${winner.marginPercent}%`
    );
  }

  for (const b of benchmarks) {
    if (b.position === 'unknown') {
      lines.push(
        `- price of ${b.title}: ${cur} ${b.yourPrice}; no market comparison, only ` +
          `${b.sampleSize} comparable listing(s) in ${b.category} on Nexus`
      );
    } else {
      lines.push(
        `- price of ${b.title}: ${cur} ${b.yourPrice}, ${b.position} the Nexus median of ` +
          `${cur} ${b.marketMedian} for ${b.category} (${b.differencePercent}%, ` +
          `range ${cur} ${b.marketLow}-${b.marketHigh}, ${b.sampleSize} listings from other stores)`
      );
    }
  }

  return lines;
}
