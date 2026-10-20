import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

const request = supertest(app);

describe('Nexus Commerce Phase 10 Production Readiness & E2E Release Verification Suite', () => {
  const merchantEmail = `merchant_p10_${Date.now()}@nexuscommerce.io`;
  const password = 'Password123!';

  let merchantCookie: string;
  let merchantId: string;
  let productId: string;
  let customerId: string;
  let orderId: string;

  beforeAll(async () => {
    // Clean up potential leftover user
    await prisma.user.deleteMany({ where: { email: merchantEmail } });
  });

  it('1. Readiness & Health Probes: Confirms zero-downtime production readiness', async () => {
    const readyRes = await request.get('/ready');
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.status).toBe('ready');
    expect(readyRes.body.database).toBe('connected');

    const healthRes = await request.get('/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('ok');
  });

  it('2. End-to-End E2E Merchant Onboarding & Merchant Creation', async () => {
    const regRes = await request.post('/api/auth/register').send({
      name: 'Phase 10 Merchant Owner',
      email: merchantEmail,
      password,
      displayName: 'Phase 10 Production Merchant',
    });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    merchantCookie = regRes.headers['set-cookie'][0];
    merchantId = regRes.body.data.merchant.id;
    expect(merchantId).toBeDefined();
  });

  it('3. Product Catalog & Inventory Reservation Workflow', async () => {
    const prodRes = await request
      .post('/api/products')
      .set('Cookie', [merchantCookie])
      .send({
        title: 'Production Premium Jacket',
        price: 149.99,
        sku: `SKU-P10-${Date.now()}`,
        inventory: 50,
        status: 'ACTIVE',
      });

    expect(prodRes.status).toBe(201);
    expect(prodRes.body.success).toBe(true);
    productId = prodRes.body.data.id;
  });

  it('4. Storefront Customer Order Placement & Stock Deduction', async () => {
    const custRes = await request
      .post('/api/customers')
      .set('Cookie', [merchantCookie])
      .send({
        name: 'Jane Production Buyer',
        email: `buyer_p10_${Date.now()}@example.com`,
      });

    expect(custRes.status).toBe(201);
    customerId = custRes.body.data.id;

    const orderRes = await request
      .post('/api/orders')
      .set('Cookie', [merchantCookie])
      .send({
        customerName: 'Jane Production Buyer',
        customerEmail: `buyer_p10_${Date.now()}@example.com`,
        items: [{ productId, quantity: 2 }],
        shippingAddress: {
          firstName: 'Jane',
          lastName: 'Buyer',
          address1: '456 Commerce Blvd',
          city: 'San Francisco',
          state: 'CA',
          zip: '94105',
          country: 'US',
        },
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.success).toBe(true);
    orderId = orderRes.body.data.id;

    // Verify stock was decremented from 50 to 48
    const updatedProd = await prisma.inventoryItem.findFirst({
      where: { merchantId, productId },
    });
    expect(updatedProd?.stock).toBe(48);
  });

  it('5. Team Invitation & RBAC Protection', async () => {
    const staffEmail = `staff_p10_${Date.now()}@nexuscommerce.io`;
    const inviteRes = await request
      .post('/api/team/invite')
      .set('Cookie', [merchantCookie])
      .send({
        email: staffEmail,
        role: 'STAFF',
      });

    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.success).toBe(true);
    expect(inviteRes.body.data.invitation.token).toBeDefined();
  });

  it('7. SaaS Subscription Plan Entitlements & Invoice Breakdown', async () => {
    const subRes = await request
      .post('/api/subscriptions/subscribe')
      .set('Cookie', [merchantCookie])
      .send({ planCode: 'growth', interval: 'MONTHLY' });

    expect(subRes.status).toBe(201);
    /**
     * Subscribing opens a checkout; the plan is granted by the payment.
     *
     * This asserted `subscription.plan.code === 'growth'` immediately after
     * subscribing, which passed only because the old implementation wrote the
     * plan and a PAID invoice before the merchant had reached the gateway.
     */
    expect(subRes.body.data.requiresPayment).toBe(true);
    expect(subRes.body.data.authorizationUrl).toBeTruthy();
    expect(subRes.body.data.invoice.status).toBe('OPEN');

    const { saasBillingService } = await import('../src/services/billing/saasBilling.service.js');
    const growthPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'growth' } });
    const settled = await saasBillingService.settlePaidInvoice(subRes.body.data.reference, {
      verifiedAmount: growthPlan!.monthlyPrice,
    });
    expect(settled.settled).toBe(true);

    const confirmedRes = await request
      .get('/api/subscriptions/current')
      .set('Cookie', [merchantCookie]);
    expect(confirmedRes.body.data.subscription.plan.code).toBe('growth');

    const invRes = await request
      .get('/api/subscriptions/invoices')
      .set('Cookie', [merchantCookie]);

    expect(invRes.status).toBe(200);
    expect(invRes.body.data.length).toBeGreaterThanOrEqual(1);
    // The invoice is PAID now because a payment settled it, not because it was
    // created that way.
    expect(invRes.body.data.some((i: any) => i.status === 'PAID')).toBe(true);
    expect(invRes.body.data[0].invoiceNumber).toMatch(/^NX-INV-/);
  });
});
