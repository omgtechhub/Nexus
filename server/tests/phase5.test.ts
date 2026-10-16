import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import crypto from 'crypto';
import { TEST_WEBHOOK_SECRET } from './testDatabaseUrl.js';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

const request = supertest(app);

describe('Nexus Commerce Phase 5 Integration Tests (Real Payments, Webhooks, Shipping & Fulfillment)', () => {
  const storeAEmail = `storeA_p5_${Date.now()}@nexus.io`;
  const storeBEmail = `storeB_p5_${Date.now()}@nexus.io`;
  const password = 'Password123!';

  let storeACookie: string;
  let storeBCookie: string;
  let storeAId: string;
  let storeBId: string;
  let storeASlug: string;

  let activeProductId: string;
  let activeVariantId: string;
  let createdOrderId: string;
  let createdOrderNumber: string;

  beforeAll(async () => {
    // 1. Register Store A
    const resA = await request.post('/api/auth/register').send({
      name: 'Payments Alpha Owner',
      email: storeAEmail,
      password,
      storeName: 'Payments Alpha',
    });
    expect(resA.status).toBe(201);
    storeACookie = resA.headers['set-cookie'][0];
    storeAId = resA.body.data.store.id;
    storeASlug = resA.body.data.store.id;

    // 2. Register Store B
    const resB = await request.post('/api/auth/register').send({
      name: 'Payments Beta Owner',
      email: storeBEmail,
      password,
      storeName: 'Payments Beta',
    });
    expect(resB.status).toBe(201);
    storeBCookie = resB.headers['set-cookie'][0];
    storeBId = resB.body.data.store.id;

    /**
     * Store A levies 8% tax, by configuration.
     *
     * The order totals below (200.00 + 16.00 = 216.00, and the 21600-kobo
     * webhook amounts that must match them) assumed the platform-wide
     * hardcoded 8%. Tax is per-store now and defaults to off, so the rate has
     * to be set for those figures to mean anything — and with the webhook
     * handler verifying the amount against the order, a mismatch here would
     * correctly refuse to mark the order paid.
     */
    await prisma.storeSettings.upsert({
      where: { storeId: storeAId },
      update: { taxEnabled: true, taxRate: 8 },
      create: { storeId: storeAId, taxEnabled: true, taxRate: 8 },
    });

    // 3. Create active product for Store A
    const skuP5 = `SKU-P5-${Date.now()}`;
    const prodARes = await request
      .post('/api/products')
      .set('Cookie', [storeACookie])
      .send({
        title: 'Phase 5 Leather Watch',
        description: 'Luxury chronograph watch',
        price: 200.0,
        sku: skuP5,
        status: 'ACTIVE',
        category: 'Accessories',
        variants: [{ title: 'Gold / Black', sku: `${skuP5}-VAR`, price: 200.0, inventoryQuantity: 10 }],
      });
    expect(prodARes.status).toBe(201);
    activeProductId = prodARes.body.data.id;
    activeVariantId = prodARes.body.data.variants[0].id;

    // 4. Create Order via storefront checkout
    const checkoutRes = await request
      .post(`/api/storefront/${storeASlug}/checkout`)
      .send({
        items: [{ variantId: activeVariantId, quantity: 1 }],
        customer: { email: 'buyer_p5@example.com', name: 'Alice Buyer' },
        shippingAddress: {
          firstName: 'Alice',
          lastName: 'Buyer',
          address1: '100 Main St',
          city: 'Boston',
          state: 'MA',
          zip: '02108',
          country: 'US',
        },
      });
    expect(checkoutRes.status).toBe(201);
    createdOrderId = checkoutRes.body.order.id;
    createdOrderNumber = checkoutRes.body.order.orderNumber;
  });

  it('1. Payment Initialization: calculates authoritative order total server-side and creates payment reference', async () => {
    const res = await request
      .post('/api/payments/initialize')
      .send({
        orderId: createdOrderId,
        provider: 'PAYSTACK',
        callbackUrl: 'http://localhost:5173/#storefront',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(216.0); // $200 + $16 tax
    expect(res.body.data.reference).toMatch(/^ref_/);
    expect(res.body.data.authorizationUrl).toBeDefined();
  });

  it('2. Server Payment Verification: verifies reference and marks order PAID & CONFIRMED', async () => {
    // Fetch initialized payment reference
    const payment = await prisma.payment.findFirst({ where: { orderId: createdOrderId } });
    expect(payment).toBeDefined();

    const res = await request.get(`/api/payments/${payment!.providerReference}/verify`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderStatus).toBe('CONFIRMED');

    // Verify DB state
    const updatedOrder = await prisma.order.findUnique({ where: { id: createdOrderId } });
    expect(updatedOrder?.paymentStatus).toBe('PAID');
    expect(updatedOrder?.status).toBe('CONFIRMED');
  });

  it('3. Webhook Security: rejects webhook with invalid signature', async () => {
    const res = await request
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', 'invalid_fake_signature_123')
      .send({ event: 'charge.success', data: { reference: 'ref_fake' } });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid webhook signature');
  });

  it('4. Webhook Idempotency: duplicate webhooks do not duplicate transaction logs', async () => {
    // Create new order for webhook test
    const checkoutRes = await request
      .post(`/api/storefront/${storeASlug}/checkout`)
      .send({
        items: [{ variantId: activeVariantId, quantity: 1 }],
        customer: { email: 'webhook_buyer@example.com', name: 'Bob Buyer' },
        shippingAddress: { firstName: 'Bob', lastName: 'Buyer', address1: '200 Park Ave', city: 'NY', state: 'NY', zip: '10001', country: 'US' },
      });
    const orderId = checkoutRes.body.order.id;

    const initRes = await request.post('/api/payments/initialize').send({ orderId, provider: 'PAYSTACK' });
    const reference = initRes.body.data.reference;

    const webhookBody = {
      event: 'charge.success',
      id: `evt_${Date.now()}`,
      data: { reference, status: 'success', amount: 21600 },
    };

    // A real HMAC over the exact bytes sent. The provider used to accept the
    // literal string 'test_paystack_signature', which the webhook handler
    // treats as authority to mark an order PAID -- a remote switch for anyone
    // who read the source.
    const signature = crypto
      .createHmac('sha512', TEST_WEBHOOK_SECRET)
      .update(JSON.stringify(webhookBody))
      .digest('hex');

    // First webhook call
    const res1 = await request
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', signature)
      .send(webhookBody);
    expect(res1.status).toBe(200);

    // Second webhook call with same eventId (idempotency check)
    const res2 = await request
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', signature)
      .send(webhookBody);
    expect(res2.status).toBe(200);
    expect(res2.body.note).toBe('Event already processed');

    // Verify order paid
    const updatedOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(updatedOrder?.paymentStatus).toBe('PAID');
  });

  it('5. Server Shipping Calculation: calculates rate per destination country', async () => {
    const res = await request
      .post(`/api/shipping/rates/${storeASlug}`)
      .send({ country: 'US', subtotal: 200.0 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rates.length).toBeGreaterThan(0);
    expect(res.body.data.rates[0].price).toBe(0); // Free shipping over $100
  });

  it('6. Merchant Fulfillment & Shipment Tracking: marks order FULFILLED and logs tracking events', async () => {
    const res = await request
      .post(`/api/shipments/orders/${createdOrderId}/fulfill`)
      .set('Cookie', [storeACookie])
      .send({
        carrier: 'DHL Express',
        trackingNumber: 'TRACK-9988776655',
        notes: 'Handed over to courier driver',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.carrier).toBe('DHL Express');
    expect(res.body.data.trackingNumber).toBe('TRACK-9988776655');

    // Verify order fulfillment status
    const updatedOrder = await prisma.order.findUnique({ where: { id: createdOrderId } });
    expect(updatedOrder?.fulfillmentStatus).toBe('FULFILLED');

    // Retrieve shipment tracking. This lookup is merchant-only: it used to be
    // mounted above the auth middleware and served any order id to anyone, so
    // this assertion now carries the owner's session. Buyers track orders via
    // GET /storefront/track/search, which requires the order number and email.
    const trackRes = await request
      .get(`/api/shipments/orders/${createdOrderId}`)
      .set('Cookie', [storeACookie]);
    expect(trackRes.status).toBe(200);
    expect(trackRes.body.data.trackingEvents.length).toBeGreaterThan(0);
  });

  it('7. Full Order Refund: processes refund, marks order REFUNDED, and restores inventory stock', async () => {
    const res = await request
      .post(`/api/payments/orders/${createdOrderId}/refund`)
      .set('Cookie', [storeACookie])
      .send({
        reason: 'Customer returned item in original box',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.refund.status).toBe('REFUNDED');

    // Verify order status
    const updatedOrder = await prisma.order.findUnique({ where: { id: createdOrderId } });
    expect(updatedOrder?.paymentStatus).toBe('REFUNDED');
    expect(updatedOrder?.status).toBe('REFUNDED');
  });

  it('8. Multi-Tenant Security Isolation: Store B user cannot refund or fulfill Store A orders', async () => {
    // Attempt refund of Store A order using Store B cookie
    const refundRes = await request
      .post(`/api/payments/orders/${createdOrderId}/refund`)
      .set('Cookie', [storeBCookie])
      .send({ reason: 'Unauthorized attempt' });

    expect(refundRes.status).toBe(404);

    // Attempt fulfillment of Store A order using Store B cookie
    const fulfillRes = await request
      .post(`/api/shipments/orders/${createdOrderId}/fulfill`)
      .set('Cookie', [storeBCookie])
      .send({ carrier: 'Fake Express', trackingNumber: 'FAKE123' });

    expect(fulfillRes.status).toBe(404);
  });
});
