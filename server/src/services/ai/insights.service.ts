import { prisma } from '../../prisma.js';
import { AiInsightKind, AiInsightStatus, AiUsageKind, OrderStatus, PaymentStatus, FulfillmentStatus } from '@prisma/client';
import { getAiProvider, InsightDraft } from './index.js';
import { recordUsage } from './usage.service.js';
import { logger } from '../../utils/logger.js';
import { buildMarginContext } from './margins.service.js';

const WINDOW_DAYS = 30;

/**
 * Computes what is true about a store, from the store's own tables.
 *
 * This is the half of Nexus IQ that does not depend on a model. Each draft
 * carries the figures it was derived from, and those figures are stored with the
 * insight so a merchant can check any claim rather than take it on trust. The
 * provider is handed these drafts afterwards and may only phrase them.
 */
export async function computeInsightDrafts(storeId: string): Promise<InsightDraft[]> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 2 * WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [productCount, inventory, unfulfilled, currentOrders, previousOrders, settings] =
    await Promise.all([
      prisma.product.count({ where: { storeId } }),
      prisma.inventoryItem.findMany({
        where: { storeId },
        include: { product: { select: { title: true } } },
      }),
      prisma.order.findMany({
        where: {
          storeId,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.SUCCESS] },
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
        },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.order.findMany({
        where: {
          storeId,
          createdAt: { gte: windowStart },
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
        },
        select: { total: true, items: { select: { productTitle: true, quantity: true } } },
      }),
      prisma.order.findMany({
        where: {
          storeId,
          createdAt: { gte: previousStart, lt: windowStart },
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
        },
        select: { total: true },
      }),
      prisma.storeSettings.findUnique({ where: { storeId }, select: { currency: true } }),
    ]);

  const drafts: InsightDraft[] = [];
  const currency = (settings?.currency || 'USD').split(' ')[0];

  if (productCount === 0) {
    // Nothing else is worth saying about a store with no catalogue.
    return [{ kind: 'NO_PRODUCTS', severity: 'CRITICAL', evidence: { productCount: 0 } }];
  }

  const outOfStock = inventory.filter(i => i.availableStock <= 0);
  if (outOfStock.length > 0) {
    drafts.push({
      kind: 'OUT_OF_STOCK',
      severity: 'CRITICAL',
      evidence: {
        count: outOfStock.length,
        examples: outOfStock.slice(0, 3).map(i => i.product?.title ?? i.sku),
      },
    });
  }

  const lowStock = inventory.filter(
    i => i.availableStock > 0 && i.availableStock <= i.lowStockThreshold
  );
  if (lowStock.length > 0) {
    drafts.push({
      kind: 'LOW_STOCK',
      severity: 'WARNING',
      evidence: {
        count: lowStock.length,
        examples: lowStock.slice(0, 3).map(i => i.product?.title ?? i.sku),
      },
    });
  }

  if (unfulfilled.length > 0) {
    const oldest = unfulfilled[0];
    const oldestDays = Math.floor((now.getTime() - oldest.createdAt.getTime()) / 86_400_000);
    drafts.push({
      kind: 'UNFULFILLED_ORDERS',
      severity: oldestDays >= 3 ? 'CRITICAL' : 'WARNING',
      evidence: { count: unfulfilled.length, oldestDays },
    });
  }

  const currentRevenue = round(currentOrders.reduce((sum, o) => sum + o.total, 0));
  const previousRevenue = round(previousOrders.reduce((sum, o) => sum + o.total, 0));
  if (currentOrders.length > 0 || previousOrders.length > 0) {
    drafts.push({
      kind: 'REVENUE_TREND',
      severity: 'INFO',
      evidence: {
        windowDays: WINDOW_DAYS,
        currency,
        currentPeriodRevenue: currentRevenue,
        previousPeriodRevenue: previousRevenue,
        currentPeriodOrders: currentOrders.length,
        previousPeriodOrders: previousOrders.length,
        changePercent:
          previousRevenue === 0
            ? 0
            : round(((currentRevenue - previousRevenue) / previousRevenue) * 100),
      },
    });
  }

  const unitsByProduct = new Map<string, number>();
  for (const order of currentOrders) {
    for (const item of order.items) {
      unitsByProduct.set(
        item.productTitle,
        (unitsByProduct.get(item.productTitle) ?? 0) + item.quantity
      );
    }
  }
  const ranked = [...unitsByProduct.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length > 0) {
    drafts.push({
      kind: 'TOP_PRODUCTS',
      severity: 'INFO',
      evidence: {
        windowDays: WINDOW_DAYS,
        topProductTitle: ranked[0][0],
        topProductUnits: ranked[0][1],
        runnersUp: ranked.slice(1, 3).map(([title]) => title),
      },
    });
  }

  return drafts;
}

/**
 * Recomputes a store's insights and replaces the previous set.
 *
 * Insights are a snapshot of the store as it is now, so a stale one is worse
 * than none: the whole undismissed set is replaced rather than appended to.
 */
export async function regenerateInsights(storeId: string): Promise<number> {
  const provider = getAiProvider();
  const drafts = await computeInsightDrafts(storeId);

  let tokensIn = 0;
  let tokensOut = 0;
  const written = [];

  for (const draft of drafts) {
    const result = await provider.writeInsight(draft);
    tokensIn += result.tokensIn;
    tokensOut += result.tokensOut;
    written.push({
      storeId,
      kind: draft.kind as AiInsightKind,
      severity: draft.severity,
      title: result.title,
      body: result.body,
      evidence: draft.evidence as any,
      provider: result.provider,
      model: result.model,
    });
  }

  await prisma.$transaction([
    prisma.aiInsight.deleteMany({ where: { storeId, status: AiInsightStatus.READY } }),
    ...(written.length > 0 ? [prisma.aiInsight.createMany({ data: written })] : []),
  ]);

  if (tokensIn + tokensOut > 0) {
    await recordUsage({
      storeId,
      kind: AiUsageKind.INSIGHTS,
      provider: provider.name,
      model: provider.model,
      tokensIn,
      tokensOut,
    });
  }

  logger.info({ msg: `Regenerated ${written.length} Nexus IQ insights`, storeId });
  return written.length;
}

/**
 * The store context a chat answer must stay inside. Written as `- key: value`
 * lines so a provider without a model can still look facts up, and a real model
 * gets the same grounding.
 */
export async function buildStoreContext(storeId: string): Promise<string> {
  const drafts = await computeInsightDrafts(storeId);
  const [store, productCount, orderCount, customerCount] = await Promise.all([
    prisma.store.findUnique({ where: { id: storeId }, select: { name: true } }),
    prisma.product.count({ where: { storeId } }),
    prisma.order.count({ where: { storeId } }),
    prisma.customer.count({ where: { storeId } }),
  ]);

  const lines: string[] = [
    `- store name: ${store?.name ?? 'Unknown'}`,
    `- total products: ${productCount}`,
    `- total orders: ${orderCount}`,
    `- total customers: ${customerCount}`,
  ];

  // Margin and price position, which the insight drafts do not cover. A
  // merchant asking "am I making money" is asking about cost, not revenue.
  lines.push(...(await buildMarginContext(storeId)));

  for (const draft of drafts) {
    const e = draft.evidence as Record<string, any>;
    switch (draft.kind) {
      case 'OUT_OF_STOCK':
        lines.push(`- products out of stock: ${e.count}`);
        break;
      case 'LOW_STOCK':
        lines.push(`- products low on stock: ${e.count}`);
        break;
      case 'UNFULFILLED_ORDERS':
        lines.push(`- orders awaiting fulfilment: ${e.count}`);
        break;
      case 'REVENUE_TREND':
        lines.push(
          `- revenue in the last ${e.windowDays} days: ${e.currency} ${e.currentPeriodRevenue}`
        );
        lines.push(`- orders in the last ${e.windowDays} days: ${e.currentPeriodOrders}`);
        break;
      case 'TOP_PRODUCTS':
        lines.push(`- best selling product: ${e.topProductTitle} (${e.topProductUnits} units)`);
        break;
    }
  }

  return (
    `You are Nexus IQ, an assistant for the merchant who runs this store. ` +
    `Answer only from the figures below. If the answer is not there, say so.\n` +
    `When you quote a profit figure that does not cover all of the revenue, ` +
    `say what it leaves out. When you compare a price, say the comparison is ` +
    `against other Nexus stores, not the wider market.\n\n` +
    `Store data:\n${lines.join('\n')}`
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
