import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { defaultCurrencyCode } from '../config/currency.js';

export async function getPlatformMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const [totalMerchants, totalUsers, activeSubs, totalTransactions, plans] = await Promise.all([
      prisma.merchant.count(),
      prisma.user.count(),
      prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        include: { plan: true },
      }),
      prisma.billingTransaction.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.subscriptionPlan.findMany(),
    ]);

    let mrr = 0;
    for (const sub of activeSubs) {
      if (sub.billingInterval === 'ANNUAL') {
        mrr += sub.plan.annualPrice / 12;
      } else {
        mrr += sub.plan.monthlyPrice;
      }
    }
    const arr = mrr * 12;
    const totalRevenue = totalTransactions._sum.amount || 0;

    res.json({
      success: true,
      data: {
        totalMerchants,
        totalUsers,
        activeSubscriptionsCount: activeSubs.length,
        mrr: Number(mrr.toFixed(2)),
        arr: Number(arr.toFixed(2)),
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalTransactionsCount: totalTransactions._count,
        plansCount: plans.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMerchants(req: Request, res: Response, next: NextFunction) {
  try {
    const merchants = await prisma.merchant.findMany({
      include: {
        owner: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
        subscription: {
          include: { plan: true },
        },
        _count: {
          select: { products: true, members: true, orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = merchants.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      owner: s.owner,
      subscription: s.subscription
        ? {
            id: s.subscription.id,
            planName: s.subscription.plan.name,
            planCode: s.subscription.plan.code,
            status: s.subscription.status,
            interval: s.subscription.billingInterval,
            currentPeriodEnd: s.subscription.currentPeriodEnd,
          }
        : null,
      metrics: {
        productCount: s._count.products,
        memberCount: s._count.members,
        orderCount: s._count.orders,
      },
      createdAt: s.createdAt,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getPlatformPlans(req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
}

export async function createPlatformPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      code,
      name,
      description,
      monthlyPrice,
      annualPrice,
      currency,
      trialDays,
      displayOrder,
      maxProducts,
      maxTeamMembers,
      storageMb,
      advancedAnalyticsAllowed,
      features,
    } = req.body;

    if (!code || !name || monthlyPrice === undefined) {
      res.status(400).json({ success: false, error: 'code, name, and monthlyPrice are required' });
      return;
    }

    const cleanCode = code.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

    const newPlan = await prisma.subscriptionPlan.create({
      data: {
        code: cleanCode,
        name,
        description: description || '',
        monthlyPrice: Number(monthlyPrice),
        annualPrice: Number(annualPrice || monthlyPrice * 10),
        currency: currency || defaultCurrencyCode(),
        trialDays: trialDays !== undefined ? Number(trialDays) : 14,
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : 1,
        maxProducts: maxProducts !== undefined ? Number(maxProducts) : 100,
        maxTeamMembers: maxTeamMembers !== undefined ? Number(maxTeamMembers) : 5,
        storageMb: storageMb !== undefined ? Number(storageMb) : 5000,
        advancedAnalyticsAllowed: advancedAnalyticsAllowed !== undefined ? Boolean(advancedAnalyticsAllowed) : true,
        features: features || [],
      },
    });

    res.status(201).json({ success: true, data: newPlan });
  } catch (err) {
    next(err);
  }
}

/**
 * The plan columns the console may edit, and how each is coerced.
 *
 * This handler passed `req.body` straight through as `data`. Even behind
 * `requirePlatformAdmin` that is wider than it should be, because `code` is
 * not a label — `DEFAULT_PLAN_CODE` resolves the platform's default
 * entitlement against it, so renaming `starter` makes `entitlement.service`
 * answer 503 for every store on the platform. `id`, `createdAt` and the
 * subscription back-relations were writable for the same reason.
 *
 * `code` is deliberately absent: a plan's code is its identity, and existing
 * subscriptions point at the row. Create a new plan instead.
 */
const PLAN_FIELD_COERCIONS: Record<string, (v: unknown) => unknown> = {
  name: (v) => String(v),
  description: (v) => String(v),
  monthlyPrice: (v) => Number(v),
  annualPrice: (v) => Number(v),
  currency: (v) => String(v),
  trialDays: (v) => Number(v),
  displayOrder: (v) => Number(v),
  maxProducts: (v) => Number(v),
  maxTeamMembers: (v) => Number(v),
  storageMb: (v) => Number(v),
  advancedAnalyticsAllowed: (v) => Boolean(v),
  features: (v) => (Array.isArray(v) ? v.map(String) : []),
  isActive: (v) => Boolean(v),
};

const NUMERIC_PLAN_FIELDS = new Set([
  'monthlyPrice',
  'annualPrice',
  'trialDays',
  'displayOrder',
  'maxProducts',
  'maxTeamMembers',
  'storageMb',
]);

export async function updatePlatformPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const body = (req.body ?? {}) as Record<string, unknown>;

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      res.status(404).json({ success: false, error: 'Subscription plan not found' });
      return;
    }

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      const coerce = PLAN_FIELD_COERCIONS[key];
      if (!coerce || value === undefined) continue;
      const coerced = coerce(value);
      // A price that arrives as "abc" becomes NaN, and Prisma stores NaN
      // without complaint on a Float column — a plan nobody can be billed for.
      if (NUMERIC_PLAN_FIELDS.has(key) && !Number.isFinite(coerced as number)) {
        res.status(400).json({ success: false, error: `"${key}" must be a number.` });
        return;
      }
      updates[key] = coerced;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: 'No editable plan fields were supplied.' });
      return;
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: updates,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function getPlatformInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { merchant: true, plan: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
}

export async function getPlatformTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    // Explicit select: the row carries `rawResponse`, the gateway's full payload,
    // which nothing in the console needs and should not be shipped to a browser.
    const transactions = await prisma.billingTransaction.findMany({
      select: {
        id: true,
        amount: true,
        currency: true,
        type: true,
        status: true,
        provider: true,
        providerReference: true,
        createdAt: true,
        merchant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
}
