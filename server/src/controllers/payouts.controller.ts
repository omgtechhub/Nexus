import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { PayoutStatus, PayoutMethod } from '@prisma/client';
import {
  merchantBalance,
  createPayout,
  updatePayoutStatus,
  executePayout,
  PayoutError,
} from '../services/payouts/payout.service.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import {
  resolveBankAccount,
  createTransferRecipient,
  transfersConfigured,
} from '../services/payouts/paystackTransfer.service.js';
import { currencyCodeOf } from '../config/currency.js';
import { logger } from '../utils/logger.js';

/**
 * Merchant payouts.
 *
 * Split deliberately into a merchant-facing half (read your own balance and
 * history, set where the money goes) and a platform-facing half (create a
 * payout, confirm it, mark it failed). A merchant cannot create or approve
 * their own payout — that is the platform paying money out, and it belongs
 * behind the admin guard.
 */

const payoutAccountSchema = z.object({
  accountName: z.string().min(2, 'Account name is required'),
  bankName: z.string().min(2, 'Bank name is required'),
  bankCode: z.string().min(1, 'Bank code is required'),
  // Taken once, used to register the destination with the provider, and never
  // stored in full — only the last four digits are kept. See the note on the
  // MerchantPayoutAccount model.
  accountNumber: z.string().regex(/^\d{6,20}$/, 'Enter the account number, digits only'),
});

const createPayoutSchema = z.object({
  merchantId: z.string().min(1, 'merchantId is required'),
  // Omitted pays out the whole available balance.
  amount: z.number().positive().optional(),
  method: z.nativeEnum(PayoutMethod).optional(),
  note: z.string().max(500).optional(),
});

const updatePayoutSchema = z.object({
  status: z.nativeEnum(PayoutStatus),
  providerReference: z.string().max(200).optional(),
  failureReason: z.string().max(500).optional(),
});

/* ---------------------------------------------------------------- merchant */

/** What this store is owed, and the rate it is calculated at. */
export async function getMyBalance(req: Request, res: Response, next: NextFunction) {
  try {
    const balance = await merchantBalance(req.merchant!.id);
    res.json({ success: true, data: balance });
  } catch (err) {
    next(err);
  }
}

export async function getMyPayouts(req: Request, res: Response, next: NextFunction) {
  try {
    const payouts = await prisma.payout.findMany({
      where: { merchantId: req.merchant!.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        reference: true,
        amount: true,
        currency: true,
        status: true,
        method: true,
        note: true,
        failureReason: true,
        periodStart: true,
        periodEnd: true,
        paidAt: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: payouts });
  } catch (err) {
    next(err);
  }
}

export async function getMyPayoutAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await prisma.merchantPayoutAccount.findUnique({
      where: { merchantId: req.merchant!.id },
      select: {
        accountName: true,
        bankName: true,
        bankCode: true,
        accountNumberLast4: true,
        provider: true,
        verifiedAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
}

export async function upsertMyPayoutAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const body = payoutAccountSchema.parse(req.body);
    const last4 = body.accountNumber.slice(-4);

    /**
     * Verify the account with Paystack, then register it as a recipient.
     *
     * Both happen here, while the full account number is still in hand — it
     * is never stored, so this is the only moment either is possible.
     *
     * The name Paystack resolves is kept in preference to the one the
     * merchant typed: the point of asking the bank is to catch a transposed
     * digit, and overwriting the bank's answer with the typist's would defeat
     * it. A merchant whose typed name disagrees is told, rather than silently
     * corrected.
     */
    let resolvedName = body.accountName;
    let recipientCode: string | null = null;
    let verifiedAt: Date | null = null;
    let verificationNote: string | undefined;

    if (transfersConfigured()) {
      try {
        const resolved = await resolveBankAccount(body.accountNumber, body.bankCode);
        resolvedName = resolved.accountName;

        recipientCode = await createTransferRecipient({
          accountName: resolved.accountName,
          accountNumber: body.accountNumber,
          bankCode: body.bankCode,
          currency: currencyCodeOf(req.merchant!.currency),
        });
        verifiedAt = new Date();

        if (resolved.accountName.trim().toLowerCase() !== body.accountName.trim().toLowerCase()) {
          verificationNote =
            `This account is registered to "${resolved.accountName}". We have saved that name.`;
        }
      } catch (err: any) {
        /**
         * A failed verification is not a failed save.
         *
         * The merchant still needs their details recorded so an admin can pay
         * them manually; what they lose is automated transfer, and they are
         * told so rather than left to wonder. A wrong account number lands
         * here, which is the common case and the one worth being clear about.
         */
        logger.warn({
          msg: 'Could not verify a payout account with Paystack',
          merchantId,
          error: err?.message,
        });
        verificationNote = `We could not verify this account with Paystack: ${err?.message ?? 'unknown error'}. `
          + 'Your details are saved, but payouts will be released manually until it verifies.';
      }
    }

    const account = await prisma.merchantPayoutAccount.upsert({
      where: { merchantId },
      update: {
        accountName: resolvedName,
        bankName: body.bankName,
        bankCode: body.bankCode,
        accountNumberLast4: last4,
        providerRecipientId: recipientCode,
        verifiedAt,
      },
      create: {
        merchantId,
        accountName: resolvedName,
        bankName: body.bankName,
        bankCode: body.bankCode,
        accountNumberLast4: last4,
        providerRecipientId: recipientCode,
        verifiedAt,
      },
    });

    await logAuditEvent({
      merchantId,
      userId: req.user!.id,
      actorName: req.user!.name,
      actorEmail: req.user!.email,
      action: 'PAYOUT_ACCOUNT_UPDATED',
      resource: 'payout_account',
      resourceId: account.id,
      // The account number is not recorded in the audit trail either.
      metadata: { bankName: body.bankName, accountNumberLast4: last4 },
    });

    res.json({
      success: true,
      data: {
        accountName: account.accountName,
        bankName: account.bankName,
        bankCode: account.bankCode,
        accountNumberLast4: account.accountNumberLast4,
        verifiedAt: account.verifiedAt,
      },
      // Present when the bank's answer differs from what was typed, or when
      // verification could not be completed.
      message: verificationNote,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0].message });
      return;
    }
    next(err);
  }
}

/* ------------------------------------------------------------------- admin */

/** Every store's balance, for deciding who to pay. */
export async function listPayableMerchants(_req: Request, res: Response, next: NextFunction) {
  try {
    const merchants = await prisma.merchant.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, payoutAccount: { select: { accountNumberLast4: true, bankName: true, verifiedAt: true } } },
      take: 200,
    });

    const rows = await Promise.all(
      merchants.map(async merchant => ({
        merchantId: merchant.id,
        displayName: merchant.name,
        payoutAccount: merchant.payoutAccount,
        balance: await merchantBalance(merchant.id),
      }))
    );

    res.json({
      success: true,
      // Most owed first: that is the order an operator works through.
      data: rows.sort((a, b) => b.balance.available - a.balance.available),
    });
  } catch (err) {
    next(err);
  }
}

export async function listAllPayouts(req: Request, res: Response, next: NextFunction) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const payouts = await prisma.payout.findMany({
      where: status && status in PayoutStatus ? { status: status as PayoutStatus } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { merchant: { select: { id: true, name: true } } },
    });

    res.json({ success: true, data: payouts });
  } catch (err) {
    next(err);
  }
}

export async function createPayoutForMerchant(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createPayoutSchema.parse(req.body);

    const merchant = await prisma.merchant.findUnique({ where: { id: body.merchantId } });
    if (!merchant) {
      res.status(404).json({ success: false, error: 'Merchant not found' });
      return;
    }

    const payout = await createPayout({
      merchantId: body.merchantId,
      amount: body.amount,
      method: body.method,
      note: body.note,
      initiatedByUserId: req.user!.id,
    });

    await logAuditEvent({
      merchantId: body.merchantId,
      userId: req.user!.id,
      actorName: req.user!.name,
      actorEmail: req.user!.email,
      action: 'PAYOUT_CREATED',
      resource: 'payout',
      resourceId: payout.id,
      metadata: { reference: payout.reference, amount: payout.amount },
    });

    res.status(201).json({ success: true, data: payout });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0].message });
      return;
    }
    if (err instanceof PayoutError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
}

export async function setPayoutStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const body = updatePayoutSchema.parse(req.body);

    const updated = await updatePayoutStatus({
      payoutId: req.params.id,
      status: body.status,
      providerReference: body.providerReference,
      failureReason: body.failureReason,
    });

    await logAuditEvent({
      merchantId: updated.merchantId,
      userId: req.user!.id,
      actorName: req.user!.name,
      actorEmail: req.user!.email,
      action: 'PAYOUT_STATUS_CHANGED',
      resource: 'payout',
      resourceId: updated.id,
      metadata: { reference: updated.reference, status: updated.status },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0].message });
      return;
    }
    if (err instanceof PayoutError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
}

/**
 * Release a created payout to Paystack.
 *
 * Separate from creating it, so an admin can queue what is owed now and send
 * it when they choose — and so a transfer that cannot start never destroys the
 * record of the debt.
 */
export async function sendPayout(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await executePayout(req.params.id);

    const payout = await prisma.payout.findUnique({ where: { id: req.params.id } });

    await logAuditEvent({
      merchantId: payout!.merchantId,
      userId: req.user!.id,
      actorName: req.user!.name,
      actorEmail: req.user!.email,
      action: 'PAYOUT_SENT',
      resource: 'payout',
      resourceId: payout!.id,
      metadata: { reference: payout!.reference, amount: payout!.amount },
    });

    res.json({ success: true, data: payout, message: result.detail });
  } catch (err) {
    if (err instanceof PayoutError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
}
