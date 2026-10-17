import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { PaymentProvider, PaymentStatus, ShippingRateType } from '@prisma/client';
import { quoteOrder, countryCode, shippingOptionsFor } from '../src/services/pricing/quote.service.js';
import { checkSessionCookieViability } from '../src/utils/deploymentChecks.js';
import { resolveDefaultPlan, DEFAULT_PLAN_CODE } from '../src/services/billing/defaultPlan.js';
import { TEST_WEBHOOK_SECRET } from './testDatabaseUrl.js';

const request = supertest(app);

/**
 * Stage 2 of the pre-deploy audit: items 10-18.
 *
 * As with `deployBlockers.test.ts`, each block asserts the shape of a failure
 * that was shipped, so a refactor that reopens it fails here.
 */

function sign(body: unknown): string {
  return crypto
    .createHmac('sha512', TEST_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
}

describe('Item 15: a webhook only settles an order for the right amount', () => {
  let storeId: string;
  let cookie: string;
  let productId: string;

  beforeAll(async () => {
    const reg = await request.post('/api/auth/register').send({
      name: 'Webhook Integrity Merchant',
      email: `webhook_integrity_${Date.now()}@nexus.io`,
      password: 'Password123!',
      storeName: 'Webhook Integrity Store',
    });
    cookie = reg.headers['set-cookie'][0];
    storeId = reg.body.data.store.id;

    const prod = await request
      .post('/api/products')
      .set('Cookie', [cookie])
      .send({
        title: 'Webhook Widget',
        price: 100,
        sku: `SKU-WH-${Date.now()}`,
        inventory: 50,
        status: 'ACTIVE',
      });
    productId = prod.body.data.id;
  });

  /** An order plus a PENDING payment, ready for a webhook. */
  async function pendingOrder(total: number, currency = 'NGN') {
    const order = await prisma.order.create({
      data: {
        storeId,
        orderNumber: `#WH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        customerName: 'Webhook Buyer',
        customerEmail: 'webhook@example.com',
        subtotal: total,
        tax: 0,
        shipping: 0,
        total,
        currency,
        items: {
          create: [
            {
              productId,
              productTitle: 'Webhook Widget',
              sku: 'SKU-WH',
              quantity: 1,
              price: total,
              total,
            },
          ],
        },
      },
    });

    const reference = `ref_wh_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    await prisma.payment.create({
      data: {
        storeId,
        orderId: order.id,
        provider: PaymentProvider.PAYSTACK,
        providerReference: reference,
        amount: total,
        currency,
        status: PaymentStatus.PENDING,
      },
    });

    return { order, reference };
  }

  it('refuses to mark an order paid when the gateway took less', async () => {
    const { order, reference } = await pendingOrder(100);

    // Paystack reports in kobo: 500 = 5.00, against a 100.00 order.
    const body = {
      event: 'charge.success',
      id: `evt_under_${Date.now()}`,
      data: { reference, status: 'success', amount: 500, currency: 'NGN' },
    };

    const res = await request
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', sign(body))
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.outcome.reason).toBe('amount_mismatch');

    const after = await prisma.order.findUnique({ where: { id: order.id } });
    expect(after!.paymentStatus).toBe('PENDING');
    expect(after!.status).not.toBe('CONFIRMED');
  });

  it('refuses to mark an order paid when the currency differs', async () => {
    const { order, reference } = await pendingOrder(100, 'NGN');

    // 100 USD is not 100 NGN. Numerically the figures agree, so without the
    // currency check this settled a naira order with a dollar payment.
    const body = {
      event: 'charge.success',
      id: `evt_curr_${Date.now()}`,
      data: { reference, status: 'success', amount: 10000, currency: 'USD' },
    };

    const res = await request
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', sign(body))
      .send(body);

    expect(res.body.outcome.reason).toBe('currency_mismatch');
    const after = await prisma.order.findUnique({ where: { id: order.id } });
    expect(after!.paymentStatus).toBe('PENDING');
  });

  it('settles once on the right amount, and ignores a redelivery', async () => {
    const { order, reference } = await pendingOrder(100);
    const body = {
      event: 'charge.success',
      id: `evt_ok_${Date.now()}`,
      data: { reference, status: 'success', amount: 10000, currency: 'NGN' },
    };
    const signature = sign(body);

    const first = await request
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', signature)
      .send(body);
    expect(first.body.outcome.status).toBe('settled');

    // Both gateways retry. The registry short-circuits the second delivery.
    const second = await request
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', signature)
      .send(body);
    expect(second.status).toBe(200);

    const after = await prisma.order.findUnique({ where: { id: order.id } });
    expect(after!.paymentStatus).toBe('PAID');
    expect(after!.status).toBe('CONFIRMED');

    // Exactly one CHARGE row: two deliveries used to write two, double
    // counting the revenue.
    const payment = await prisma.payment.findUnique({ where: { providerReference: reference } });
    const charges = await prisma.transaction.count({
      where: { paymentId: payment!.id, type: 'CHARGE' },
    });
    expect(charges).toBe(1);
  });

  it('marks the registry row processed even for an event it does not handle', async () => {
    const eventId = `evt_unhandled_${Date.now()}`;
    const body = {
      event: 'transfer.success',
      id: eventId,
      data: { reference: 'nothing-we-know-about' },
    };

    await request
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', sign(body))
      .send(body);

    // `processed` was only set inside the success branch, so every other
    // delivery stayed false for ever and the registry could not answer
    // "have we handled this?".
    const row = await prisma.webhookEvent.findUnique({ where: { eventId } });
    expect(row).toBeTruthy();
    expect(row!.processed).toBe(true);
    expect(row!.processedAt).toBeTruthy();
  });

  it('records a failed charge against the order instead of discarding it', async () => {
    const { order, reference } = await pendingOrder(100);
    const body = {
      event: 'charge.failed',
      id: `evt_failed_${Date.now()}`,
      data: { reference, status: 'failed', gateway_response: 'Insufficient funds' },
    };

    await request
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', sign(body))
      .send(body);

    const after = await prisma.order.findUnique({ where: { id: order.id } });
    expect(after!.paymentStatus).toBe('FAILED');
  });

  it('does not unpay an order when a failure notice arrives after a success', async () => {
    const { order, reference } = await pendingOrder(100);

    const success = {
      event: 'charge.success',
      id: `evt_s_${Date.now()}`,
      data: { reference, status: 'success', amount: 10000, currency: 'NGN' },
    };
    await request
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', sign(success))
      .send(success);

    const failure = {
      event: 'charge.failed',
      id: `evt_f_${Date.now()}`,
      data: { reference, status: 'failed' },
    };
    await request
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', sign(failure))
      .send(failure);

    const after = await prisma.order.findUnique({ where: { id: order.id } });
    expect(after!.paymentStatus).toBe('PAID');
  });
});

describe('Item 14: tax and delivery are configured, not hardcoded', () => {
  let storeId: string;
  const originalTax = process.env.PLATFORM_TAX_PERCENT;
  const originalLabel = process.env.PLATFORM_TAX_LABEL;
  const originalInclusive = process.env.PLATFORM_TAX_INCLUSIVE;

  /**
   * Tax moved from a per-store column to platform configuration.
   *
   * Nexus is a single marketplace — it takes the money and issues the
   * receipt — so one rate applies to every sale rather than each merchant
   * declaring their own. These tests therefore set the environment rather
   * than a StoreSettings row.
   */
  afterAll(() => {
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore('PLATFORM_TAX_PERCENT', originalTax);
    restore('PLATFORM_TAX_LABEL', originalLabel);
    restore('PLATFORM_TAX_INCLUSIVE', originalInclusive);
  });

  beforeAll(async () => {
    const reg = await request.post('/api/auth/register').send({
      name: 'Pricing Merchant',
      email: `pricing_${Date.now()}@nexus.io`,
      password: 'Password123!',
      storeName: 'Pricing Store',
    });
    storeId = reg.body.data.store.id;
  });

  it('charges no tax and no delivery when nothing is configured', async () => {
    delete process.env.PLATFORM_TAX_PERCENT;

    // The hardcoded 8% + $15 made this state impossible to express: every
    // order carried a US sales tax nobody had configured.
    const quote = await quoteOrder({ storeId, subtotal: 300 });

    expect(quote.tax).toBe(0);
    expect(quote.taxRate).toBe(0);
    expect(quote.shipping).toBe(0);
    expect(quote.total).toBe(300);
  });

  it('applies the configured rate and label', async () => {
    process.env.PLATFORM_TAX_PERCENT = '7.5';
    process.env.PLATFORM_TAX_LABEL = 'VAT';

    const quote = await quoteOrder({ storeId, subtotal: 200 });
    expect(quote.tax).toBe(15);
    expect(quote.taxLabel).toBe('VAT');
    expect(quote.total).toBe(215);
  });

  it('taxes what is owed after the discount, not the gross subtotal', async () => {
    process.env.PLATFORM_TAX_PERCENT = '7.5';

    // Tax was applied to the pre-discount subtotal, so a discount code did not
    // reduce the tax it should have.
    const quote = await quoteOrder({ storeId, subtotal: 200, discountAmount: 100 });

    expect(quote.discountAmount).toBe(100);
    expect(quote.tax).toBe(7.5);
    expect(quote.total).toBe(107.5);
  });

  it('extracts rather than adds tax when prices are tax-inclusive', async () => {
    process.env.PLATFORM_TAX_PERCENT = '10';
    process.env.PLATFORM_TAX_INCLUSIVE = 'true';

    const quote = await quoteOrder({ storeId, subtotal: 110 });
    // 110 gross at 10% inclusive => 10 of tax, total unchanged.
    expect(quote.tax).toBe(10);
    expect(quote.total).toBe(110);

    process.env.PLATFORM_TAX_INCLUSIVE = 'false';
    process.env.PLATFORM_TAX_PERCENT = '0';
  });

  it("reads the merchant's own shipping zones, which checkout used to ignore", async () => {
    const zone = await prisma.shippingZone.create({
      data: { storeId, name: 'Nigeria', countries: ['NG'] },
    });
    await prisma.shippingMethod.create({
      data: {
        zoneId: zone.id,
        storeId,
        name: 'Lagos courier',
        rateType: ShippingRateType.FLAT_RATE,
        price: 2500,
        freeThreshold: 50000,
        estimatedDays: '1-2 days',
      },
    });
    await prisma.shippingMethod.create({
      data: {
        zoneId: zone.id,
        storeId,
        name: 'Express',
        rateType: ShippingRateType.FLAT_RATE,
        price: 6000,
      },
    });

    // The country arrives from checkout as a display name, while zones store
    // ISO codes — the old code compared the two directly, so no zone ever
    // matched what the form submitted.
    expect(countryCode('Nigeria')).toBe('NG');

    const quote = await quoteOrder({ storeId, subtotal: 10000, country: 'Nigeria' });
    // Cheapest by default, so nobody is silently upsold to express.
    expect(quote.shipping).toBe(2500);
    expect(quote.shippingMethodName).toBe('Lagos courier');
    expect(quote.shippingOptions).toHaveLength(2);

    // A chosen option is honoured.
    const express = quote.shippingOptions.find(o => o.name === 'Express')!;
    const expressQuote = await quoteOrder({
      storeId,
      subtotal: 10000,
      country: 'Nigeria',
      shippingMethodId: express.id,
    });
    expect(expressQuote.shipping).toBe(6000);

    // Over the free threshold it is free.
    const bigQuote = await quoteOrder({ storeId, subtotal: 60000, country: 'Nigeria' });
    expect(bigQuote.shipping).toBe(0);
  });

  it('does not quote one zone\'s rates to a destination it does not cover', async () => {
    // The old endpoint fell back to the *first* zone when none matched, which
    // quoted Lagos rates to a shopper in Berlin.
    const options = await shippingOptionsFor(storeId, 10000, 'Germany');
    expect(options.every(o => o.name !== 'Lagos courier')).toBe(true);
  });
});

describe('Item 10: a 5xx is logged and does not leak internals', () => {
  it('returns a correlation id and a fixed message, not the error text', async () => {
    /**
     * `/api/payments/:reference/verify` on a reference that exists but whose
     * provider explodes is awkward to force here, so this asserts the handler
     * contract directly against a route that raises a 500.
     *
     * The handler used to return `err.message` verbatim, which for a Prisma
     * error quotes table names, column names and query fragments.
     */
    const { errorHandler } = await import('../src/middleware/error.middleware.js');
    const { config } = await import('../src/config/index.js');

    const captured: any = {};
    const res: any = {
      status(code: number) { captured.status = code; return this; },
      json(body: unknown) { captured.body = body; return this; },
    };

    const error = Object.assign(
      new Error('Invalid `prisma.user.findUnique()` invocation in /app/src/x.ts'),
      { code: 'P2002', meta: { target: ['email'] } }
    );

    // Forced, because the suite runs with NODE_ENV=test where the handler
    // deliberately *does* attach the message and stack — the developer is the
    // operator there and there is nobody to leak it to. Production is the
    // case under test.
    const originalIsProd = config.isProd;
    try {
      (config as any).isProd = true;
      errorHandler(error, { method: 'POST', originalUrl: '/api/things' } as any, res, (() => {}) as any);
    } finally {
      (config as any).isProd = originalIsProd;
    }

    expect(captured.status).toBe(500);
    expect(captured.body.error).toBe('Something went wrong on our end. Please try again.');
    expect(captured.body.errorId).toMatch(/^[0-9a-f]{12}$/);
    expect(JSON.stringify(captured.body)).not.toContain('prisma.user.findUnique');
    expect(captured.body.stack).toBeUndefined();
    expect(captured.body.debug).toBeUndefined();
  });

  it('attaches the message and stack in development, where there is nobody to leak to', async () => {
    const { errorHandler } = await import('../src/middleware/error.middleware.js');

    const captured: any = {};
    const res: any = {
      status(code: number) { captured.status = code; return this; },
      json(body: unknown) { captured.body = body; return this; },
    };

    errorHandler(
      new Error('something specific went wrong'),
      { method: 'POST', originalUrl: '/api/things' } as any,
      res,
      (() => {}) as any
    );

    expect(captured.status).toBe(500);
    expect(captured.body.debug).toBe('something specific went wrong');
  });

  it('preserves the message on a deliberate 4xx, because that is the contract', async () => {
    const { errorHandler } = await import('../src/middleware/error.middleware.js');

    const captured: any = {};
    const res: any = {
      status(code: number) { captured.status = code; return this; },
      json(body: unknown) { captured.body = body; return this; },
    };

    errorHandler(
      Object.assign(new Error('Product limit reached for Starter Plan'), { statusCode: 403 }),
      { method: 'POST', originalUrl: '/api/products' } as any,
      res,
      (() => {}) as any
    );

    expect(captured.status).toBe(403);
    expect(captured.body.error).toBe('Product limit reached for Starter Plan');
    expect(captured.body.errorId).toBeUndefined();
  });
});

describe('Item 17: a production build that cannot hold a session refuses to boot', () => {
  it('is fatal for an http:// production origin', () => {
    const verdict = checkSessionCookieViability('http://shop.example.com', true);
    expect(verdict.fatal).toBe(true);
    expect(verdict.insecureOrigins).toEqual(['http://shop.example.com']);
  });

  it('accepts https, and is fatal if any origin in the list is insecure', () => {
    expect(checkSessionCookieViability('https://shop.example.com', true).fatal).toBe(false);
    expect(
      checkSessionCookieViability('https://shop.example.com,http://admin.example.com', true).fatal
    ).toBe(true);
  });

  it('allows loopback, which browsers treat as a secure context', () => {
    const verdict = checkSessionCookieViability('http://localhost:5173', true);
    expect(verdict.fatal).toBe(false);
    expect(verdict.loopbackOnly).toBe(true);
  });

  it('never blocks development', () => {
    expect(checkSessionCookieViability('http://localhost:5173', false).fatal).toBe(false);
  });
});

describe('Items 2/3 follow-up: the default tier is explicit, not the cheapest row', () => {
  it('resolves the entry tier by code', async () => {
    const plan = await resolveDefaultPlan();
    expect(plan).toBeTruthy();
    expect(plan!.code).toBe(DEFAULT_PLAN_CODE);
  });

  it('ignores an inactive zero-priced plan', async () => {
    /**
     * The regression this guards.
     *
     * Picking "the cheapest active plan" meant any zero-priced row became
     * every new store's entitlement. The Nexus IQ suite creates exactly such
     * a plan, and it silently became the platform default for every store
     * created after that file ran — changing what merchants could do and what
     * they were charged to switch tier.
     */
    const decoy = await prisma.subscriptionPlan.create({
      data: {
        code: `decoy-free-${Date.now()}`,
        name: 'Decoy Free Plan',
        description: 'Priced at zero; must never become the default.',
        monthlyPrice: 0,
        annualPrice: 0,
        isActive: false,
      },
    });

    try {
      const plan = await resolveDefaultPlan();
      expect(plan!.code).toBe(DEFAULT_PLAN_CODE);
      expect(plan!.id).not.toBe(decoy.id);
    } finally {
      await prisma.subscriptionPlan.delete({ where: { id: decoy.id } });
    }
  });
});
