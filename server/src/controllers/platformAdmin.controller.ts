import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';

export async function getPlatformMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const [totalStores, totalUsers, activeSubs, totalTransactions, plans] = await Promise.all([
      prisma.store.count(),
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
        totalStores,
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
    const stores = await prisma.store.findMany({
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

    const data = stores.map((s) => ({
      id: s.id,
      name: s.name,
      domain: s.domain,
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
      maxStores,
      storageMb,
      customDomainAllowed,
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
        currency: currency || 'USD',
        trialDays: trialDays !== undefined ? Number(trialDays) : 14,
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : 1,
        maxProducts: maxProducts !== undefined ? Number(maxProducts) : 100,
        maxTeamMembers: maxTeamMembers !== undefined ? Number(maxTeamMembers) : 5,
        maxStores: maxStores !== undefined ? Number(maxStores) : 1,
        storageMb: storageMb !== undefined ? Number(storageMb) : 5000,
        customDomainAllowed: customDomainAllowed !== undefined ? Boolean(customDomainAllowed) : true,
        advancedAnalyticsAllowed: advancedAnalyticsAllowed !== undefined ? Boolean(advancedAnalyticsAllowed) : true,
        features: features || [],
      },
    });

    res.status(201).json({ success: true, data: newPlan });
  } catch (err) {
    next(err);
  }
}

export async function updatePlatformPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      res.status(404).json({ success: false, error: 'Subscription plan not found' });
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
      include: { store: true, plan: true, items: true },
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
    const transactions = await prisma.billingTransaction.findMany({
      include: { store: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
}
