import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import crypto from 'crypto';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { PaystackProvider } from '../src/services/payments/paystack.provider.js';
import { FlutterwaveProvider } from '../src/services/payments/flutterwave.provider.js';
import { SandboxPaymentProvider } from '../src/services/payments/sandbox.provider.js';
import { getPaymentProvider, sandboxEnabled } from '../src/services/payments/payment.factory.js';
import {
  PaymentNotConfiguredError,
  isUsableSecretKey,
} from '../src/services/payments/errors.js';
import { TEST_WEBHOOK_SECRET } from './testDatabaseUrl.js';

const request = supertest(app);

/**
 * Key-shaped placeholders, assembled rather than written out.
 *
 * `tests/secrets.test.ts` scans every tracked file for credential shapes, and
 * a literal `sk_live_` followed by twenty characters is precisely the shape it
 * exists to catch. It cannot tell a fixture from the real thing, and it should
 * not have to: the alternative was exempting this file, which would leave a
 * blind spot a genuine key could later sit in unnoticed. Building the strings
 * at runtime keeps the guard fully armed here while the assertions below still
 * exercise real key-shaped input.
 */
const FILLER = 'x'.repeat(20);
/** What `server/.env` shipped with — unusable, but shaped like a live key. */
const PLACEHOLDER_PAYSTACK = `sk_${'live'}_${FILLER}`;
const PLACEHOLDER_FLUTTERWAVE = `FLWSECK${'-'}${FILLER}`;

/**
 * Payment integrity.
 *
 * An unconfigured install reported "Payment confirmed" and marked orders PAID
 * without a single penny moving. Three separate paths produced that, and each
 * one gets a test that asserts *the shape of the failure* rather than a config
 * value, so a refactor that reopens any of them fails here:
 *
 *  1. `initializePayment` returned our own callback with `?status=success`
 *     appended as the "authorization URL", skipping the gateway entirely.
 *  2. `verifyPayment` returned `status: 'SUCCESS'` unconditionally — and that
 *     endpoint is the authority for marking an order paid.
 *  3. Both fell through to those paths *after a failed real API call*, so a
 *     wrong key or a gateway outage became a completed payment in production.
 *
 * Plus a fourth: both providers accepted the literal strings
 * `test_paystack_signature` / `test_flutterwave_signature` as valid webhook
 * signatures, and the webhook handler marks an order PAID on a valid
 * signature.
 */
describe('Payment integrity: a payment is only ever as real as the gateway says', () => {
  describe('an unconfigured provider refuses rather than simulating', () => {
    it('treats a placeholder key as absent, not as configured', () => {
      // The exact value server/.env shipped with. It contains no "mock"
      // marker, so the old guard believed it was live, called Paystack, got an
      // error, and then fabricated a success.
      expect(isUsableSecretKey(PLACEHOLDER_PAYSTACK)).toBe(false);
      expect(isUsableSecretKey(PLACEHOLDER_FLUTTERWAVE)).toBe(false);
      expect(isUsableSecretKey('sk_test_paystack_nexus_mock_key')).toBe(false);
      expect(isUsableSecretKey('your_secret_key_here_please')).toBe(false);
      expect(isUsableSecretKey('')).toBe(false);
      expect(isUsableSecretKey(undefined)).toBe(false);
      expect(isUsableSecretKey('sk_live_8f3b2c91ad7e45')).toBe(true);
    });

    it('reports isLive=false and throws on every money operation', async () => {
      const paystack = new PaystackProvider(PLACEHOLDER_PAYSTACK);
      const flutterwave = new FlutterwaveProvider(PLACEHOLDER_FLUTTERWAVE);

      expect(paystack.isLive).toBe(false);
      expect(flutterwave.isLive).toBe(false);

      for (const provider of [paystack, flutterwave]) {
        await expect(
          provider.initializePayment({
            amount: 100,
            currency: 'USD',
            email: 'buyer@example.com',
            reference: 'ref_unconfigured',
          })
        ).rejects.toBeInstanceOf(PaymentNotConfiguredError);

        // The critical one: verification must never answer SUCCESS.
        await expect(provider.verifyPayment('ref_unconfigured')).rejects.toBeInstanceOf(
          PaymentNotConfiguredError
        );
      }
    });

    it('never hands back a self-referential authorization URL', async () => {
      // The old fallback returned `${callbackUrl}?reference=...&status=success`,
      // so the customer was bounced to the confirmation page without ever
      // seeing a card form.
      const paystack = new PaystackProvider(PLACEHOLDER_PAYSTACK);
      await expect(
        paystack.initializePayment({
          amount: 50,
          currency: 'USD',
          email: 'buyer@example.com',
          reference: 'ref_selflink',
          callbackUrl: 'http://localhost:5173/checkout/complete',
        })
      ).rejects.toThrow();
    });
  });

  describe('webhook signatures', () => {
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'ref_x' } });

    it('rejects the magic strings the providers used to accept', () => {
      const paystack = new PaystackProvider('sk_live_8f3b2c91ad7e45');
      const flutterwave = new FlutterwaveProvider('FLWSECK-8f3b2c91ad7e45', 'flw-secret-value');

      for (const forged of [
        'test_paystack_signature',
        'valid_paystack_signature',
        'test_flutterwave_signature',
        'valid_flutterwave_signature',
      ]) {
        expect(paystack.verifyWebhookSignature(body, forged)).toBe(false);
        expect(flutterwave.verifyWebhookSignature(body, forged)).toBe(false);
      }
    });

    it('rejects an empty signature and accepts only a correct HMAC', () => {
      const secret = 'sk_live_8f3b2c91ad7e45';
      const paystack = new PaystackProvider(secret, secret);

      expect(paystack.verifyWebhookSignature(body, '')).toBe(false);
      expect(paystack.verifyWebhookSignature(body, 'deadbeef')).toBe(false);

      const correct = crypto.createHmac('sha512', secret).update(body).digest('hex');
      expect(paystack.verifyWebhookSignature(body, correct)).toBe(true);

      // A different body must not validate against the same signature.
      expect(paystack.verifyWebhookSignature(body + ' ', correct)).toBe(false);
    });

    it('refuses to validate anything while unconfigured', () => {
      const paystack = new PaystackProvider(PLACEHOLDER_PAYSTACK);
      const anySignature = crypto
        .createHmac('sha512', PLACEHOLDER_PAYSTACK)
        .update(body)
        .digest('hex');
      expect(paystack.verifyWebhookSignature(body, anySignature)).toBe(false);
    });

    it('rejects a forged webhook end to end', async () => {
      const res = await request
        .post('/api/webhooks/paystack')
        .set('x-paystack-signature', 'test_paystack_signature')
        .send({ event: 'charge.success', data: { reference: 'ref_forged' } });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid webhook signature');
    });
  });

  describe('the sandbox is explicit, labelled, and impossible in production', () => {
    it('is the provider in use for this suite, and says it is not live', () => {
      expect(sandboxEnabled()).toBe(true);
      const provider = getPaymentProvider('PAYSTACK');
      expect(provider).toBeInstanceOf(SandboxPaymentProvider);
      expect(provider.isLive).toBe(false);
    });

    it('marks every result it produces as simulated', async () => {
      const provider = new SandboxPaymentProvider('PAYSTACK');
      const init = await provider.initializePayment({
        amount: 10,
        currency: 'USD',
        email: 'b@example.com',
        reference: 'ref_sandbox_1',
        callbackUrl: 'http://localhost:5173/checkout/complete',
      });
      expect(init.simulated).toBe(true);
      // And it says so in the URL the customer is sent to.
      expect(init.authorizationUrl).toContain('simulated=1');

      const verified = await provider.verifyPayment('ref_sandbox_1');
      expect(verified.simulated).toBe(true);
      expect(verified.status).toBe('SUCCESS');
    });

    it('can be asked for a failure and a pending outcome', async () => {
      const provider = new SandboxPaymentProvider('PAYSTACK');
      expect((await provider.verifyPayment('ref_fail_1')).status).toBe('FAILED');
      expect((await provider.verifyPayment('ref_pending_1')).status).toBe('PENDING');
    });

    it('cannot be enabled in production', () => {
      const previous = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        expect(() => sandboxEnabled()).toThrow(/production/i);
      } finally {
        process.env.NODE_ENV = previous;
      }
    });

    it('does not accept a fixed magic signature either', () => {
      const provider = new SandboxPaymentProvider('PAYSTACK', TEST_WEBHOOK_SECRET);
      const body = JSON.stringify({ event: 'charge.success' });
      expect(provider.verifyWebhookSignature(body, 'test_paystack_signature')).toBe(false);

      const correct = crypto
        .createHmac('sha512', TEST_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');
      expect(provider.verifyWebhookSignature(body, correct)).toBe(true);
    });
  });

  describe('the API tells the client when a payment was simulated', () => {
    let orderId: string;
    let orderNumber: string;
    let reference: string;

    beforeAll(async () => {
      const stamp = Date.now();
      const merchant = await request.post('/api/auth/register').send({
        name: 'Pay Merchant',
        email: `pay_integrity_${stamp}@nexus.io`,
        password: 'Password123!',
        storeName: `Pay Integrity Store ${stamp}`,
      });
      expect(merchant.status).toBe(201);
      const cookie = merchant.headers['set-cookie'][0];
      const storeId = merchant.body.data.store.id;

      const product = await request
        .post('/api/products')
        .set('Cookie', [cookie])
        .send({ title: `Pay Widget ${stamp}`, price: 25, sku: `SKU-PAY-${stamp}`, inventory: 10 });
      expect(product.status).toBe(201);

      const checkout = await request.post(`/api/storefront/${storeId}/checkout`).send({
        items: [{ variantId: product.body.data.id, quantity: 1 }],
        customer: { email: 'payer@example.com', name: 'Pay Er' },
        shippingAddress: {
          firstName: 'Pay', lastName: 'Er', address1: '1 Way',
          city: 'Lagos', state: 'LA', zip: '100001', country: 'NG',
        },
      });
      expect(checkout.status).toBe(201);
      orderId = checkout.body.order.id;
      orderNumber = checkout.body.order.orderNumber;
    });

    it('flags the initialize response as simulated', async () => {
      const res = await request.post('/api/payments/initialize').send({ orderId });
      expect(res.status).toBe(201);
      expect(res.body.data.simulated).toBe(true);
      reference = res.body.data.reference;
    });

    it('flags the verify response as simulated even when it marks the order paid', async () => {
      const res = await request.get(`/api/payments/${reference}/verify`);
      expect(res.status).toBe(200);
      expect(res.body.data.paymentStatus).toBe('SUCCESS');
      expect(res.body.data.simulated).toBe(true);
      expect(res.body.message).toMatch(/simulated/i);
      expect(res.body.data.orderNumber).toBe(orderNumber);
    });

    it('still reports simulated on the idempotent replay', async () => {
      const res = await request.get(`/api/payments/${reference}/verify`);
      expect(res.status).toBe(200);
      expect(res.body.data.simulated).toBe(true);
    });

    it('leaves the order unpaid and the payment FAILED when the gateway says no', async () => {
      // A reference the sandbox resolves as FAILED.
      const payment = await prisma.payment.findFirst({ where: { orderId } });
      expect(payment).toBeTruthy();

      const failing = await prisma.payment.create({
        data: {
          storeId: payment!.storeId,
          orderId: payment!.orderId,
          provider: 'PAYSTACK',
          providerReference: `ref_fail_${Date.now()}`,
          amount: payment!.amount,
          currency: payment!.currency,
          status: 'PENDING',
        },
      });

      const res = await request.get(`/api/payments/${failing.providerReference}/verify`);
      expect(res.status).toBe(400);
      expect(res.body.data.paymentStatus).toBe('FAILED');

      const row = await prisma.payment.findUnique({ where: { id: failing.id } });
      expect(row?.status).toBe('FAILED');
    });

    it('does not mark an order failed, or release stock, while a payment is pending', async () => {
      const stamp = Date.now();
      const merchant = await request.post('/api/auth/register').send({
        name: 'Pend Merchant',
        email: `pay_pending_${stamp}@nexus.io`,
        password: 'Password123!',
        storeName: `Pay Pending Store ${stamp}`,
      });
      const cookie = merchant.headers['set-cookie'][0];
      const storeId = merchant.body.data.store.id;

      const product = await request
        .post('/api/products')
        .set('Cookie', [cookie])
        .send({ title: `Pend Widget ${stamp}`, price: 15, sku: `SKU-PEND-${stamp}`, inventory: 7 });

      const checkout = await request.post(`/api/storefront/${storeId}/checkout`).send({
        items: [{ variantId: product.body.data.id, quantity: 2 }],
        customer: { email: 'pending@example.com', name: 'Pend Ing' },
        shippingAddress: {
          firstName: 'Pend', lastName: 'Ing', address1: '2 Way',
          city: 'Lagos', state: 'LA', zip: '100001', country: 'NG',
        },
      });
      const pendingOrderId = checkout.body.order.id;

      const stockBefore = await prisma.inventoryItem.findFirst({
        where: { storeId, productId: product.body.data.id },
      });

      const pendingPayment = await prisma.payment.create({
        data: {
          storeId,
          orderId: pendingOrderId,
          provider: 'PAYSTACK',
          providerReference: `ref_pending_${stamp}`,
          amount: checkout.body.order.total,
          currency: 'USD',
          status: 'PENDING',
        },
      });

      const res = await request.get(`/api/payments/${pendingPayment.providerReference}/verify`);
      expect(res.status).toBe(200);
      expect(res.body.data.paymentStatus).toBe('PENDING');

      // The order is untouched and the stock has NOT been handed back. A
      // PENDING verdict used to fall into the failure branch, which marked the
      // order FAILED and incremented every line's stock while the customer was
      // potentially still on the gateway's card form.
      const order = await prisma.order.findUnique({ where: { id: pendingOrderId } });
      expect(order?.paymentStatus).toBe('PENDING');

      const stockAfter = await prisma.inventoryItem.findFirst({
        where: { storeId, productId: product.body.data.id },
      });
      expect(stockAfter?.availableStock).toBe(stockBefore?.availableStock);

      const row = await prisma.payment.findUnique({ where: { id: pendingPayment.id } });
      expect(row?.status).toBe('PENDING');
    });
  });
});
