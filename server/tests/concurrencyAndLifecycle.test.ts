import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { OrderStatus, PaymentStatus, PaymentProvider, SubscriptionStatus } from '@prisma/client';
import { jobQueue } from '../src/jobs/jobQueue.js';
import { hashSessionToken } from '../src/services/auth/tokens.service.js';
import { currencyCodeOf, defaultCurrencyCode } from '../src/config/currency.js';

const request = supertest(app);

/**
 * Stage 3 of the pre-deploy audit: concurrency, lifecycle and the quieter
 * correctness problems. As elsewhere, each test asserts the shape of a failure
 * that was shipped.
 */

/** Wait for the in-process queue to drain the job we just enqueued. */
async function runJob(type: Parameters<typeof jobQueue.enqueue>[0]): Promise<void> {
  jobQueue.enqueue(type);
  // The queue drains on setImmediate; a few macrotask turns is ample, and the
  // assertions below re-read from the database rather than trusting a timer.
  for (let i = 0; i < 40; i++) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

describe('Checkout cannot oversell the last unit', () => {
  let merchantRef: string;
  let cookie: string;
  let variantId: string;

  beforeAll(async () => {
    const reg = await request.post('/api/auth/register').send({
      name: 'Oversell Merchant',
      email: `oversell_${Date.now()}@nexus.io`,
      password: 'Password123!',
      displayName: 'Oversell Merchant',
    });
    cookie = reg.headers['set-cookie'][0];
    merchantRef = reg.body.data.merchant.id;

    const sku = `SKU-OS-${Date.now()}`;
    const prod = await request
      .post('/api/products')
      .set('Cookie', [cookie])
      .send({
        title: 'Last One Left',
        price: 100,
        sku,
        status: 'ACTIVE',
        variants: [{ title: 'Only', sku: `${sku}-V`, price: 100, inventoryQuantity: 1 }],
      });
    variantId = prod.body.data.variants[0].id;
  });

  it('lets exactly one of two simultaneous checkouts take the last unit', async () => {
    /**
     * The race this closes.
     *
     * Checkout read `inventoryQuantity`, compared it, then decremented in a
     * separate statement. Prisma runs the transaction at READ COMMITTED, so
     * both requests read 1, both passed the comparison, and both decremented
     * — leaving the variant at -1 and two customers holding the same item.
     *
     * The decrement is now its own guard (`updateMany` with the quantity in
     * the predicate), so the comparison happens inside the row lock.
     */
    const order = (email: string) =>
      request.post(`/api/shop/${merchantRef}/checkout`).send({
        items: [{ variantId, quantity: 1 }],
        customer: { email, name: 'Race Buyer' },
        shippingAddress: {
          firstName: 'Race', lastName: 'Buyer', address1: '1 Fast Lane',
          city: 'Lagos', state: 'LA', zip: '100001', country: 'Nigeria',
        },
      });

    const [a, b] = await Promise.all([
      order('racer.a@example.com'),
      order('racer.b@example.com'),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 400]);

    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    // The whole point: never negative.
    expect(variant!.inventoryQuantity).toBe(0);
  });
});

describe('Abandoned checkouts give their stock back', () => {
  let merchantId: string;
  let productId: string;

  beforeAll(async () => {
    const reg = await request.post('/api/auth/register').send({
      name: 'Abandon Merchant',
      email: `abandon_${Date.now()}@nexus.io`,
      password: 'Password123!',
      displayName: 'Abandon Merchant',
    });
    merchantId = reg.body.data.merchant.id;

    const prod = await request
      .post('/api/products')
      .set('Cookie', [reg.headers['set-cookie'][0]])
      .send({
        title: 'Reserved Widget',
        price: 50,
        sku: `SKU-AB-${Date.now()}`,
        inventory: 10,
        status: 'ACTIVE',
      });
    productId = prod.body.data.id;
  });

  it('releases the reservation of an order left unpaid, exactly once', async () => {
    const invBefore = await prisma.inventoryItem.findFirst({ where: { merchantId, productId } });
    const startingStock = invBefore!.availableStock;

    // An order placed four hours ago that was never paid: stock reserved at
    // checkout, and nothing ever gave it back. Only an explicit call to
    // /payments/:ref/verify returning FAILED did, so a shopper who closed the
    // tab held the stock for ever.
    const order = await prisma.order.create({
      data: {
        merchantId,
        orderNumber: `#AB-${Date.now()}`,
        customerName: 'Gone Away',
        customerEmail: 'gone@example.com',
        subtotal: 100, tax: 0, shipping: 0, total: 100,
        currency: 'NGN',
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        items: {
          create: [{
            productId, productTitle: 'Reserved Widget', sku: 'SKU-AB',
            quantity: 2, price: 50, total: 100,
          }],
        },
      },
    });

    await prisma.inventoryItem.update({
      where: { id: invBefore!.id },
      data: { availableStock: { decrement: 2 } },
    });

    await runJob('EXPIRE_ABANDONED_ORDERS');

    const released = await prisma.order.findUnique({ where: { id: order.id } });
    expect(released!.status).toBe(OrderStatus.CANCELLED);

    const invAfter = await prisma.inventoryItem.findFirst({ where: { merchantId, productId } });
    expect(invAfter!.availableStock).toBe(startingStock);

    // Running again must not inflate stock — the same unbounded-increment
    // shape the verify endpoint had.
    await runJob('EXPIRE_ABANDONED_ORDERS');
    const invTwice = await prisma.inventoryItem.findFirst({ where: { merchantId, productId } });
    expect(invTwice!.availableStock).toBe(startingStock);
  });

  it('never touches an order that was actually paid', async () => {
    const order = await prisma.order.create({
      data: {
        merchantId,
        orderNumber: `#PAID-${Date.now()}`,
        customerName: 'Real Buyer',
        customerEmail: 'real@example.com',
        subtotal: 50, tax: 0, shipping: 0, total: 50,
        currency: 'NGN',
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      },
    });

    await prisma.payment.create({
      data: {
        merchantId,
        orderId: order.id,
        provider: PaymentProvider.PAYSTACK,
        providerReference: `ref_paid_${Date.now()}`,
        amount: 50,
        currency: 'NGN',
        status: PaymentStatus.SUCCESS,
      },
    });

    await runJob('EXPIRE_ABANDONED_ORDERS');

    const after = await prisma.order.findUnique({ where: { id: order.id } });
    // A settled payment outranks whatever the order's own status column says.
    expect(after!.status).not.toBe(OrderStatus.CANCELLED);
  });
});

describe('A subscription period that runs out is not renewed for free', () => {
  let merchantId: string;

  beforeAll(async () => {
    const reg = await request.post('/api/auth/register').send({
      name: 'Renewal Merchant',
      email: `renewal_${Date.now()}@nexus.io`,
      password: 'Password123!',
      displayName: 'Renewal Merchant',
    });
    merchantId = reg.body.data.merchant.id;
    // Materialise the subscription.
    await request.get('/api/subscriptions/current').set('Cookie', [reg.headers['set-cookie'][0]]);
  });

  it('moves an expired paid period to PAST_DUE instead of extending it', async () => {
    const plan = await prisma.subscriptionPlan.findFirst({ where: { code: 'growth' } });

    await prisma.subscription.update({
      where: { merchantId },
      data: {
        planId: plan!.id,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });

    const before = await prisma.subscription.findUnique({ where: { merchantId } });

    await runJob('PROCESS_SUBSCRIPTION_RENEWALS');

    const after = await prisma.subscription.findUnique({ where: { merchantId } });

    /**
     * The hole this closes.
     *
     * The job pushed `currentPeriodEnd` forward by another 30 or 365 days and
     * logged SUBSCRIPTION_RENEWED, taking no payment of any kind — every paid
     * subscription renewed itself free, for ever. It survived the billing pass
     * only because nothing scheduled the job, so it had never run.
     */
    expect(after!.status).toBe(SubscriptionStatus.PAST_DUE);
    expect(after!.currentPeriodEnd.getTime()).toBe(before!.currentPeriodEnd.getTime());
  });

  it('ends a trial rather than leaving the merchant on the plan indefinitely', async () => {
    await prisma.subscription.update({
      where: { merchantId },
      data: {
        status: SubscriptionStatus.TRIALING,
        currentPeriodEnd: new Date(Date.now() - 60 * 60 * 1000),
      },
    });

    await runJob('PROCESS_GRACE_PERIODS');

    const after = await prisma.subscription.findUnique({ where: { merchantId } });
    expect(after!.status).toBe(SubscriptionStatus.PAST_DUE);
  });
});

describe('Session tokens are stored hashed', () => {
  it('keeps no replayable credential in the database', async () => {
    const email = `sessionhash_${Date.now()}@nexus.io`;
    const reg = await request.post('/api/auth/register').send({
      name: 'Session Hash Merchant',
      email,
      password: 'Password123!',
      displayName: 'Session Hash Merchant',
    });
    expect(reg.status).toBe(201);

    const cookie = (reg.headers['set-cookie'] as string[])[0];
    const rawToken = cookie.split(';')[0].split('=')[1];

    const user = await prisma.user.findUnique({ where: { email } });
    const session = await prisma.session.findFirst({ where: { userId: user!.id } });

    /**
     * A leaked snapshot used to be a set of live cookies: `sessionToken` held
     * the exact value a client presents, so every row could be pasted
     * straight into a `nexus_session` cookie. Reset and verification tokens on
     * the same codebase were already hashed; sessions were the asymmetry.
     */
    expect(session!.sessionToken).not.toBe(rawToken);
    expect(session!.sessionToken).toBe(hashSessionToken(rawToken));

    // And the raw token still works, so hashing did not break authentication.
    const me = await request.get('/api/auth/me').set('Cookie', [cookie]);
    expect(me.status).toBe(200);
  });
});

describe('Payment initialization requires proof the caller placed the order', () => {
  let merchantRef: string;
  let orderId: string;

  beforeAll(async () => {
    const reg = await request.post('/api/auth/register').send({
      name: 'Init Guard Merchant',
      email: `initguard_${Date.now()}@nexus.io`,
      password: 'Password123!',
      displayName: 'Init Guard Merchant',
    });
    merchantRef = reg.body.data.merchant.id;

    const prod = await request
      .post('/api/products')
      .set('Cookie', [reg.headers['set-cookie'][0]])
      .send({
        title: 'Guarded Item',
        price: 100,
        sku: `SKU-IG-${Date.now()}`,
        inventory: 20,
        status: 'ACTIVE',
      });

    const checkout = await request.post(`/api/shop/${merchantRef}/checkout`).send({
      items: [{ variantId: prod.body.data.id, quantity: 1 }],
      customer: { email: 'guarded.buyer@example.com', name: 'Guarded Buyer' },
      shippingAddress: {
        firstName: 'Guarded', lastName: 'Buyer', address1: '2 Quiet Road',
        city: 'Lagos', state: 'LA', zip: '100001', country: 'Nigeria',
      },
    });
    orderId = checkout.body.order.id;
  });

  it('refuses a bare orderId from someone who cannot name the buyer', async () => {
    // It used to accept this, so a guessed or leaked id returned a stranger's
    // total and their gateway URL, and left a PENDING row behind each time.
    const res = await request.post('/api/payments/initialize').send({ orderId });

    expect(res.status).toBe(404);
  });

  it('refuses a wrong email just as firmly', async () => {
    const res = await request
      .post('/api/payments/initialize')
      .send({ orderId, customerEmail: 'someone.else@example.com' });

    // Same shape as "not found": confirming the id exists is itself the leak.
    expect(res.status).toBe(404);
  });

  it('accepts the buyer, and reuses the live attempt rather than minting another', async () => {
    const first = await request
      .post('/api/payments/initialize')
      .send({ orderId, customerEmail: 'guarded.buyer@example.com' });

    expect(first.status).toBe(201);
    expect(first.body.data.authorizationUrl).toBeTruthy();

    const second = await request
      .post('/api/payments/initialize')
      .send({ orderId, customerEmail: 'GUARDED.BUYER@example.com' });

    // Case-insensitive, and the same gateway session — pressing Pay twice no
    // longer leaves an orphaned PENDING row behind.
    expect(second.status).toBe(200);
    expect(second.body.data.reference).toBe(first.body.data.reference);

    const attempts = await prisma.payment.count({ where: { orderId } });
    expect(attempts).toBe(1);
  });
});

describe('Trading currency is configurable, and falls back to naira', () => {
  it('recovers the code from a merchant currency label', () => {
    expect(currencyCodeOf('NGN — Nigerian Naira')).toBe('NGN');
    expect(currencyCodeOf('USD — US Dollar')).toBe('USD');
    // Tolerates a bare code, since not every row was written the same way.
    expect(currencyCodeOf('GHS')).toBe('GHS');
    expect(currencyCodeOf(null)).toBe(defaultCurrencyCode());
  });

  it('falls back to naira for an unrecognised configured value', () => {
    const original = process.env.DEFAULT_CURRENCY;
    try {
      process.env.DEFAULT_CURRENCY = 'XYZ';
      // Guessing at a currency the gateway may not support is worse than the
      // documented default.
      expect(defaultCurrencyCode()).toBe('NGN');

      process.env.DEFAULT_CURRENCY = 'ngn';
      expect(defaultCurrencyCode()).toBe('NGN');
    } finally {
      if (original === undefined) delete process.env.DEFAULT_CURRENCY;
      else process.env.DEFAULT_CURRENCY = original;
    }
  });
});

describe('One merchant account per seller', () => {
  const password = 'Password123!';

  it('refuses a second merchant account for the same user, with an explanation', async () => {
    const email = `one_account_${Date.now()}@nexus.io`;

    const first = await request.post('/api/auth/register').send({
      name: 'Single Account Merchant',
      email,
      password,
      displayName: 'First Merchant Account',
    });
    expect(first.status).toBe(201);
    const cookie = first.headers['set-cookie'][0];

    /**
     * Nexus is a single marketplace: a merchant sells from their merchant
     * account and does not run several independent shops. Nothing used to say
     * so — `@@unique([userId, merchantId])` only stopped joining the same record
     * twice — which is why the code that resolves "the current merchant" had
     * to fall back to `memberships[0]`, i.e. whichever row came back first.
     */
    const second = await request
      .post('/api/auth/register')
      .set('Cookie', [cookie])
      .send({
        name: 'Single Account Merchant',
        email,
        password,
        displayName: 'Second Merchant Account',
      });

    expect(second.status).toBeGreaterThanOrEqual(400);
    expect(second.status).toBeLessThan(500);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });
    const owned = user!.memberships.filter(m => m.role === 'OWNER');
    expect(owned).toHaveLength(1);
  });

  it('resolves the owned account over one the user was invited onto', async () => {
    const { activeMembershipOf } = await import('../src/services/auth/membership.js');

    const older = new Date('2026-01-01');
    const newer = new Date('2026-06-01');

    // A merchant invited onto someone else's account as STAFF must keep
    // acting for their own; an invitation cannot take over their session.
    expect(
      activeMembershipOf([
        { role: 'STAFF', createdAt: older },
        { role: 'OWNER', createdAt: newer },
      ])!.role
    ).toBe('OWNER');

    // Same role on two rows resolves to the older one, so the answer is
    // stable across requests rather than dependent on row order.
    const sameRole = activeMembershipOf([
      { role: 'STAFF', createdAt: newer },
      { role: 'STAFF', createdAt: older },
    ]);
    expect(sameRole!.createdAt).toBe(older);

    expect(activeMembershipOf([])).toBeUndefined();
    expect(activeMembershipOf(null)).toBeUndefined();
  });
});
