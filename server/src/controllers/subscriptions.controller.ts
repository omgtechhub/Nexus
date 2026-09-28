import { Request, Response, NextFunction } from 'express';
import { saasBillingService } from '../services/billing/saasBilling.service.js';
import { entitlementService } from '../services/billing/entitlement.service.js';
import { prisma } from '../prisma.js';

export async function getCurrentSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const [sub, entitlements] = await Promise.all([
      saasBillingService.getCurrentSubscription(storeId),
      entitlementService.getStoreEntitlements(storeId),
    ]);

    res.json({
      success: true,
      data: {
        subscription: sub,
        entitlements,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function subscribeToPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const user = req.user!;
    const { planCode, interval, provider } = req.body;

    if (!planCode) {
      res.status(400).json({ success: false, error: 'planCode is required' });
      return;
    }

    const result = await saasBillingService.subscribeToPlan(
      storeId,
      user.email,
      user.name,
      planCode,
      interval || 'MONTHLY',
      provider || 'PAYSTACK'
    );

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function changePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { planCode } = req.body;

    if (!planCode) {
      res.status(400).json({ success: false, error: 'planCode is required' });
      return;
    }

    const updatedSub = await saasBillingService.changePlan(storeId, planCode);
    res.json({ success: true, data: updatedSub });
  } catch (err) {
    next(err);
  }
}

export async function changeInterval(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { interval } = req.body;

    if (!interval || !['MONTHLY', 'ANNUAL'].includes(interval)) {
      res.status(400).json({ success: false, error: 'Valid interval (MONTHLY or ANNUAL) is required' });
      return;
    }

    const updatedSub = await saasBillingService.changeInterval(storeId, interval);
    res.json({ success: true, data: updatedSub });
  } catch (err) {
    next(err);
  }
}

export async function cancelSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const updatedSub = await saasBillingService.cancelSubscription(storeId);
    res.json({ success: true, message: 'Subscription will cancel at current period end.', data: updatedSub });
  } catch (err) {
    next(err);
  }
}

export async function resumeSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const updatedSub = await saasBillingService.resumeSubscription(storeId);
    res.json({ success: true, message: 'Subscription resumed successfully.', data: updatedSub });
  } catch (err) {
    next(err);
  }
}

export async function getInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const invoices = await prisma.invoice.findMany({
      where: { storeId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
}

export async function getInvoiceDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, storeId },
      include: { items: true, store: true, plan: true },
    });

    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
}
