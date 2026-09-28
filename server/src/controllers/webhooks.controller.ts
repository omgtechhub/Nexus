import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { PaymentProvider, PaymentStatus, OrderStatus, PaymentStatus as PrismaPaymentStatus } from '@prisma/client';
import { getPaymentProvider } from '../services/payments/payment.factory.js';

/**
 * Paystack Webhook Handler (Signature Verified & Idempotent)
 */
export async function handlePaystackWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = (req.headers['x-paystack-signature'] as string) || '';
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const provider = getPaymentProvider('PAYSTACK');
    const isValid = provider.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
    }

    const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data || {};
    const eventId = payload.id ? String(payload.id) : `pstk_evt_${data.reference || Date.now()}`;

    // 1. Check Webhook Idempotency Registry
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent && existingEvent.processed) {
      return res.status(200).json({ received: true, note: 'Event already processed' });
    }

    // Record Event in Registry
    await prisma.webhookEvent.upsert({
      where: { eventId },
      create: {
        provider: PaymentProvider.PAYSTACK,
        eventId,
        eventType: event || 'charge.success',
        payload: payload as any,
        processed: false,
      },
      update: {
        eventType: event || 'charge.success',
      },
    });

    if (event === 'charge.success' && data.reference) {
      const payment = await prisma.payment.findUnique({
        where: { providerReference: data.reference },
        include: { order: true },
      });

      if (payment && payment.status !== PaymentStatus.SUCCESS && payment.status !== PaymentStatus.PAID) {
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.SUCCESS },
          });

          await tx.order.update({
            where: { id: payment.orderId },
            data: {
              paymentStatus: PrismaPaymentStatus.PAID,
              status: OrderStatus.CONFIRMED,
            },
          });

          await tx.transaction.create({
            data: {
              paymentId: payment.id,
              storeId: payment.storeId,
              type: 'CHARGE',
              amount: payment.amount,
              currency: payment.currency,
              status: 'SUCCESS',
              providerReference: data.reference,
              rawResponse: data as any,
            },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: payment.orderId,
              fromStatus: OrderStatus.PENDING,
              toStatus: OrderStatus.CONFIRMED,
              note: `Paystack webhook: Payment of $${payment.amount.toFixed(2)} confirmed`,
            },
          });

          await tx.webhookEvent.update({
            where: { eventId },
            data: { processed: true, processedAt: new Date() },
          });
        });
      }
    }

    return res.status(200).json({ status: true, message: 'Webhook processed successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * Flutterwave Webhook Handler (Signature Verified & Idempotent)
 */
export async function handleFlutterwaveWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = (req.headers['verif-hash'] as string) || '';
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const provider = getPaymentProvider('FLUTTERWAVE');
    const isValid = provider.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
    }

    const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    const data = payload.data || payload;
    const reference = data.tx_ref || data.reference;
    const eventId = payload.id ? String(payload.id) : `flw_evt_${reference || Date.now()}`;

    // Check Webhook Idempotency Registry
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent && existingEvent.processed) {
      return res.status(200).json({ status: 'success', note: 'Event already processed' });
    }

    await prisma.webhookEvent.upsert({
      where: { eventId },
      create: {
        provider: PaymentProvider.FLUTTERWAVE,
        eventId,
        eventType: payload.event || 'charge.completed',
        payload: payload as any,
        processed: false,
      },
      update: {
        eventType: payload.event || 'charge.completed',
      },
    });

    if ((data.status === 'successful' || payload.event === 'charge.completed') && reference) {
      const payment = await prisma.payment.findUnique({
        where: { providerReference: reference },
        include: { order: true },
      });

      if (payment && payment.status !== PaymentStatus.SUCCESS && payment.status !== PaymentStatus.PAID) {
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.SUCCESS },
          });

          await tx.order.update({
            where: { id: payment.orderId },
            data: {
              paymentStatus: PrismaPaymentStatus.PAID,
              status: OrderStatus.CONFIRMED,
            },
          });

          await tx.transaction.create({
            data: {
              paymentId: payment.id,
              storeId: payment.storeId,
              type: 'CHARGE',
              amount: payment.amount,
              currency: payment.currency,
              status: 'SUCCESS',
              providerReference: reference,
              rawResponse: data as any,
            },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: payment.orderId,
              fromStatus: OrderStatus.PENDING,
              toStatus: OrderStatus.CONFIRMED,
              note: `Flutterwave webhook: Payment of $${payment.amount.toFixed(2)} confirmed`,
            },
          });

          await tx.webhookEvent.update({
            where: { eventId },
            data: { processed: true, processedAt: new Date() },
          });
        });
      }
    }

    return res.status(200).json({ status: 'success', message: 'Webhook processed successfully' });
  } catch (error) {
    next(error);
  }
}
