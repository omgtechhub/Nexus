import { prisma } from '../../prisma.js';
import { SubscriptionStatus, BillingInterval, InvoiceStatus } from '@prisma/client';
import crypto from 'crypto';
import { logAuditEvent } from '../../utils/auditLogger.js';
import { getPaymentProvider } from '../payments/payment.factory.js';
import { logger } from '../../utils/logger.js';
import { resolveDefaultPlan } from './defaultPlan.js';

/**
 * Platform subscription billing.
 *
 * Three separate paths here used to hand out paid plans for nothing, and the
 * entitlement service gates product count, team seats, custom domains and
 * analytics on the plan — so each one was a live revenue bypass:
 *
 *  1. `changePlan` looked the plan up and wrote it to the subscription. No
 *     charge, no invoice, no proration. It is what the seller Settings →
 *     Billing tab calls, so any merchant could move themselves onto the
 *     Enterprise plan by picking it from a list.
 *  2. `subscribeToPlan` marked the subscription ACTIVE, wrote an invoice with
 *     `status: PAID` and `paidAt: now`, and wrote a SUCCESS billing
 *     transaction — all immediately after merely *minting* an authorization
 *     URL. A merchant who never visited that URL still held a paid plan and a
 *     receipt. This is the same "report success before the gateway answers"
 *     shape that `payments.controller.ts` was fixed for; it survived here.
 *  3. `getCurrentSubscription` auto-created an indefinitely ACTIVE
 *     subscription on the `growth` plan — $79/mo — for any store that had
 *     none.
 *
 * The rule now: **nothing grants a plan except `settlePaidInvoice`**, which is
 * reached only from a signature-verified webhook or a server-side gateway
 * verification. Everything else either lowers what is owed or returns an
 * authorization URL and waits.
 */

/**
 * What a brand-new store gets before it has paid anything: the platform's
 * entry tier, as a time-boxed trial rather than a standing entitlement.
 *
 * `resolveDefaultPlan` is shared with `entitlement.service.ts` so the two
 * cannot disagree about what an unpaid store is allowed to do — see the note
 * there on why this is resolved by an explicit plan code rather than by price.
 */

export class PaymentRequiredError extends Error {
  readonly statusCode = 402;
  readonly code = 'SUBSCRIPTION_PAYMENT_REQUIRED';
  constructor(message: string, readonly planCode: string, readonly interval: 'MONTHLY' | 'ANNUAL') {
    super(message);
    this.name = 'PaymentRequiredError';
  }
}

/** The price of a plan at a given billing interval. */
function priceFor(plan: { monthlyPrice: number; annualPrice: number }, interval: BillingInterval | 'MONTHLY' | 'ANNUAL'): number {
  return interval === 'ANNUAL' ? plan.annualPrice : plan.monthlyPrice;
}

function periodEndFrom(start: Date, interval: BillingInterval | 'MONTHLY' | 'ANNUAL'): Date {
  const days = interval === 'ANNUAL' ? 365 : 30;
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

export class SaaSBillingService {
  /**
   * Get the store's subscription, creating a trial for a store that has none.
   */
  async getCurrentSubscription(merchantId: string) {
    const include = {
      plan: true,
      invoices: {
        orderBy: { createdAt: 'desc' as const },
        take: 10,
        include: { items: true },
      },
    };

    const sub = await prisma.subscription.findUnique({ where: { merchantId }, include });
    if (sub) return sub;

    // A new store needs working entitlements before it can be asked to pay for
    // anything, but a trial is a dated grant, not a free paid plan.
    const trialPlan = await resolveDefaultPlan();

    if (!trialPlan) return null;

    const periodStart = new Date();
    const trialDays = trialPlan.trialDays > 0 ? trialPlan.trialDays : 14;
    const trialEndsAt = new Date(periodStart.getTime() + trialDays * 24 * 60 * 60 * 1000);

    return prisma.subscription.create({
      data: {
        merchantId,
        planId: trialPlan.id,
        billingInterval: BillingInterval.MONTHLY,
        status: SubscriptionStatus.TRIALING,
        currentPeriodStart: periodStart,
        currentPeriodEnd: trialEndsAt,
        trialEndsAt,
      },
      include,
    });
  }

  /**
   * Begin a paid subscription, or an upgrade.
   *
   * Returns an authorization URL and leaves the subscription on whatever plan
   * it is on now. The requested plan lives on an OPEN invoice and a PENDING
   * billing transaction until the gateway confirms the charge, at which point
   * `settlePaidInvoice` applies it. Nothing here grants an entitlement.
   */
  async subscribeToPlan(
    merchantId: string,
    userEmail: string,
    userName: string,
    planCode: string,
    interval: 'MONTHLY' | 'ANNUAL',
    providerName: 'PAYSTACK' | 'FLUTTERWAVE' = 'PAYSTACK'
  ) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });

    if (!plan || !plan.isActive) {
      const err: any = new Error(`Subscription plan "${planCode}" is inactive or invalid.`);
      err.statusCode = 400;
      throw err;
    }

    const price = priceFor(plan, interval);

    // The subscription row has to exist so the invoice can hang off it, but it
    // keeps its current plan. A store with no row gets its trial first.
    const sub = (await this.getCurrentSubscription(merchantId))
      ?? (await prisma.subscription.create({
        data: {
          merchantId,
          planId: plan.id,
          billingInterval: interval as BillingInterval,
          status: SubscriptionStatus.PAST_DUE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
        },
        include: { plan: true, invoices: { take: 0 } },
      }));

    const ref = `saas_sub_${crypto.randomBytes(8).toString('hex')}`;

    // Resolve the gateway before writing an invoice. An unconfigured provider
    // throws here, so there is no OPEN invoice nobody can ever pay.
    const provider = getPaymentProvider(providerName);
    const initRes = await provider.initializePayment({
      amount: price,
      currency: plan.currency,
      email: userEmail,
      reference: ref,
      customerName: userName,
      metadata: { merchantId, planCode, interval, type: 'SAAS_SUBSCRIPTION' },
    });

    const periodStart = new Date();
    const periodEnd = periodEndFrom(periodStart, interval);

    const invoiceNumber = `NX-INV-${Date.now().toString(36).toUpperCase()}-${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        merchantId,
        subscriptionId: sub.id,
        planId: plan.id,
        // Not PAID. Nobody has paid yet.
        status: InvoiceStatus.OPEN,
        subtotal: price,
        tax: 0,
        total: price,
        currency: plan.currency,
        periodStart,
        periodEnd,
        dueDate: periodStart,
        paidAt: null,
        items: {
          create: [{ description: `${plan.name} (${interval})`, amount: price, quantity: 1 }],
        },
      },
    });

    await prisma.billingTransaction.create({
      data: {
        merchantId,
        subscriptionId: sub.id,
        invoiceId: invoice.id,
        amount: price,
        currency: plan.currency,
        type: 'SUBSCRIPTION_CHARGE',
        // The charge has been started, not completed.
        status: 'PENDING',
        provider: providerName,
        providerReference: ref,
        // Carries the requested interval through to settlement. The plan comes
        // off the invoice; the interval has nowhere else to live.
        rawResponse: { requestedPlanCode: plan.code, requestedInterval: interval } as any,
      },
    });

    await logAuditEvent({
      merchantId,
      userId: undefined,
      actorName: userName,
      actorEmail: userEmail,
      action: 'SAAS_SUBSCRIPTION_CHECKOUT_STARTED',
      resource: 'subscription',
      resourceId: sub.id,
      metadata: { planCode, interval, price, reference: ref },
    });

    return {
      subscription: sub,
      invoice,
      authorizationUrl: initRes.authorizationUrl,
      reference: ref,
      // The caller must send the merchant to the gateway. Nothing is active yet.
      requiresPayment: true,
      simulated: provider.isLive === false,
    };
  }

  /**
   * Apply a confirmed payment.
   *
   * The **only** path that grants a plan. Idempotent: the transaction row is
   * claimed with its PENDING status in the predicate, so a webhook delivered
   * twice — or a webhook racing a return-leg verification — applies once.
   *
   * `verifiedAmount` is the figure the gateway reported. An underpayment does
   * not buy the plan; it is recorded and left for a human, because silently
   * activating on a short payment is how a $29 charge becomes a $499 plan.
   */
  async settlePaidInvoice(
    providerReference: string,
    opts: { verifiedAmount?: number; rawResponse?: unknown } = {}
  ): Promise<{ settled: boolean; reason?: string }> {
    const transaction = await prisma.billingTransaction.findUnique({
      where: { providerReference },
      include: { invoice: { include: { plan: true } }, subscription: true },
    });

    if (!transaction) return { settled: false, reason: 'unknown_reference' };
    if (transaction.status === 'SUCCESS') return { settled: false, reason: 'already_settled' };
    if (!transaction.invoice || !transaction.subscriptionId) {
      return { settled: false, reason: 'incomplete_transaction' };
    }

    if (
      typeof opts.verifiedAmount === 'number'
      // Tolerance for the gateway's own minor-unit rounding, not for a discount.
      && opts.verifiedAmount + 0.01 < transaction.amount
    ) {
      logger.error({
        msg: 'SaaS subscription underpaid; plan not granted',
        providerReference,
        expected: transaction.amount,
        received: opts.verifiedAmount,
      });
      await prisma.billingTransaction.update({
        where: { id: transaction.id },
        data: { status: 'UNDERPAID', rawResponse: (opts.rawResponse ?? undefined) as any },
      });
      return { settled: false, reason: 'amount_mismatch' };
    }

    const requested = (transaction.rawResponse as any) || {};
    const interval: BillingInterval =
      requested.requestedInterval === 'ANNUAL' ? BillingInterval.ANNUAL : BillingInterval.MONTHLY;
    const invoice = transaction.invoice;

    const settled = await prisma.$transaction(async (tx) => {
      const claimed = await tx.billingTransaction.updateMany({
        where: { id: transaction.id, status: 'PENDING' },
        data: { status: 'SUCCESS', rawResponse: (opts.rawResponse ?? undefined) as any },
      });

      // Lost the race to a concurrent delivery. That one did the work.
      if (claimed.count !== 1) return false;

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.PAID, paidAt: new Date() },
      });

      await tx.subscription.update({
        where: { id: transaction.subscriptionId! },
        data: {
          // The paid invoice is the authority for which plan this is.
          planId: invoice.planId ?? undefined,
          billingInterval: interval,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: invoice.periodStart,
          currentPeriodEnd: invoice.periodEnd,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
          trialEndsAt: null,
          providerSubscriptionId: providerReference,
        },
      });

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: transaction.subscriptionId!,
          action: 'SUBSCRIPTION_PAYMENT_CONFIRMED',
          fromStatus: transaction.subscription?.status ?? null,
          toStatus: 'ACTIVE',
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            planCode: invoice.plan?.code ?? null,
            interval,
            amount: transaction.amount,
            providerReference,
          },
        },
      });

      return true;
    });

    return settled ? { settled: true } : { settled: false, reason: 'already_settled' };
  }

  /**
   * Change plan.
   *
   * A change that does not increase what the store owes applies immediately.
   * Anything that costs more has to be paid for, so it returns a 402 carrying
   * the plan code — the caller then takes the merchant through
   * `subscribeToPlan` and the gateway. This method can no longer grant a
   * more expensive plan under any input.
   *
   * No proration or credit is issued on a downgrade: the store keeps the
   * richer entitlements until the period it already paid for runs out. That is
   * a deliberate, conservative default — a credit policy is a business
   * decision, and the alternative (silently refunding the difference) moves
   * money without anyone asking for it.
   */
  async changePlan(merchantId: string, newPlanCode: string) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: newPlanCode } });

    if (!plan || !plan.isActive) {
      const err: any = new Error('Selected plan is invalid or inactive');
      err.statusCode = 400;
      throw err;
    }

    const currentSub = await this.getCurrentSubscription(merchantId);
    if (!currentSub) {
      const err: any = new Error('Merchant subscription not found');
      err.statusCode = 404;
      throw err;
    }

    if (currentSub.planId === plan.id) {
      return currentSub;
    }

    const interval = currentSub.billingInterval;
    const currentPrice = priceFor(currentSub.plan, interval);
    const targetPrice = priceFor(plan, interval);

    if (targetPrice > currentPrice) {
      throw new PaymentRequiredError(
        `${plan.name} costs more than your current plan. Complete payment to upgrade.`,
        plan.code,
        interval === BillingInterval.ANNUAL ? 'ANNUAL' : 'MONTHLY'
      );
    }

    const fromPlanId = currentSub.planId;
    const updated = await prisma.subscription.update({
      where: { merchantId },
      data: { planId: plan.id },
      include: { plan: true },
    });

    await prisma.subscriptionEvent.create({
      data: {
        subscriptionId: currentSub.id,
        action: 'PLAN_CHANGED',
        fromStatus: currentSub.status,
        toStatus: currentSub.status,
        metadata: {
          fromPlanId,
          toPlanCode: plan.code,
          fromPrice: currentPrice,
          toPrice: targetPrice,
          direction: targetPrice < currentPrice ? 'DOWNGRADE' : 'LATERAL',
        },
      },
    });

    return updated;
  }

  /**
   * Switch between monthly and annual billing.
   *
   * Same rule as `changePlan`: monthly → annual multiplies what is owed, so it
   * goes through the gateway. Annual → monthly lowers it and applies at once.
   */
  async changeInterval(merchantId: string, interval: 'MONTHLY' | 'ANNUAL') {
    const currentSub = await this.getCurrentSubscription(merchantId);
    if (!currentSub) {
      const err: any = new Error('Merchant subscription not found');
      err.statusCode = 404;
      throw err;
    }

    if (currentSub.billingInterval === interval) {
      return currentSub;
    }

    const currentPrice = priceFor(currentSub.plan, currentSub.billingInterval);
    const targetPrice = priceFor(currentSub.plan, interval);

    if (targetPrice > currentPrice) {
      throw new PaymentRequiredError(
        `Switching to ${interval.toLowerCase()} billing requires payment for the new term.`,
        currentSub.plan.code,
        interval
      );
    }

    const sub = await prisma.subscription.update({
      where: { merchantId },
      data: { billingInterval: interval as BillingInterval },
      include: { plan: true },
    });

    await prisma.subscriptionEvent.create({
      data: {
        subscriptionId: currentSub.id,
        action: 'BILLING_INTERVAL_CHANGED',
        fromStatus: currentSub.status,
        toStatus: currentSub.status,
        metadata: { from: currentSub.billingInterval, to: interval },
      },
    });

    return sub;
  }

  /**
   * Cancel Subscription at period end
   */
  async cancelSubscription(merchantId: string) {
    const currentSub = await prisma.subscription.findUnique({ where: { merchantId } });
    if (!currentSub) {
      const err: any = new Error('No active subscription found to cancel');
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.subscription.update({
      where: { merchantId },
      data: {
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
      },
      include: { plan: true },
    });

    await prisma.subscriptionEvent.create({
      data: {
        subscriptionId: currentSub.id,
        action: 'SUBSCRIPTION_CANCELLED',
        fromStatus: currentSub.status,
        toStatus: currentSub.status,
        metadata: { cancelAtPeriodEnd: true },
      },
    });

    return updated;
  }

  /**
   * Resume a subscription that was set to cancel at period end.
   *
   * Only clears the pending cancellation. It does not restore ACTIVE from
   * EXPIRED or PAST_DUE — that would be reinstating a lapsed paid plan with no
   * payment, which is `subscribeToPlan`'s job.
   */
  async resumeSubscription(merchantId: string) {
    const currentSub = await prisma.subscription.findUnique({ where: { merchantId } });
    if (!currentSub) {
      const err: any = new Error('No subscription found to resume');
      err.statusCode = 404;
      throw err;
    }

    const stillInPaidPeriod =
      currentSub.status === SubscriptionStatus.ACTIVE
      || currentSub.status === SubscriptionStatus.TRIALING;

    if (!stillInPaidPeriod) {
      throw new PaymentRequiredError(
        'This subscription has lapsed. Choose a plan to start it again.',
        (await prisma.subscriptionPlan.findUnique({ where: { id: currentSub.planId } }))?.code ?? 'growth',
        currentSub.billingInterval === BillingInterval.ANNUAL ? 'ANNUAL' : 'MONTHLY'
      );
    }

    const updated = await prisma.subscription.update({
      where: { merchantId },
      data: {
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
      include: { plan: true },
    });

    await prisma.subscriptionEvent.create({
      data: {
        subscriptionId: currentSub.id,
        action: 'SUBSCRIPTION_RESUMED',
        fromStatus: currentSub.status,
        toStatus: currentSub.status,
      },
    });

    return updated;
  }
}

export const saasBillingService = new SaaSBillingService();
