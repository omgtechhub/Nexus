import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { PayoutStatus, PayoutMethod } from '@prisma/client';
import {
  merchantBalance,
  createPayout,
  updatePayoutStatus,
  PayoutError,
} from '../services/payouts/payout.service.js';
import { logAuditEvent } from '../utils/auditLogger.js';

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
  storeId: z.string().min(1, 'storeId is required'),
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
    const balance = await merchantBalance(req.store!.id);
    res.json({ success: true, data: balance });
  } catch (err) {
    next(err);
  }
}

export async function getMyPayouts(req: Request, res: Response, next: NextFunction) {
  try {
    const payouts = await prisma.payout.findMany({
      where: { storeId: req.store!.id },
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
      where: { storeId: req.store!.id },
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
    const storeId = req.store!.id;
    const body = payoutAccountSchema.parse(req.body);
    const last4 = body.accountNumber.slice(-4);

    /**
     * No provider recipient is registered here.
     *
     * Registering the destination with Paystack and verifying that the account
     * number resolves to `accountName` needs a live secret key and a funded
     * transfer balance, which is a deployment decision rather than something
     * to attempt silently. `verifiedAt` therefore stays null and payouts
     * default to MANUAL — a platform admin pays by their own means and records
     * it. See `services/payouts/README.md`.
     */
    const account = await prisma.merchantPayoutAccount.upsert({
      where: { storeId },
      update: {
        accountName: body.accountName,
        bankName: body.bankName,
        bankCode: body.bankCode,
        accountNumberLast4: last4,
        // Details changed, so any previous verification no longer applies.
        verifiedAt: null,
        providerRecipientId: null,
      },
      create: {
        storeId,
        accountName: body.accountName,
        bankName: body.bankName,
        bankCode: body.bankCode,
        accountNumberLast4: last4,
      },
    });

    await logAuditEvent({
      storeId,
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
export async function listPayableStores(_req: Request, res: Response, next: NextFunction) {
  try {
    const stores = await prisma.store.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, payoutAccount: { select: { accountNumberLast4: true, bankName: true, verifiedAt: true } } },
      take: 200,
    });

    const rows = await Promise.all(
      stores.map(async store => ({
        storeId: store.id,
        storeName: store.name,
        payoutAccount: store.payoutAccount,
        balance: await merchantBalance(store.id),
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
      include: { store: { select: { id: true, name: true } } },
    });

    res.json({ success: true, data: payouts });
  } catch (err) {
    next(err);
  }
}

export async function createPayoutForStore(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createPayoutSchema.parse(req.body);

    const store = await prisma.store.findUnique({ where: { id: body.storeId } });
    if (!store) {
      res.status(404).json({ success: false, error: 'Store not found' });
      return;
    }

    const payout = await createPayout({
      storeId: body.storeId,
      amount: body.amount,
      method: body.method,
      note: body.note,
      initiatedByUserId: req.user!.id,
    });

    await logAuditEvent({
      storeId: body.storeId,
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
      storeId: updated.storeId,
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
