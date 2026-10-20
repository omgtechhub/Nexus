import { Request, Response, NextFunction } from 'express';
import { saasBillingService, PaymentRequiredError } from '../services/billing/saasBilling.service.js';
import { PaymentGatewayError, PaymentNotConfiguredError } from '../services/payments/errors.js';
import { entitlementService } from '../services/billing/entitlement.service.js';
import { prisma } from '../prisma.js';

/**
 * Turn a billing refusal into the response the frontend can act on.
 *
 * A 402 carries the plan code and interval so the Billing tab can send the
 * merchant straight into checkout instead of showing a dead error. Returns
 * true when it handled the error.
 */
function handleBillingError(err: unknown, res: Response): boolean {
  if (err instanceof PaymentRequiredError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      data: { planCode: err.planCode, interval: err.interval, requiresPayment: true },
    });
    return true;
  }
  if (err instanceof PaymentNotConfiguredError) {
    res.status(503).json({ success: false, error: err.message, code: err.code });
    return true;
  }
  if (err instanceof PaymentGatewayError) {
    res.status(502).json({ success: false, error: err.message, code: err.code });
    return true;
  }
  return false;
}

export async function getCurrentSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const [sub, entitlements] = await Promise.all([
      saasBillingService.getCurrentSubscription(merchantId),
      entitlementService.getMerchantEntitlements(merchantId),
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
    const merchantId = req.merchant!.id;
    const user = req.user!;
    const { planCode, interval, provider } = req.body;

    if (!planCode) {
      res.status(400).json({ success: false, error: 'planCode is required' });
      return;
    }

    const result = await saasBillingService.subscribeToPlan(
      merchantId,
      user.email,
      user.name,
      planCode,
      interval || 'MONTHLY',
      provider || 'PAYSTACK'
    );

    // 201 with an authorization URL and `requiresPayment: true`. The plan is
    // NOT active yet — the caller has to send the merchant to the gateway.
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (handleBillingError(err, res)) return;
    next(err);
  }
}

export async function changePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { planCode } = req.body;

    if (!planCode) {
      res.status(400).json({ success: false, error: 'planCode is required' });
      return;
    }

    const updatedSub = await saasBillingService.changePlan(merchantId, planCode);
    res.json({ success: true, data: updatedSub });
  } catch (err) {
    // An upgrade throws PaymentRequiredError; it is a 402, not a 500.
    if (handleBillingError(err, res)) return;
    next(err);
  }
}

export async function changeInterval(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { interval } = req.body;

    if (!interval || !['MONTHLY', 'ANNUAL'].includes(interval)) {
      res.status(400).json({ success: false, error: 'Valid interval (MONTHLY or ANNUAL) is required' });
      return;
    }

    const updatedSub = await saasBillingService.changeInterval(merchantId, interval);
    res.json({ success: true, data: updatedSub });
  } catch (err) {
    if (handleBillingError(err, res)) return;
    next(err);
  }
}

export async function cancelSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const updatedSub = await saasBillingService.cancelSubscription(merchantId);
    res.json({ success: true, message: 'Subscription will cancel at current period end.', data: updatedSub });
  } catch (err) {
    next(err);
  }
}

export async function resumeSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const updatedSub = await saasBillingService.resumeSubscription(merchantId);
    res.json({ success: true, message: 'Subscription resumed successfully.', data: updatedSub });
  } catch (err) {
    if (handleBillingError(err, res)) return;
    next(err);
  }
}

export async function getInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const invoices = await prisma.invoice.findMany({
      where: { merchantId },
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
    const merchantId = req.merchant!.id;
    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, merchantId },
      include: { items: true, merchant: true, plan: true },
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
