import { prisma } from '../../prisma.js';
import { SubscriptionStatus, BillingInterval, InvoiceStatus } from '@prisma/client';
import crypto from 'crypto';
import { logAuditEvent } from '../../utils/auditLogger.js';
import { getPaymentProvider } from '../payments/payment.factory.js';

export class SaaSBillingService {
  /**
   * Get active or fallback subscription for a store
   */
  async getCurrentSubscription(storeId: string) {
    let sub = await prisma.subscription.findUnique({
      where: { storeId },
      include: {
        plan: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { items: true },
        },
      },
    });

    if (!sub) {
      // Auto-initialize default active trial/subscription for growth plan
      const defaultPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'growth' } })
        || await prisma.subscriptionPlan.findFirst({ where: { isActive: true } });

      if (defaultPlan) {
        const periodStart = new Date();
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        sub = await prisma.subscription.create({
          data: {
            storeId,
            planId: defaultPlan.id,
            billingInterval: BillingInterval.MONTHLY,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
          include: {
            plan: true,
            invoices: {
              orderBy: { createdAt: 'desc' },
              take: 10,
              include: { items: true },
            },
          },
        });
      }
    }

    return sub;
  }

  /**
   * Subscribe or checkout plan
   */
  async subscribeToPlan(storeId: string, userEmail: string, userName: string, planCode: string, interval: 'MONTHLY' | 'ANNUAL', providerName: 'PAYSTACK' | 'FLUTTERWAVE' = 'PAYSTACK') {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { code: planCode },
    });

    if (!plan || !plan.isActive) {
      const err: any = new Error(`Subscription plan "${planCode}" is inactive or invalid.`);
      err.statusCode = 400;
      throw err;
    }

    const price = interval === 'ANNUAL' ? plan.annualPrice : plan.monthlyPrice;
    const ref = `saas_sub_${crypto.randomBytes(8).toString('hex')}`;
    const provider = getPaymentProvider(providerName);

    // Initialize SaaS subscription payment with provider
    const initRes = await provider.initializePayment({
      amount: price,
      currency: plan.currency,
      email: userEmail,
      reference: ref,
      customerName: userName,
      metadata: { storeId, planCode, interval, type: 'SAAS_SUBSCRIPTION' },
    });

    const periodStart = new Date();
    const days = interval === 'ANNUAL' ? 365 : 30;
    const periodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Upsert subscription record
    const sub = await prisma.subscription.upsert({
      where: { storeId },
      create: {
        storeId,
        planId: plan.id,
        billingInterval: interval as BillingInterval,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        providerSubscriptionId: ref,
      },
      update: {
        planId: plan.id,
        billingInterval: interval as BillingInterval,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
      include: { plan: true },
    });

    // Create Invoice
    const invoiceNumber = `NX-INV-${Date.now().toString().slice(-6)}`;
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        storeId,
        subscriptionId: sub.id,
        planId: plan.id,
        status: InvoiceStatus.PAID,
        subtotal: price,
        tax: 0,
        total: price,
        currency: plan.currency,
        periodStart,
        periodEnd,
        paidAt: new Date(),
        items: {
          create: [{ description: `${plan.name} (${interval})`, amount: price, quantity: 1 }],
        },
      },
    });

    // Create Transaction Record
    await prisma.billingTransaction.create({
      data: {
        storeId,
        subscriptionId: sub.id,
        invoiceId: invoice.id,
        amount: price,
        currency: plan.currency,
        type: 'SUBSCRIPTION_CHARGE',
        status: 'SUCCESS',
        provider: providerName,
        providerReference: ref,
      },
    });

    // Audit Log
    await logAuditEvent({
      storeId,
      userId: undefined,
      actorName: userName,
      actorEmail: userEmail,
      action: 'SAAS_SUBSCRIPTION_UPDATED',
      resource: 'subscription',
      resourceId: sub.id,
      metadata: { planCode, interval, price },
    });

    return {
      subscription: sub,
      invoice,
      authorizationUrl: initRes.authorizationUrl,
      reference: ref,
    };
  }

  /**
   * Change Subscription Plan (Upgrade / Downgrade)
   */
  async changePlan(storeId: string, newPlanCode: string) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { code: newPlanCode },
    });

    if (!plan || !plan.isActive) {
      const err: any = new Error('Selected plan is invalid or inactive');
      err.statusCode = 400;
      throw err;
    }

    const currentSub = await this.getCurrentSubscription(storeId);
    if (!currentSub) {
      const err: any = new Error('Store subscription not found');
      err.statusCode = 404;
      throw err;
    }

    const fromPlanId = currentSub.planId;
    const updated = await prisma.subscription.update({
      where: { storeId },
      data: {
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
      },
      include: { plan: true },
    });

    await prisma.subscriptionEvent.create({
      data: {
        subscriptionId: currentSub.id,
        action: 'PLAN_CHANGED',
        fromStatus: currentSub.status,
        toStatus: 'ACTIVE',
        metadata: { fromPlanId, toPlanCode: plan.code },
      },
    });

    return updated;
  }

  /**
   * Toggle Monthly / Annual billing interval
   */
  async changeInterval(storeId: string, interval: 'MONTHLY' | 'ANNUAL') {
    const sub = await prisma.subscription.update({
      where: { storeId },
      data: {
        billingInterval: interval as BillingInterval,
      },
      include: { plan: true },
    });
    return sub;
  }

  /**
   * Cancel Subscription at period end
   */
  async cancelSubscription(storeId: string) {
    const currentSub = await prisma.subscription.findUnique({ where: { storeId } });
    if (!currentSub) {
      const err: any = new Error('No active subscription found to cancel');
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.subscription.update({
      where: { storeId },
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
   * Resume cancelled subscription
   */
  async resumeSubscription(storeId: string) {
    const currentSub = await prisma.subscription.findUnique({ where: { storeId } });
    if (!currentSub) {
      const err: any = new Error('No subscription found to resume');
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.subscription.update({
      where: { storeId },
      data: {
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        status: SubscriptionStatus.ACTIVE,
      },
      include: { plan: true },
    });

    await prisma.subscriptionEvent.create({
      data: {
        subscriptionId: currentSub.id,
        action: 'SUBSCRIPTION_RESUMED',
        fromStatus: currentSub.status,
        toStatus: 'ACTIVE',
      },
    });

    return updated;
  }
}

export const saasBillingService = new SaaSBillingService();
