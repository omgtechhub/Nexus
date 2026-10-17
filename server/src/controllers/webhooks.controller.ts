import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { PaymentProvider, PaymentStatus, OrderStatus, PaymentStatus as PrismaPaymentStatus, PayoutStatus } from '@prisma/client';
import { getPaymentProvider } from '../services/payments/payment.factory.js';
import { logger } from '../utils/logger.js';
import { formatMoney } from '../services/email/email.service.js';
import { recordCommissionForPayment, updatePayoutStatus } from '../services/payouts/payout.service.js';

/**
 * Order payment webhooks.
 *
 * Both handlers funnel into `settleOrderPayment`, which is the only thing here
 * that may mark an order paid. Four faults were shared between the two
 * handlers before that existed:
 *
 *  1. **The amount was never checked.** An order was marked PAID on
 *     `charge.success` plus a matching reference, with no comparison between
 *     what the gateway reported taking and what the order cost. Verifying the
 *     amount is the documented requirement for both gateways, and without it a
 *     part-payment settled the order in full.
 *  2. **`webhookEvent.processed` was only set inside the success branch.** Any
 *     other event — a failure, a transfer notification, a charge for an
 *     unknown reference — stayed `processed: false` for ever, so the
 *     idempotency registry recorded deliveries it had in fact finished with and
 *     could never be used to answer "did we handle this?".
 *  3. **Non-success events were silently discarded.** `charge.failed` left the
 *     order PENDING with no record of why, so a merchant looking at a stuck
 *     order had nothing to go on.
 *  4. **The settlement was not idempotent against a concurrent delivery.**
 *     Two deliveries of the same event — which both gateways do on retry —
 *     could each write a CHARGE row into the ledger.
 */

/** A settlement outcome, for the response and the log. */
type SettleResult =
  | { status: 'settled' }
  | { status: 'skipped'; reason: string };

/**
 * Mark an order paid, exactly once, and only for the right amount.
 *
 * `verifiedAmount` is what the gateway said it took, in the major unit. A
 * shortfall is recorded and the order is left unpaid: a human has to decide
 * whether a part-payment is acceptable, and quietly fulfilling an order that
 * was underpaid is not a decision code should make.
 */
async function settleOrderPayment(params: {
  providerReference: string;
  provider: PaymentProvider;
  verifiedAmount?: number;
  verifiedCurrency?: string;
  rawResponse: unknown;
}): Promise<SettleResult> {
  const { providerReference, verifiedAmount, verifiedCurrency, rawResponse } = params;

  const payment = await prisma.payment.findUnique({
    where: { providerReference },
    include: { order: true },
  });

  if (!payment) return { status: 'skipped', reason: 'unknown_reference' };

  if (payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.PAID) {
    return { status: 'skipped', reason: 'already_paid' };
  }

  // Tolerance for the gateway's own minor-unit rounding, not for a discount.
  if (typeof verifiedAmount === 'number' && verifiedAmount + 0.01 < payment.amount) {
    logger.error({
      msg: 'Webhook reported less than the order total; order NOT marked paid',
      providerReference,
      orderNumber: payment.order.orderNumber,
      expected: payment.amount,
      received: verifiedAmount,
      currency: payment.currency,
    });
    return { status: 'skipped', reason: 'amount_mismatch' };
  }

  if (
    verifiedCurrency
    && payment.currency
    && verifiedCurrency.toUpperCase() !== payment.currency.toUpperCase()
  ) {
    // 5000 NGN is not 5000 USD. Without this the figures match numerically
    // while the money does not.
    logger.error({
      msg: 'Webhook currency does not match the order currency; order NOT marked paid',
      providerReference,
      orderNumber: payment.order.orderNumber,
      expected: payment.currency,
      received: verifiedCurrency,
    });
    return { status: 'skipped', reason: 'currency_mismatch' };
  }

  const settled = await prisma.$transaction(async (tx) => {
    // Claim the transition with the status in the predicate, so a retried
    // delivery racing the first one writes nothing.
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] } },
      data: { status: PaymentStatus.SUCCESS },
    });

    if (claimed.count !== 1) return false;

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
        providerReference,
        rawResponse: rawResponse as any,
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: payment.orderId,
        fromStatus: OrderStatus.PENDING,
        toStatus: OrderStatus.CONFIRMED,
        // Was hardcoded to a dollar sign on a platform billing in naira.
        note: `${params.provider} webhook: payment of ${formatMoney(payment.amount, payment.currency)} confirmed`,
      },
    });

    // Fix the platform/merchant split at settlement time, so the merchant's
    // payout balance has something to sum and a later commission change never
    // re-values this sale.
    await recordCommissionForPayment(payment.id, tx);

    return true;
  });

  return settled ? { status: 'settled' } : { status: 'skipped', reason: 'already_paid' };
}

/**
 * Record a settled failure against the order.
 *
 * Inventory is deliberately **not** released here. The order path reserves
 * stock at checkout and `payments.controller.ts` releases it on a verified
 * failure, claiming the transition so it happens once; doing it here as well
 * would be the same double-release this pass removed from that endpoint.
 */
async function recordFailedPayment(providerReference: string, reason?: string): Promise<SettleResult> {
  const payment = await prisma.payment.findUnique({ where: { providerReference } });
  if (!payment) return { status: 'skipped', reason: 'unknown_reference' };

  if (payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.PAID) {
    // A failure notice arriving after a success is not authority to unpay an
    // order.
    logger.warn({
      msg: 'Failure webhook for an already-paid payment; ignored',
      providerReference,
    });
    return { status: 'skipped', reason: 'already_paid' };
  }

  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, status: PaymentStatus.PENDING },
    data: { status: PaymentStatus.FAILED },
  });

  if (claimed.count !== 1) return { status: 'skipped', reason: 'already_settled' };

  await prisma.order.update({
    where: { id: payment.orderId },
    data: { paymentStatus: PrismaPaymentStatus.FAILED },
  });

  logger.warn({
    msg: 'Payment failed at the gateway',
    providerReference,
    orderId: payment.orderId,
    reason,
  });

  return { status: 'settled' };
}


/**
 * Apply a `transfer.*` webhook to the payout it names.
 *
 * Matched on our own payout reference rather than Paystack's transfer code:
 * the reference is what we generated and stored first, so it survives a
 * transfer code going missing between initiation and confirmation.
 */
async function settleTransfer(event: string, data: any): Promise<SettleResult> {
  const reference = data?.reference;
  const transferCode = data?.transfer_code;

  const payout = reference
    ? await prisma.payout.findUnique({ where: { reference } })
    : transferCode
      ? await prisma.payout.findFirst({ where: { providerReference: transferCode } })
      : null;

  if (!payout) return { status: 'skipped', reason: 'unknown_payout' };

  const status =
    event === 'transfer.success'
      ? PayoutStatus.PAID
      : event === 'transfer.reversed'
        ? PayoutStatus.REVERSED
        : event === 'transfer.failed'
          ? PayoutStatus.FAILED
          : null;

  if (!status) return { status: 'skipped', reason: 'unhandled_transfer_event' };

  try {
    await updatePayoutStatus({
      payoutId: payout.id,
      status,
      providerReference: transferCode,
      failureReason: status === PayoutStatus.FAILED
        ? (data?.gateway_response || data?.message || 'Paystack reported the transfer failed')
        : undefined,
    });
  } catch (err: any) {
    // An illegal transition means we already have a later, more settled
    // answer; a redelivery of an earlier event must not undo it.
    logger.warn({
      msg: 'Transfer webhook did not apply',
      reference: payout.reference,
      event,
      error: err?.message,
    });
    return { status: 'skipped', reason: 'invalid_transition' };
  }

  logger.info({ msg: 'Payout settled by webhook', reference: payout.reference, event });
  return { status: 'settled' };
}

/** Flag the registry row as handled, whatever the outcome was. */
async function markProcessed(eventId: string): Promise<void> {
  await prisma.webhookEvent.updateMany({
    where: { eventId },
    data: { processed: true, processedAt: new Date() },
  });
}

/**
 * Paystack.
 *
 * Signature is HMAC-SHA512 of the raw body against the secret key, checked by
 * the provider. Amounts arrive in the minor unit (kobo).
 */
export async function handlePaystackWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = (req.headers['x-paystack-signature'] as string) || '';
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const provider = getPaymentProvider('PAYSTACK');
    if (!provider.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
    }

    const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data || {};
    const reference = data.reference;
    const eventId = payload.id ? String(payload.id) : `pstk_evt_${event || 'unknown'}_${reference || Date.now()}`;

    const existingEvent = await prisma.webhookEvent.findUnique({ where: { eventId } });
    if (existingEvent?.processed) {
      return res.status(200).json({ received: true, note: 'Event already processed' });
    }

    await prisma.webhookEvent.upsert({
      where: { eventId },
      create: {
        provider: PaymentProvider.PAYSTACK,
        eventId,
        eventType: event || 'unknown',
        payload: payload as any,
        processed: false,
      },
      update: { eventType: event || 'unknown' },
    });

    let outcome: SettleResult = { status: 'skipped', reason: 'unhandled_event' };

    if (event === 'charge.success' && reference) {
      outcome = await settleOrderPayment({
        providerReference: reference,
        provider: PaymentProvider.PAYSTACK,
        verifiedAmount: typeof data.amount === 'number' ? data.amount / 100 : undefined,
        verifiedCurrency: data.currency,
        rawResponse: data,
      });
    } else if ((event === 'charge.failed' || event === 'charge.abandoned') && reference) {
      outcome = await recordFailedPayment(reference, data.gateway_response);
    } else if (event?.startsWith?.('transfer.')) {
      /**
       * A merchant payout reaching its conclusion.
       *
       * `executePayout` leaves the payout PROCESSING and these events are what
       * settle it — the same discipline as a charge, where the initialize
       * response is never the answer. Previously these arrived, matched
       * nothing, and were filed as `unhandled_event`.
       */
      outcome = await settleTransfer(event, data);
    }

    // Outside every branch: a delivery we have finished with is processed,
    // including one we had no handler for.
    await markProcessed(eventId);

    return res.status(200).json({ status: true, message: 'Webhook processed', outcome });
  } catch (error) {
    next(error);
  }
}

/**
 * Flutterwave.
 *
 * Signature is the dashboard secret hash in `verif-hash`, compared in constant
 * time by the provider — there is no fallback, so an unset
 * `FLUTTERWAVE_WEBHOOK_SECRET` rejects everything. Amounts arrive in the major
 * unit.
 */
export async function handleFlutterwaveWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = (req.headers['verif-hash'] as string) || '';
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const provider = getPaymentProvider('FLUTTERWAVE');
    if (!provider.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
    }

    const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    const data = payload.data || payload;
    const reference = data.tx_ref || data.reference;
    const event = payload.event || payload['event.type'];
    const eventId = payload.id
      ? String(payload.id)
      : `flw_evt_${event || 'unknown'}_${reference || Date.now()}`;

    const existingEvent = await prisma.webhookEvent.findUnique({ where: { eventId } });
    if (existingEvent?.processed) {
      return res.status(200).json({ status: 'success', note: 'Event already processed' });
    }

    await prisma.webhookEvent.upsert({
      where: { eventId },
      create: {
        provider: PaymentProvider.FLUTTERWAVE,
        eventId,
        eventType: event || 'unknown',
        payload: payload as any,
        processed: false,
      },
      update: { eventType: event || 'unknown' },
    });

    let outcome: SettleResult = { status: 'skipped', reason: 'unhandled_event' };

    // The status is what decides, not merely that an event arrived. The old
    // condition `data.status === 'successful' || event === 'charge.completed'`
    // treated a *failed* charge.completed as a success, because Flutterwave
    // sends that same event type for both outcomes.
    const succeeded = String(data.status || '').toLowerCase() === 'successful';
    const failed = ['failed', 'cancelled'].includes(String(data.status || '').toLowerCase());

    if (reference && succeeded) {
      outcome = await settleOrderPayment({
        providerReference: reference,
        provider: PaymentProvider.FLUTTERWAVE,
        verifiedAmount: typeof data.amount === 'number' ? data.amount : undefined,
        verifiedCurrency: data.currency,
        rawResponse: data,
      });
    } else if (reference && failed) {
      outcome = await recordFailedPayment(reference, data.processor_response);
    }

    await markProcessed(eventId);

    return res.status(200).json({ status: 'success', message: 'Webhook processed', outcome });
  } catch (error) {
    next(error);
  }
}
