import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { getPaymentProvider } from '../services/payments/payment.factory.js';

export async function handlePaystackSaaSWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = (req.headers['x-paystack-signature'] as string) || '';
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const provider = getPaymentProvider('PAYSTACK');
    const isValid = provider.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid SaaS webhook signature' });
      return;
    }

    const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data || {};
    const eventId = payload.id ? String(payload.id) : `saas_pstk_${data.reference || Date.now()}`;

    // 1. Idempotency Check
    const existing = await prisma.saasWebhookEvent.findUnique({ where: { eventId } });
    if (existing && existing.processed) {
      res.status(200).json({ received: true, note: 'SaaS event already processed' });
      return;
    }

    await prisma.saasWebhookEvent.upsert({
      where: { eventId },
      create: {
        provider: 'PAYSTACK',
        eventId,
        eventType: event || 'subscription.create',
        payload: payload as any,
        processed: false,
      },
      update: { eventType: event || 'subscription.create' },
    });

    if ((event === 'charge.success' || event === 'subscription.create') && data.reference) {
      const transaction = await prisma.billingTransaction.findUnique({
        where: { providerReference: data.reference },
        include: { subscription: true },
      });

      if (transaction && transaction.subscription) {
        await prisma.$transaction([
          prisma.subscription.update({
            where: { id: transaction.subscriptionId! },
            data: { status: 'ACTIVE' },
          }),
          prisma.saasWebhookEvent.update({
            where: { eventId },
            data: { processed: true, processedAt: new Date() },
          }),
        ]);
      }
    }

    res.status(200).json({ status: true, message: 'SaaS webhook processed' });
  } catch (err) {
    next(err);
  }
}

export async function handleFlutterwaveSaaSWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = (req.headers['verif-hash'] as string) || '';
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const provider = getPaymentProvider('FLUTTERWAVE');
    const isValid = provider.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid SaaS webhook signature' });
      return;
    }

    const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    const data = payload.data || payload;
    const reference = data.tx_ref || data.reference;
    const eventId = payload.id ? String(payload.id) : `saas_flw_${reference || Date.now()}`;

    const existing = await prisma.saasWebhookEvent.findUnique({ where: { eventId } });
    if (existing && existing.processed) {
      res.status(200).json({ status: 'success', note: 'SaaS event already processed' });
      return;
    }

    await prisma.saasWebhookEvent.upsert({
      where: { eventId },
      create: {
        provider: 'FLUTTERWAVE',
        eventId,
        eventType: payload.event || 'charge.completed',
        payload: payload as any,
        processed: false,
      },
      update: { eventType: payload.event || 'charge.completed' },
    });

    if (reference) {
      const transaction = await prisma.billingTransaction.findUnique({
        where: { providerReference: reference },
        include: { subscription: true },
      });

      if (transaction && transaction.subscription) {
        await prisma.$transaction([
          prisma.subscription.update({
            where: { id: transaction.subscriptionId! },
            data: { status: 'ACTIVE' },
          }),
          prisma.saasWebhookEvent.update({
            where: { eventId },
            data: { processed: true, processedAt: new Date() },
          }),
        ]);
      }
    }

    res.status(200).json({ status: 'success', message: 'SaaS webhook processed' });
  } catch (err) {
    next(err);
  }
}
