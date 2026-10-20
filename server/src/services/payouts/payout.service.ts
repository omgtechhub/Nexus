import crypto from 'crypto';
import { prisma } from '../../prisma.js';
import { PaymentStatus, PayoutStatus, PayoutMethod, Prisma } from '@prisma/client';
import { splitPayment, commissionRate } from './commission.js';
import { logger } from '../../utils/logger.js';
import {
  initiateTransfer,
  transfersConfigured,
  TransferError,
} from './paystackTransfer.service.js';
import { currencyCodeOf } from '../../config/currency.js';

/**
 * What the platform owes each merchant, and the record of settling it.
 *
 * There was no payout subsystem at all. Every customer payment landed in the
 * platform's own gateway account, nothing recorded what was owed to whom, and
 * there was no mechanism — automated or manual — to pay a merchant. Meanwhile
 * `services/ai/concierge.service.ts` already answered merchant questions about
 * payouts by pointing at a dashboard section that showed their charges.
 *
 * **The balance is derived, not stored.** It is computed from the money events
 * already recorded — settled payments, refunds, and payouts made — rather than
 * kept as a mutable running total. A stored balance is a second source of
 * truth that drifts from the transactions the moment anything goes wrong, and
 * reconciling it afterwards is guesswork. The trade-off is that a balance read
 * costs three aggregates, which is irrelevant at this scale.
 */

export interface MerchantBalance {
  currency: string;
  /** Merchant's share of every settled payment, lifetime. */
  grossEarned: number;
  /** Platform commission withheld, lifetime. */
  platformFees: number;
  /** Refunded to customers, deducted from what is owed. */
  refunded: number;
  /** Already paid out, or in flight. */
  paidOut: number;
  pendingPayouts: number;
  /** What could be paid out right now. */
  available: number;
  commissionRate: number;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Attach the commission split to a payment that has just settled.
 *
 * Idempotent: it only writes where `merchantNetAmount` is still null, so a
 * webhook redelivery cannot re-split a payment at a rate that has since
 * changed.
 */
export async function recordCommissionForPayment(
  paymentId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<void> {
  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, amount: true, merchantNetAmount: true },
  });

  if (!payment || payment.merchantNetAmount !== null) return;

  const split = splitPayment(payment.amount);

  await tx.payment.updateMany({
    where: { id: payment.id, merchantNetAmount: null },
    data: {
      commissionRate: split.commissionRate,
      platformFeeAmount: split.platformFeeAmount,
      merchantNetAmount: split.merchantNetAmount,
    },
  });
}

/**
 * Backfill the split for payments that settled before commission existed.
 *
 * Every payment taken before this subsystem was added has a null net, which
 * would silently read as a zero balance. Run once at startup; it is cheap and
 * idempotent.
 */
export async function backfillMissingCommissions(): Promise<number> {
  const settled = await prisma.payment.findMany({
    where: {
      status: { in: [PaymentStatus.SUCCESS, PaymentStatus.PAID] },
      merchantNetAmount: null,
    },
    select: { id: true, amount: true },
    take: 5000,
  });

  if (settled.length === 0) return 0;

  // The rate in force now is applied, because there is no record of what was
  // agreed when these were taken — which is exactly why it is captured per
  // payment from here on.
  for (const payment of settled) {
    const split = splitPayment(payment.amount);
    await prisma.payment.updateMany({
      where: { id: payment.id, merchantNetAmount: null },
      data: {
        commissionRate: split.commissionRate,
        platformFeeAmount: split.platformFeeAmount,
        merchantNetAmount: split.merchantNetAmount,
      },
    });
  }

  logger.info({ msg: 'Backfilled merchant commission split', payments: settled.length });
  return settled.length;
}

/** What a store is owed right now. */
export async function merchantBalance(merchantId: string): Promise<MerchantBalance> {
  const [merchant, earnings, refunds, payouts] = await Promise.all([
    prisma.merchant.findUnique({ where: { id: merchantId }, select: { currency: true } }),
    prisma.payment.aggregate({
      where: {
        merchantId,
        status: { in: [PaymentStatus.SUCCESS, PaymentStatus.PAID] },
      },
      _sum: { merchantNetAmount: true, platformFeeAmount: true },
    }),
    prisma.refund.aggregate({
      where: { merchantId, status: 'SUCCESS' },
      _sum: { amount: true },
    }),
    prisma.payout.groupBy({
      by: ['status'],
      where: { merchantId },
      _sum: { amount: true },
    }),
  ]);

  const grossEarned = round2(earnings._sum.merchantNetAmount ?? 0);
  const platformFees = round2(earnings._sum.platformFeeAmount ?? 0);
  const refunded = round2(refunds._sum.amount ?? 0);

  const sumFor = (statuses: PayoutStatus[]) =>
    round2(
      payouts
        .filter(row => statuses.includes(row.status))
        .reduce((total, row) => total + (row._sum.amount ?? 0), 0)
    );

  // A FAILED or REVERSED payout did not reach the merchant, so it does not
  // reduce what they are owed.
  const paidOut = sumFor([PayoutStatus.PAID]);
  const pendingPayouts = sumFor([PayoutStatus.PENDING, PayoutStatus.PROCESSING]);

  return {
    currency: currencyCodeOf(merchant?.currency),
    grossEarned,
    platformFees,
    refunded,
    paidOut,
    pendingPayouts,
    // Never negative: a refund larger than the balance is a debt to track, not
    // a negative number to offer as payable.
    available: Math.max(0, round2(grossEarned - refunded - paidOut - pendingPayouts)),
    commissionRate: commissionRate(),
  };
}

export class PayoutError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message);
    this.name = 'PayoutError';
  }
}

/**
 * Create a payout against a merchant's available balance.
 *
 * Nothing here moves money. It records an obligation as PENDING; a platform
 * admin confirms it once paid, or a provider transfer does. The amount is
 * checked against the derived balance inside a transaction, so two admins
 * acting at once cannot together pay out more than is owed.
 */
export async function createPayout(params: {
  merchantId: string;
  amount?: number;
  method?: PayoutMethod;
  note?: string;
  initiatedByUserId?: string;
  periodStart?: Date;
  periodEnd?: Date;
}): Promise<{ id: string; reference: string; amount: number; currency: string; status: PayoutStatus }> {
  const balance = await merchantBalance(params.merchantId);

  const amount = round2(params.amount ?? balance.available);

  if (amount <= 0) {
    throw new PayoutError('There is nothing available to pay out for this merchant.');
  }

  if (amount > balance.available) {
    throw new PayoutError(
      `Requested ${amount} exceeds the available balance of ${balance.available}.`
    );
  }

  const reference = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto
    .randomBytes(3)
    .toString('hex')
    .toUpperCase()}`;

  const payout = await prisma.payout.create({
    data: {
      merchantId: params.merchantId,
      reference,
      amount,
      currency: balance.currency,
      status: PayoutStatus.PENDING,
      method: params.method ?? PayoutMethod.MANUAL,
      note: params.note,
      initiatedByUserId: params.initiatedByUserId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
    },
  });

  logger.info({
    msg: 'Payout created',
    payoutId: payout.id,
    reference,
    merchantId: params.merchantId,
    amount,
  });

  return {
    id: payout.id,
    reference: payout.reference,
    amount: payout.amount,
    currency: payout.currency,
    status: payout.status,
  };
}

/**
 * Send a created payout to Paystack.
 *
 * Deliberately a separate step from `createPayout`. Creating the obligation
 * and moving the money are different actions with different failure modes: a
 * transfer that cannot start must not lose the record of what is owed, and an
 * admin must be able to create a payout now and release it later.
 *
 * The payout goes to PROCESSING, never straight to PAID. Paystack transfers
 * are asynchronous — the response says `otp`, `pending` or `success` and the
 * real outcome arrives as a `transfer.success` / `transfer.failed` /
 * `transfer.reversed` webhook. Treating the initial response as final is the
 * same mistake as treating a charge's initialize response as a payment.
 */
export async function executePayout(payoutId: string): Promise<{ status: PayoutStatus; detail?: string }> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { merchant: { include: { payoutAccount: true } } },
  });

  if (!payout) throw new PayoutError('Payout not found', 404);

  if (payout.status !== PayoutStatus.PENDING) {
    throw new PayoutError(`Only a PENDING payout can be sent; this one is ${payout.status}.`);
  }

  if (!transfersConfigured()) {
    throw new PayoutError(
      'Paystack is not configured, so this payout cannot be sent automatically. Pay it by another means and mark it PAID.',
      503
    );
  }

  const account = payout.merchant.payoutAccount;

  if (!account?.providerRecipientId) {
    throw new PayoutError(
      account
        ? 'This payout account has not been verified with Paystack, so there is no recipient to send to.'
        : 'This merchant has not added a payout account yet.',
      409
    );
  }

  // Claim the transition before calling out, so a double-click cannot send
  // the same money twice.
  const claimed = await prisma.payout.updateMany({
    where: { id: payout.id, status: PayoutStatus.PENDING },
    data: { status: PayoutStatus.PROCESSING, method: PayoutMethod.PROVIDER_TRANSFER },
  });

  if (claimed.count !== 1) {
    throw new PayoutError('This payout is already being sent.');
  }

  try {
    const result = await initiateTransfer({
      recipientCode: account.providerRecipientId,
      amount: payout.amount,
      currency: payout.currency,
      reference: payout.reference,
      reason: payout.note || `Nexus payout ${payout.reference}`,
    });

    await prisma.payout.update({
      where: { id: payout.id },
      data: { providerReference: result.transferCode },
    });

    logger.info({
      msg: 'Payout transfer initiated',
      payoutId: payout.id,
      reference: payout.reference,
      transferCode: result.transferCode,
      paystackStatus: result.status,
    });

    return {
      status: PayoutStatus.PROCESSING,
      detail: result.requiresOtp
        ? 'Paystack is holding this transfer for OTP confirmation. It will not complete until the code is entered on the Paystack dashboard; turn OTP off there for fully automated payouts.'
        : 'Transfer sent. Paystack will confirm by webhook.',
    };
  } catch (err: any) {
    /**
     * Put it back to PENDING rather than marking it FAILED.
     *
     * The money did not move, and the merchant is still owed it — a FAILED
     * payout would drop out of the balance calculation and quietly write off
     * the debt. An unreachable gateway in particular says nothing about
     * whether a retry will work.
     */
    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        status: PayoutStatus.PENDING,
        method: PayoutMethod.MANUAL,
        failureReason: err?.message ?? 'Transfer could not be started',
      },
    });

    logger.error({
      msg: 'Payout transfer could not be started; returned to PENDING',
      payoutId: payout.id,
      error: err?.message,
    });

    throw new PayoutError(
      err instanceof TransferError
        ? `Paystack refused the transfer: ${err.message}`
        : 'The transfer could not be started.',
      502
    );
  }
}

/** Legal status transitions. Anything else is a mistake, not an instruction. */
const ALLOWED_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  PENDING: [PayoutStatus.PROCESSING, PayoutStatus.PAID, PayoutStatus.FAILED],
  // A reversal can arrive straight after a success, before anyone looks.
  PROCESSING: [PayoutStatus.PAID, PayoutStatus.FAILED, PayoutStatus.PENDING, PayoutStatus.REVERSED],
  PAID: [PayoutStatus.REVERSED],
  FAILED: [PayoutStatus.PENDING],
  REVERSED: [],
};

export async function updatePayoutStatus(params: {
  payoutId: string;
  status: PayoutStatus;
  providerReference?: string;
  failureReason?: string;
}) {
  const payout = await prisma.payout.findUnique({ where: { id: params.payoutId } });
  if (!payout) throw new PayoutError('Payout not found', 404);

  if (payout.status === params.status) return payout;

  if (!ALLOWED_TRANSITIONS[payout.status].includes(params.status)) {
    throw new PayoutError(
      `A payout that is ${payout.status} cannot become ${params.status}.`
    );
  }

  const updated = await prisma.payout.update({
    where: { id: payout.id },
    data: {
      status: params.status,
      providerReference: params.providerReference ?? payout.providerReference,
      failureReason: params.status === PayoutStatus.FAILED ? params.failureReason : null,
      paidAt: params.status === PayoutStatus.PAID ? new Date() : payout.paidAt,
    },
  });

  logger.info({
    msg: 'Payout status changed',
    payoutId: updated.id,
    from: payout.status,
    to: updated.status,
  });

  return updated;
}
