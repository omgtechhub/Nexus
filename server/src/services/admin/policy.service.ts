import {
  PaymentStatus,
  OrderStatus,
  ProductStatus,
  StoreStatus,
  ReviewStatus,
} from '@prisma/client';
import { prisma } from '../../prisma.js';

/**
 * Platform policy monitoring.
 *
 * Every finding below is computed from rows that exist, and carries the
 * evidence it was computed from. This follows the same rule the insight
 * pipeline follows: the provider may phrase a finding, it may never decide
 * that one happened. An assistant that invents a policy breach is worse than
 * one that reports none — it would have an administrator suspend a merchant
 * over a sentence a model made up.
 *
 * Each check is a question that can be answered in SQL and whose answer means
 * something a human would act on. A check that cannot be made precise is not
 * here; "suspicious activity" is not a policy.
 */

export type PolicyKind =
  | 'PAID_WITHOUT_PAYMENT'
  | 'PAYMENT_AMOUNT_MISMATCH'
  | 'OVER_REFUNDED'
  | 'SELF_REVIEW'
  | 'UNFULFILLED_PAID_ORDER'
  | 'FAKE_DISCOUNT'
  | 'INVALID_PRICE'
  | 'MISSING_DESCRIPTION'
  | 'SUSPENDED_STORE_SELLING'
  | 'ADMIN_SPRAWL';

export type PolicySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface PolicyFinding {
  kind: PolicyKind;
  severity: PolicySeverity;
  /** One sentence, already true. The provider may rephrase, not re-decide. */
  summary: string;
  /** What the finding is about, so an admin can go and look. */
  subject: { type: 'store' | 'order' | 'product' | 'review' | 'platform'; id: string; label: string };
  /** The figures the summary was computed from. */
  evidence: Record<string, string | number | boolean | null>;
}

/** Orders whose money is supposed to have moved. */
const PAID_STATES: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.SUCCESS];

/** Days a paid order may sit unfulfilled before it is a consumer-protection issue. */
const FULFILMENT_SLA_DAYS = 14;

/** Tolerance on a payment-vs-total comparison, for floating point and rounding. */
const AMOUNT_TOLERANCE = 0.01;

/**
 * Paid orders with no payment record behind them.
 *
 * The most serious check here. An order can only reach a paid state through a
 * provider callback that also writes a `Payment`, so a paid order without one
 * means something marked it paid directly — which is exactly the class of hole
 * this platform has had before. Reported per order rather than aggregated,
 * because each one is a specific amount somebody may not have paid.
 */
async function checkPaidWithoutPayment(): Promise<PolicyFinding[]> {
  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: { in: PAID_STATES },
      status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
      payments: { none: {} },
    },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      currency: true,
      createdAt: true,
      store: { select: { id: true, name: true } },
    },
    take: 50,
    orderBy: { createdAt: 'desc' },
  });

  return orders.map(order => ({
    kind: 'PAID_WITHOUT_PAYMENT' as const,
    severity: 'CRITICAL' as const,
    summary:
      `Order ${order.orderNumber} at ${order.store.name} is marked paid for ` +
      `${order.currency} ${order.total} but has no payment record.`,
    subject: { type: 'order' as const, id: order.id, label: order.orderNumber },
    evidence: {
      storeId: order.store.id,
      storeName: order.store.name,
      orderNumber: order.orderNumber,
      total: order.total,
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
    },
  }));
}

/** Payments that do not match what the order says it cost. */
async function checkPaymentAmountMismatch(): Promise<PolicyFinding[]> {
  const payments = await prisma.payment.findMany({
    where: { status: { in: PAID_STATES } },
    select: {
      id: true,
      amount: true,
      currency: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          total: true,
          store: { select: { id: true, name: true } },
        },
      },
    },
    take: 200,
    orderBy: { createdAt: 'desc' },
  });

  return payments
    .filter(p => Math.abs(p.amount - p.order.total) > AMOUNT_TOLERANCE)
    .slice(0, 25)
    .map(p => ({
      kind: 'PAYMENT_AMOUNT_MISMATCH' as const,
      severity: 'CRITICAL' as const,
      summary:
        `Order ${p.order.orderNumber} at ${p.order.store.name} totals ` +
        `${p.currency} ${p.order.total} but was charged ${p.currency} ${p.amount}.`,
      subject: { type: 'order' as const, id: p.order.id, label: p.order.orderNumber },
      evidence: {
        storeId: p.order.store.id,
        storeName: p.order.store.name,
        orderNumber: p.order.orderNumber,
        orderTotal: p.order.total,
        charged: p.amount,
        difference: Math.round((p.amount - p.order.total) * 100) / 100,
        currency: p.currency,
      },
    }));
}

/** More refunded than was ever taken. */
async function checkOverRefunded(): Promise<PolicyFinding[]> {
  const payments = await prisma.payment.findMany({
    where: { refunds: { some: {} } },
    select: {
      id: true,
      amount: true,
      currency: true,
      refunds: { select: { amount: true, status: true } },
      order: {
        select: { id: true, orderNumber: true, store: { select: { id: true, name: true } } },
      },
    },
    take: 200,
  });

  const findings: PolicyFinding[] = [];
  for (const payment of payments) {
    const refunded = payment.refunds
      .filter(r => r.status?.toUpperCase() === 'SUCCESS')
      .reduce((sum, r) => sum + r.amount, 0);

    if (refunded - payment.amount <= AMOUNT_TOLERANCE) continue;

    findings.push({
      kind: 'OVER_REFUNDED',
      severity: 'CRITICAL',
      summary:
        `Order ${payment.order.orderNumber} at ${payment.order.store.name} was refunded ` +
        `${payment.currency} ${Math.round(refunded * 100) / 100} against a payment of ` +
        `${payment.currency} ${payment.amount}.`,
      subject: { type: 'order', id: payment.order.id, label: payment.order.orderNumber },
      evidence: {
        storeId: payment.order.store.id,
        storeName: payment.order.store.name,
        orderNumber: payment.order.orderNumber,
        paid: payment.amount,
        refunded: Math.round(refunded * 100) / 100,
        currency: payment.currency,
      },
    });
  }
  return findings.slice(0, 25);
}

/**
 * Merchants reviewing their own catalogue.
 *
 * Reviews require a delivered purchase, so this is not someone posting a fake
 * review from nowhere — it is a store member buying from their own shop and
 * rating it, which inflates a rating shoppers are told comes from other
 * customers. Detected by joining the review's author to the selling store's
 * membership, which is exact rather than heuristic.
 */
async function checkSelfReviews(): Promise<PolicyFinding[]> {
  const reviews = await prisma.productReview.findMany({
    where: { status: ReviewStatus.PUBLISHED },
    select: {
      id: true,
      rating: true,
      userId: true,
      storeId: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      product: { select: { id: true, title: true } },
      store: { select: { id: true, name: true } },
    },
    take: 500,
    orderBy: { createdAt: 'desc' },
  });
  if (reviews.length === 0) return [];

  const memberships = await prisma.storeMember.findMany({
    where: {
      userId: { in: [...new Set(reviews.map(r => r.userId))] },
      storeId: { in: [...new Set(reviews.map(r => r.storeId))] },
    },
    select: { userId: true, storeId: true },
  });

  const owns = new Set(memberships.map(m => `${m.userId}:${m.storeId}`));

  return reviews
    .filter(r => owns.has(`${r.userId}:${r.storeId}`))
    .slice(0, 25)
    .map(r => ({
      kind: 'SELF_REVIEW' as const,
      severity: 'WARNING' as const,
      summary:
        `${r.store.name} reviewed its own product "${r.product.title}" with ` +
        `${r.rating} star${r.rating === 1 ? '' : 's'}.`,
      subject: { type: 'review' as const, id: r.id, label: r.product.title },
      evidence: {
        storeId: r.store.id,
        storeName: r.store.name,
        productId: r.product.id,
        productTitle: r.product.title,
        rating: r.rating,
        reviewerEmail: r.user.email,
        createdAt: r.createdAt.toISOString(),
      },
    }));
}

/** Paid orders that have sat unfulfilled past the platform's SLA. */
async function checkUnfulfilledPaidOrders(): Promise<PolicyFinding[]> {
  const cutoff = new Date(Date.now() - FULFILMENT_SLA_DAYS * 24 * 60 * 60 * 1000);

  const grouped = await prisma.order.groupBy({
    by: ['storeId'],
    where: {
      paymentStatus: { in: PAID_STATES },
      status: { notIn: [OrderStatus.FULFILLED, OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
      createdAt: { lt: cutoff },
    },
    _count: { _all: true },
    _sum: { total: true },
  });
  if (grouped.length === 0) return [];

  const stores = await prisma.store.findMany({
    where: { id: { in: grouped.map(g => g.storeId) } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(stores.map(s => [s.id, s.name]));

  // Aggregated per store rather than per order: thirty late orders from one
  // merchant is one problem with that merchant, and reading thirty findings
  // aloud would bury everything else in the report.
  return grouped
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 15)
    .map(g => ({
      kind: 'UNFULFILLED_PAID_ORDER' as const,
      severity: 'WARNING' as const,
      summary:
        `${nameOf.get(g.storeId) ?? 'A store'} has ${g._count._all} paid order(s) still ` +
        `unfulfilled after ${FULFILMENT_SLA_DAYS} days, worth ${Math.round((g._sum.total ?? 0) * 100) / 100}.`,
      subject: { type: 'store' as const, id: g.storeId, label: nameOf.get(g.storeId) ?? g.storeId },
      evidence: {
        storeId: g.storeId,
        storeName: nameOf.get(g.storeId) ?? null,
        orders: g._count._all,
        value: Math.round((g._sum.total ?? 0) * 100) / 100,
        slaDays: FULFILMENT_SLA_DAYS,
      },
    }));
}

/**
 * Listings whose "was" price is not a real former price.
 *
 * A `comparePrice` at or below the selling price renders as a discount badge
 * on a saving that does not exist, which is a consumer-protection matter in
 * most of the markets this platform serves.
 */
async function checkFakeDiscounts(): Promise<PolicyFinding[]> {
  const products = await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE, comparePrice: { not: null } },
    select: {
      id: true,
      title: true,
      price: true,
      comparePrice: true,
      store: { select: { id: true, name: true } },
    },
    take: 300,
  });

  return products
    .filter(p => p.comparePrice !== null && p.comparePrice <= p.price)
    .slice(0, 25)
    .map(p => ({
      kind: 'FAKE_DISCOUNT' as const,
      severity: 'WARNING' as const,
      summary:
        `"${p.title}" at ${p.store.name} shows a was-price of ${p.comparePrice} against a ` +
        `selling price of ${p.price}, so the advertised saving is not real.`,
      subject: { type: 'product' as const, id: p.id, label: p.title },
      evidence: {
        storeId: p.store.id,
        storeName: p.store.name,
        productTitle: p.title,
        price: p.price,
        comparePrice: p.comparePrice,
      },
    }));
}

/** Live listings priced at or below zero. */
async function checkInvalidPrices(): Promise<PolicyFinding[]> {
  const products = await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE, price: { lte: 0 } },
    select: { id: true, title: true, price: true, store: { select: { id: true, name: true } } },
    take: 25,
  });

  return products.map(p => ({
    kind: 'INVALID_PRICE' as const,
    severity: 'CRITICAL' as const,
    summary: `"${p.title}" at ${p.store.name} is listed at ${p.price}.`,
    subject: { type: 'product' as const, id: p.id, label: p.title },
    evidence: { storeId: p.store.id, storeName: p.store.name, productTitle: p.title, price: p.price },
  }));
}

/** Live listings with nothing written about them. */
async function checkMissingDescriptions(): Promise<PolicyFinding[]> {
  const grouped = await prisma.product.groupBy({
    by: ['storeId'],
    where: { status: ProductStatus.ACTIVE, description: '' },
    _count: { _all: true },
  });
  if (grouped.length === 0) return [];

  const stores = await prisma.store.findMany({
    where: { id: { in: grouped.map(g => g.storeId) } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(stores.map(s => [s.id, s.name]));

  return grouped
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 10)
    .map(g => ({
      kind: 'MISSING_DESCRIPTION' as const,
      severity: 'INFO' as const,
      summary: `${nameOf.get(g.storeId) ?? 'A store'} has ${g._count._all} live product(s) with no description.`,
      subject: { type: 'store' as const, id: g.storeId, label: nameOf.get(g.storeId) ?? g.storeId },
      evidence: {
        storeId: g.storeId,
        storeName: nameOf.get(g.storeId) ?? null,
        products: g._count._all,
      },
    }));
}

/**
 * Suspended stores whose products are still live.
 *
 * The marketplace filters on store status, so this is not necessarily a leak —
 * it is a reconciliation failure worth knowing about, because the catalogue
 * and the suspension disagree about whether that merchant is trading.
 */
async function checkSuspendedStoresSelling(): Promise<PolicyFinding[]> {
  const stores = await prisma.store.findMany({
    where: {
      status: { in: [StoreStatus.SUSPENDED, StoreStatus.PAUSED] },
      products: { some: { status: ProductStatus.ACTIVE } },
    },
    select: {
      id: true,
      name: true,
      status: true,
      _count: { select: { products: true } },
    },
    take: 25,
  });

  return stores.map(s => ({
    kind: 'SUSPENDED_STORE_SELLING' as const,
    severity: 'WARNING' as const,
    summary: `${s.name} is ${s.status.toLowerCase()} but still has live products.`,
    subject: { type: 'store' as const, id: s.id, label: s.name },
    evidence: { storeId: s.id, storeName: s.name, status: s.status, products: s._count.products },
  }));
}

/** How many people hold platform-wide authority. */
async function checkAdminSprawl(): Promise<PolicyFinding[]> {
  const admins = await prisma.user.count({ where: { platformRole: { not: null } } });
  if (admins <= 3) return [];

  return [
    {
      kind: 'ADMIN_SPRAWL',
      severity: 'INFO',
      summary: `${admins} accounts hold platform-wide privileges.`,
      subject: { type: 'platform', id: 'platform', label: 'Platform access' },
      evidence: { admins },
    },
  ];
}

const SEVERITY_ORDER: Record<PolicySeverity, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };

export interface PolicyReport {
  generatedAt: string;
  findings: PolicyFinding[];
  counts: { critical: number; warning: number; info: number; total: number };
  /** What was examined, so "no violations" means something checkable. */
  scanned: { stores: number; orders: number; products: number; reviews: number; checks: number };
}

const CHECKS = [
  checkPaidWithoutPayment,
  checkPaymentAmountMismatch,
  checkOverRefunded,
  checkSelfReviews,
  checkUnfulfilledPaidOrders,
  checkFakeDiscounts,
  checkInvalidPrices,
  checkMissingDescriptions,
  checkSuspendedStoresSelling,
  checkAdminSprawl,
];

/**
 * Run every check and return the findings, worst first.
 *
 * `scanned` is reported alongside, because "no policy violations" is only
 * meaningful next to what was looked at. A report that says nothing is wrong
 * while silently having examined nothing is worse than no report.
 */
export async function runPolicyScan(): Promise<PolicyReport> {
  const [results, stores, orders, products, reviews] = await Promise.all([
    Promise.all(CHECKS.map(check => check())),
    prisma.store.count(),
    prisma.order.count(),
    prisma.product.count(),
    prisma.productReview.count(),
  ]);

  const findings = results
    .flat()
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return {
    generatedAt: new Date().toISOString(),
    findings,
    counts: {
      critical: findings.filter(f => f.severity === 'CRITICAL').length,
      warning: findings.filter(f => f.severity === 'WARNING').length,
      info: findings.filter(f => f.severity === 'INFO').length,
      total: findings.length,
    },
    scanned: { stores, orders, products, reviews, checks: CHECKS.length },
  };
}

/**
 * Platform activity over a window: what buyers and sellers have been doing.
 *
 * Counts rather than a feed of individual events. An administrator asking
 * "what has been happening" wants the shape of the day, and reading three
 * hundred audit rows aloud would answer a question nobody asked.
 */
export async function getActivitySummary(windowHours = 24) {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const [newStores, newCustomers, orders, paidOrders, newProducts, newReviews, refunds, auditEvents] =
    await Promise.all([
      prisma.store.count({ where: { createdAt: { gte: since } } }),
      prisma.user.count({ where: { createdAt: { gte: since }, accountType: 'CUSTOMER' } }),
      prisma.order.count({ where: { createdAt: { gte: since } } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: since }, paymentStatus: { in: PAID_STATES } },
        _count: { _all: true },
        _sum: { total: true },
      }),
      prisma.product.count({ where: { createdAt: { gte: since } } }),
      prisma.productReview.count({ where: { createdAt: { gte: since } } }),
      prisma.refund.count({ where: { createdAt: { gte: since } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: since } } }),
    ]);

  return {
    windowHours,
    newStores,
    newCustomers,
    orders,
    paidOrders: paidOrders._count._all,
    revenue: Math.round((paidOrders._sum.total ?? 0) * 100) / 100,
    newProducts,
    newReviews,
    refunds,
    auditEvents,
  };
}

/**
 * The report, as something to read aloud.
 *
 * Deliberately a template rather than a model: the figures are the point, and
 * a spoken report is the worst possible place for a fluent paraphrase that
 * drops a number or softens a critical finding.
 */
export function spokenReport(report: PolicyReport, activity: Awaited<ReturnType<typeof getActivitySummary>>): string {
  const parts: string[] = [];

  parts.push(
    `In the last ${activity.windowHours} hours: ${activity.orders} order(s), ` +
      `${activity.paidOrders} paid, worth ${activity.revenue}. ` +
      `${activity.newCustomers} new customer(s), ${activity.newStores} new store(s), ` +
      `${activity.newProducts} new product(s), ${activity.newReviews} new review(s).`
  );

  if (report.counts.total === 0) {
    parts.push(
      `I ran ${report.scanned.checks} policy checks across ${report.scanned.stores} store(s), ` +
        `${report.scanned.orders} order(s) and ${report.scanned.products} product(s), and found ` +
        'no violations.'
    );
    return parts.join(' ');
  }

  parts.push(
    `${report.counts.total} policy finding(s): ${report.counts.critical} critical, ` +
      `${report.counts.warning} warning, ${report.counts.info} informational.`
  );

  // The critical ones in full, then a count. An administrator needs to hear
  // every serious one, and does not need ten listing-quality notes read out.
  const critical = report.findings.filter(f => f.severity === 'CRITICAL');
  for (const finding of critical.slice(0, 5)) parts.push(finding.summary);
  if (critical.length > 5) parts.push(`And ${critical.length - 5} further critical finding(s).`);

  const warnings = report.findings.filter(f => f.severity === 'WARNING');
  if (warnings.length > 0) parts.push(warnings[0].summary);
  if (warnings.length > 1) parts.push(`Plus ${warnings.length - 1} other warning(s).`);

  return parts.join(' ');
}
