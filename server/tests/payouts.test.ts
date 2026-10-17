import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { PaymentProvider, PaymentStatus, PayoutStatus } from '@prisma/client';
import {
  merchantBalance,
  createPayout,
  updatePayoutStatus,
  executePayout,
  recordCommissionForPayment,
  backfillMissingCommissions,
  PayoutError,
} from '../src/services/payouts/payout.service.js';
import { splitPayment, commissionRate } from '../src/services/payouts/commission.js';
import { hashPassword } from '../src/utils/password.js';
import { TEST_WEBHOOK_SECRET } from './testDatabaseUrl.js';

const request = supertest(app);

/** Sign a webhook body the way the sandbox provider expects. */
function sign(body: unknown): string {
  return crypto.createHmac('sha512', TEST_WEBHOOK_SECRET).update(JSON.stringify(body)).digest('hex');
}

/**
 * Merchant payouts.
 *
 * Before this subsystem there was no record of what the platform owed any
 * merchant: every customer payment landed in the platform's gateway account,
 * nothing tracked the split, and the seller-facing assistant nonetheless told
 * merchants their payouts were visible in the dashboard.
 */
describe('Merchant payouts', () => {
  const merchantEmail = `payouts_merchant_${Date.now()}@nexus.io`;
  const adminEmail = `payouts_admin_${Date.now()}@nexus.io`;
  const password = 'Password123!';

  let merchantCookie: string;
  let adminCookie: string;
  let storeId: string;
  let productId: string;

  const originalCommission = process.env.PLATFORM_COMMISSION_PERCENT;

  beforeAll(async () => {
    const reg = await request.post('/api/auth/register').send({
      name: 'Payouts Merchant',
      email: merchantEmail,
      password,
      storeName: 'Payouts Store',
    });
    expect(reg.status).toBe(201);
    merchantCookie = reg.headers['set-cookie'][0];
    storeId = reg.body.data.store.id;

    const prod = await request
      .post('/api/products')
      .set('Cookie', [merchantCookie])
      .send({
        title: 'Payout Widget',
        price: 100,
        sku: `SKU-PO-${Date.now()}`,
        inventory: 100,
        status: 'ACTIVE',
      });
    productId = prod.body.data.id;

    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Payouts Platform Admin',
        passwordHash: await hashPassword(password),
        platformRole: 'PLATFORM_OWNER',
      },
    });
    const login = await request.post('/api/auth/login').send({ email: adminEmail, password });
    expect(login.status).toBe(200);
    adminCookie = login.headers['set-cookie'][0];
  });

  afterAll(() => {
    if (originalCommission === undefined) delete process.env.PLATFORM_COMMISSION_PERCENT;
    else process.env.PLATFORM_COMMISSION_PERCENT = originalCommission;
  });

  /** A settled payment, so there is something to be owed. */
  async function settledSale(amount: number) {
    const order = await prisma.order.create({
      data: {
        storeId,
        orderNumber: `#PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        customerName: 'Payout Buyer',
        customerEmail: 'payout.buyer@example.com',
        subtotal: amount,
        tax: 0,
        shipping: 0,
        total: amount,
        currency: 'NGN',
        items: {
          create: [{ productId, productTitle: 'Payout Widget', sku: 'SKU-PO', quantity: 1, price: amount, total: amount }],
        },
      },
    });

    const payment = await prisma.payment.create({
      data: {
        storeId,
        orderId: order.id,
        provider: PaymentProvider.PAYSTACK,
        providerReference: `ref_po_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        amount,
        currency: 'NGN',
        status: PaymentStatus.SUCCESS,
      },
    });

    await recordCommissionForPayment(payment.id);
    return payment;
  }

  describe('the commission split', () => {
    it('defaults to zero, so nothing is withheld without a decision', () => {
      delete process.env.PLATFORM_COMMISSION_PERCENT;
      expect(commissionRate()).toBe(0);

      const split = splitPayment(100);
      expect(split.platformFeeAmount).toBe(0);
      expect(split.merchantNetAmount).toBe(100);
    });

    it('splits at the configured rate, and the parts always add back exactly', () => {
      process.env.PLATFORM_COMMISSION_PERCENT = '2.5';
      const split = splitPayment(99.99);

      expect(split.commissionRate).toBe(2.5);
      // Net is derived by subtraction, so rounding cannot invent or lose a
      // penny between the two halves.
      expect(split.platformFeeAmount + split.merchantNetAmount).toBe(99.99);
    });

    it('ignores a nonsensical rate rather than acting on it', () => {
      // A rate above 100 would make the merchant's net negative.
      process.env.PLATFORM_COMMISSION_PERCENT = '150';
      expect(commissionRate()).toBe(0);

      process.env.PLATFORM_COMMISSION_PERCENT = 'not-a-number';
      expect(commissionRate()).toBe(0);

      process.env.PLATFORM_COMMISSION_PERCENT = '-5';
      expect(commissionRate()).toBe(0);

      delete process.env.PLATFORM_COMMISSION_PERCENT;
    });

    it('is fixed at settlement, so a later rate change never re-values a sale', async () => {
      process.env.PLATFORM_COMMISSION_PERCENT = '10';
      const payment = await settledSale(200);

      let stored = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(stored!.commissionRate).toBe(10);
      expect(stored!.platformFeeAmount).toBe(20);
      expect(stored!.merchantNetAmount).toBe(180);

      // The platform raises its cut. The sale already taken must not change.
      process.env.PLATFORM_COMMISSION_PERCENT = '30';
      await recordCommissionForPayment(payment.id);

      stored = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(stored!.commissionRate).toBe(10);
      expect(stored!.merchantNetAmount).toBe(180);

      delete process.env.PLATFORM_COMMISSION_PERCENT;
    });
  });

  describe('the balance', () => {
    it('is what the merchant is owed after fees, refunds and payouts', async () => {
      delete process.env.PLATFORM_COMMISSION_PERCENT;

      const before = await merchantBalance(storeId);
      await settledSale(500);
      const after = await merchantBalance(storeId);

      expect(after.grossEarned).toBe(before.grossEarned + 500);
      expect(after.available).toBe(before.available + 500);
      expect(after.currency).toBeTruthy();
    });

    it('deducts a refund from what is owed', async () => {
      const payment = await settledSale(300);
      const before = await merchantBalance(storeId);

      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          orderId: payment.orderId,
          storeId,
          amount: 300,
          currency: 'NGN',
          reason: 'Customer returned it',
          status: 'SUCCESS',
          providerReference: `rf_${Date.now()}`,
        },
      });

      const after = await merchantBalance(storeId);
      expect(after.refunded).toBe(before.refunded + 300);
      expect(after.available).toBe(before.available - 300);
    });

    it('never goes negative', async () => {
      // A refund larger than the balance is a debt to track, not a negative
      // figure to offer as payable.
      const fresh = await request.post('/api/auth/register').send({
        name: 'Negative Balance Merchant',
        email: `neg_${Date.now()}@nexus.io`,
        password,
        storeName: 'Negative Store',
      });
      const negStoreId = fresh.body.data.store.id;

      const order = await prisma.order.create({
        data: {
          storeId: negStoreId,
          orderNumber: `#NEG-${Date.now()}`,
          customerName: 'X',
          customerEmail: 'x@example.com',
          subtotal: 10, tax: 0, shipping: 0, total: 10, currency: 'NGN',
        },
      });
      const payment = await prisma.payment.create({
        data: {
          storeId: negStoreId,
          orderId: order.id,
          provider: PaymentProvider.PAYSTACK,
          providerReference: `ref_neg_${Date.now()}`,
          amount: 10, currency: 'NGN', status: PaymentStatus.SUCCESS,
        },
      });
      await recordCommissionForPayment(payment.id);
      await prisma.refund.create({
        data: {
          paymentId: payment.id, orderId: order.id, storeId: negStoreId,
          amount: 1000, currency: 'NGN', reason: 'Oversized refund',
          status: 'SUCCESS', providerReference: `rf_neg_${Date.now()}`,
        },
      });

      const balance = await merchantBalance(negStoreId);
      expect(balance.available).toBe(0);
    });

    it('gives pre-existing payments a split, so old sales are not invisible', async () => {
      // Payments settled before payouts existed have a null net, which would
      // read as "you are owed nothing".
      const payment = await settledSale(150);
      await prisma.payment.update({
        where: { id: payment.id },
        data: { merchantNetAmount: null, platformFeeAmount: null, commissionRate: null },
      });

      const filled = await backfillMissingCommissions();
      expect(filled).toBeGreaterThanOrEqual(1);

      const stored = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(stored!.merchantNetAmount).toBe(150);
    });
  });

  describe('creating and settling a payout', () => {
    it('refuses to pay out more than is available', async () => {
      const balance = await merchantBalance(storeId);

      await expect(
        createPayout({ storeId, amount: balance.available + 1000 })
      ).rejects.toThrow(PayoutError);
    });

    it('refuses when there is nothing owed', async () => {
      const fresh = await request.post('/api/auth/register').send({
        name: 'Empty Balance Merchant',
        email: `empty_${Date.now()}@nexus.io`,
        password,
        storeName: 'Empty Store',
      });

      await expect(
        createPayout({ storeId: fresh.body.data.store.id })
      ).rejects.toThrow(/nothing available/i);
    });

    it('reduces the available balance once created, before any money moves', async () => {
      const before = await merchantBalance(storeId);
      const payout = await createPayout({ storeId, amount: 100, note: 'Test run' });

      expect(payout.status).toBe(PayoutStatus.PENDING);

      const after = await merchantBalance(storeId);
      // Counted against the balance immediately, so two admins acting at once
      // cannot together pay out more than is owed.
      expect(after.pendingPayouts).toBe(before.pendingPayouts + 100);
      expect(after.available).toBe(before.available - 100);
    });

    it('a failed payout returns the money to the balance', async () => {
      const payout = await createPayout({ storeId, amount: 50 });
      const duringPending = await merchantBalance(storeId);

      await updatePayoutStatus({
        payoutId: payout.id,
        status: PayoutStatus.FAILED,
        failureReason: 'Bank rejected the transfer',
      });

      const after = await merchantBalance(storeId);
      // It never reached the merchant, so they are still owed it.
      expect(after.available).toBe(duringPending.available + 50);
    });

    it('rejects an impossible status transition', async () => {
      const payout = await createPayout({ storeId, amount: 25 });
      await updatePayoutStatus({ payoutId: payout.id, status: PayoutStatus.PAID });

      // PAID may only become REVERSED.
      await expect(
        updatePayoutStatus({ payoutId: payout.id, status: PayoutStatus.PENDING })
      ).rejects.toThrow(/cannot become/i);

      await expect(
        updatePayoutStatus({ payoutId: payout.id, status: PayoutStatus.REVERSED })
      ).resolves.toBeTruthy();
    });
  });

  describe('the API surface', () => {
    it('lets a merchant read their own balance and history', async () => {
      const balanceRes = await request.get('/api/payouts/balance').set('Cookie', [merchantCookie]);
      expect(balanceRes.status).toBe(200);
      expect(typeof balanceRes.body.data.available).toBe('number');
      expect(typeof balanceRes.body.data.commissionRate).toBe('number');

      const listRes = await request.get('/api/payouts').set('Cookie', [merchantCookie]);
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);
    });

    it('stores only the last four digits of a bank account', async () => {
      const res = await request
        .put('/api/payouts/account')
        .set('Cookie', [merchantCookie])
        .send({
          accountName: 'Payouts Store Ltd',
          bankName: 'Guaranty Trust Bank',
          bankCode: '058',
          accountNumber: '0123456789',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.accountNumberLast4).toBe('6789');
      // Holding full bank details for every merchant is a liability with no
      // operational benefit — the provider recipient token replaces it.
      expect(JSON.stringify(res.body)).not.toContain('0123456789');

      const stored = await prisma.merchantPayoutAccount.findUnique({ where: { storeId } });
      expect(stored!.accountNumberLast4).toBe('6789');
      expect(JSON.stringify(stored)).not.toContain('0123456789');
      // Not verified: that needs a live provider call.
      expect(stored!.verifiedAt).toBeNull();
    });

    it('rejects a malformed account number', async () => {
      const res = await request
        .put('/api/payouts/account')
        .set('Cookie', [merchantCookie])
        .send({
          accountName: 'Payouts Store Ltd',
          bankName: 'GTB',
          bankCode: '058',
          accountNumber: 'not-digits',
        });

      expect(res.status).toBe(400);
    });

    it('does not let a merchant create their own payout', async () => {
      // The platform paying money out is an admin action. A merchant has no
      // endpoint for it at all.
      const res = await request
        .post('/api/admin/payouts')
        .set('Cookie', [merchantCookie])
        .send({ storeId, amount: 10 });

      expect(res.status).toBe(403);
    });

    it('refuses an unauthenticated caller on every payout route', async () => {
      for (const [method, path] of [
        ['get', '/api/payouts/balance'],
        ['get', '/api/payouts'],
        ['put', '/api/payouts/account'],
        ['get', '/api/admin/payouts'],
        ['post', '/api/admin/payouts'],
      ] as const) {
        const res = await (request as any)[method](path).send({});
        expect(res.status).toBe(401);
      }
    });

    it('lets a platform admin see who is owed and record a payout', async () => {
      const payableRes = await request
        .get('/api/admin/payouts/payable')
        .set('Cookie', [adminCookie]);
      expect(payableRes.status).toBe(200);
      const row = payableRes.body.data.find((r: any) => r.storeId === storeId);
      expect(row).toBeTruthy();
      expect(row.balance).toBeTruthy();

      const createRes = await request
        .post('/api/admin/payouts')
        .set('Cookie', [adminCookie])
        .send({ storeId, amount: 10, note: 'Admin-recorded payout' });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.reference).toMatch(/^PO-\d{8}-[0-9A-F]{6}$/);

      const confirmRes = await request
        .patch(`/api/admin/payouts/${createRes.body.data.id}`)
        .set('Cookie', [adminCookie])
        .send({ status: 'PAID' });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.status).toBe('PAID');
      expect(confirmRes.body.data.paidAt).toBeTruthy();
    });

    it('reports an over-payout attempt as a 400, not a 500', async () => {
      const res = await request
        .post('/api/admin/payouts')
        .set('Cookie', [adminCookie])
        .send({ storeId, amount: 99_999_999 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/exceeds the available balance/i);
    });
  });
});

/**
 * Automated transfers.
 *
 * Payouts used to be recorded only — an obligation a human settled by their
 * own means and marked PAID by hand. `executePayout` sends them through
 * Paystack Transfers. These cover what must hold whether or not a live key is
 * present, because the suite runs without one.
 */
describe('Payout execution', () => {
  const password = 'Password123!';
  let execStoreId: string;
  let execAdminCookie: string;
  let execMerchantCookie: string;

  beforeAll(async () => {
    const reg = await request.post('/api/auth/register').send({
      name: 'Transfer Merchant',
      email: `transfer_${Date.now()}@nexus.io`,
      password,
      storeName: 'Transfer Store',
    });
    execMerchantCookie = reg.headers['set-cookie'][0];
    execStoreId = reg.body.data.store.id;

    const adminEmail = `transfer_admin_${Date.now()}@nexus.io`;
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Transfer Admin',
        passwordHash: await hashPassword(password),
        platformRole: 'PLATFORM_OWNER',
      },
    });
    execAdminCookie = (
      await request.post('/api/auth/login').send({ email: adminEmail, password })
    ).headers['set-cookie'][0];

    // Something to be owed.
    const order = await prisma.order.create({
      data: {
        storeId: execStoreId,
        orderNumber: `#TR-${Date.now()}`,
        customerName: 'T',
        customerEmail: 't@example.com',
        subtotal: 1000, tax: 0, shipping: 0, total: 1000, currency: 'USD',
      },
    });
    const payment = await prisma.payment.create({
      data: {
        storeId: execStoreId,
        orderId: order.id,
        provider: PaymentProvider.PAYSTACK,
        providerReference: `ref_tr_${Date.now()}`,
        amount: 1000, currency: 'USD', status: PaymentStatus.SUCCESS,
      },
    });
    await recordCommissionForPayment(payment.id);
  });

  it('refuses to send when there is no verified recipient, and keeps the debt', async () => {
    const payout = await createPayout({ storeId: execStoreId, amount: 100 });

    /**
     * Without a Paystack recipient code there is nowhere to send the money,
     * and the obligation must survive the refusal — a FAILED payout would drop
     * out of the balance calculation and quietly write off what is owed.
     */
    await expect(executePayout(payout.id)).rejects.toThrow(
      /payout account|not configured|verified/i
    );

    const after = await prisma.payout.findUnique({ where: { id: payout.id } });
    expect(after!.status).toBe(PayoutStatus.PENDING);
  });

  it('saves a payout account even when Paystack cannot verify it', async () => {
    // A merchant must still be payable by hand when verification is
    // unavailable; what they lose is automation, and they are told so.
    const res = await request
      .put('/api/payouts/account')
      .set('Cookie', [execMerchantCookie])
      .send({
        accountName: 'Transfer Store Ltd',
        bankName: 'Guaranty Trust Bank',
        bankCode: '058',
        accountNumber: '0123456789',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.accountNumberLast4).toBe('6789');

    const stored = await prisma.merchantPayoutAccount.findUnique({
      where: { storeId: execStoreId },
    });
    // No live key in the suite, so no recipient and no verification.
    expect(stored!.providerRecipientId).toBeNull();
    expect(stored!.verifiedAt).toBeNull();
    // And still no full account number anywhere.
    expect(JSON.stringify(stored)).not.toContain('0123456789');
  });

  it('exposes send as an admin-only action that never fakes success', async () => {
    const payout = await createPayout({ storeId: execStoreId, amount: 50 });

    const asMerchant = await request
      .post(`/api/admin/payouts/${payout.id}/send`)
      .set('Cookie', [execMerchantCookie]);
    expect(asMerchant.status).toBe(403);

    const unauthenticated = await request.post(`/api/admin/payouts/${payout.id}/send`);
    expect(unauthenticated.status).toBe(401);

    // The admin reaches the handler; with no live Paystack key it refuses
    // rather than pretending the money moved.
    const asAdmin = await request
      .post(`/api/admin/payouts/${payout.id}/send`)
      .set('Cookie', [execAdminCookie]);
    expect(asAdmin.status).toBeGreaterThanOrEqual(400);
    expect(asAdmin.body.success).toBe(false);

    const after = await prisma.payout.findUnique({ where: { id: payout.id } });
    expect(after!.status).toBe(PayoutStatus.PENDING);
  });

  it('settles a payout only on the transfer webhook, never on initiation', async () => {
    const payout = await createPayout({ storeId: execStoreId, amount: 25 });

    // Stand in for executePayout having reached Paystack.
    await prisma.payout.update({
      where: { id: payout.id },
      data: { status: PayoutStatus.PROCESSING, providerReference: 'TRF_test_code' },
    });

    const body = {
      event: 'transfer.success',
      id: `evt_tr_${Date.now()}`,
      data: { reference: payout.reference, transfer_code: 'TRF_test_code', status: 'success' },
    };

    const res = await request
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', sign(body))
      .send(body);

    expect(res.status).toBe(200);

    const after = await prisma.payout.findUnique({ where: { id: payout.id } });
    expect(after!.status).toBe(PayoutStatus.PAID);
    expect(after!.paidAt).toBeTruthy();
  });

  it('returns the money to the balance when a transfer fails', async () => {
    const payout = await createPayout({ storeId: execStoreId, amount: 30 });
    await prisma.payout.update({
      where: { id: payout.id },
      data: { status: PayoutStatus.PROCESSING },
    });

    const beforeBalance = await merchantBalance(execStoreId);

    const body = {
      event: 'transfer.failed',
      id: `evt_trf_${Date.now()}`,
      data: { reference: payout.reference, status: 'failed', gateway_response: 'Account closed' },
    };

    await request
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', sign(body))
      .send(body);

    const after = await prisma.payout.findUnique({ where: { id: payout.id } });
    expect(after!.status).toBe(PayoutStatus.FAILED);
    expect(after!.failureReason).toContain('Account closed');

    // It never reached the merchant, so they are still owed it.
    const afterBalance = await merchantBalance(execStoreId);
    expect(afterBalance.available).toBe(beforeBalance.available + 30);
  });
});
