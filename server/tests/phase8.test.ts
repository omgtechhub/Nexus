import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

const request = supertest(app);

describe('Nexus Commerce Phase 8 Integration Tests (SaaS Billing, Subscriptions, Entitlements, Invoices, Webhooks & Platform Admin)', () => {
  const merchantAEmail = `merchant_p8_a_${Date.now()}@nexus.io`;
  const merchantBEmail = `merchant_p8_b_${Date.now()}@nexus.io`;
  const platformAdminEmail = `admin_p8_${Date.now()}@nexus.io`;
  const password = 'Password123!';

  let merchantACookie: string;
  let merchantBCookie: string;
  let adminCookie: string;
  let merchantAId: string;
  let merchantBId: string;

  let createdPlanId: string;
  let testInvoiceId: string;

  beforeAll(async () => {
    // 1. Register Store A Merchant
    const resA = await request.post('/api/auth/register').send({
      name: 'Phase 8 Merchant Alpha',
      email: merchantAEmail,
      password,
      displayName: 'SaaS Alpha Merchant',
    });
    expect(resA.status).toBe(201);
    merchantACookie = resA.headers['set-cookie'][0];
    merchantAId = resA.body.data.merchant.id;

    // 2. Register Store B Merchant
    const resB = await request.post('/api/auth/register').send({
      name: 'Phase 8 Merchant Beta',
      email: merchantBEmail,
      password,
      displayName: 'SaaS Beta Merchant',
    });
    expect(resB.status).toBe(201);
    merchantBCookie = resB.headers['set-cookie'][0];
    merchantBId = resB.body.data.merchant.id;

    // 3. Create Platform Admin User & Cookie
    const { hashPassword } = await import('../src/utils/password.js');
    const passwordHash = await hashPassword(password);
    const adminUser = await prisma.user.create({
      data: {
        email: platformAdminEmail,
        name: 'Super Platform Admin',
        passwordHash,
        platformRole: 'PLATFORM_OWNER',
        plan: 'enterprise',
      },
    });

    const loginRes = await request.post('/api/auth/login').send({
      email: platformAdminEmail,
      password,
    });
    expect(loginRes.status).toBe(200);
    adminCookie = loginRes.headers['set-cookie'][0];
  });

  it('1. SaaS Plans API: Publicly lists active database-backed SaaS plans', async () => {
    const res = await request.get('/api/plans');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const starterPlan = res.body.data.find((p: any) => p.code === 'starter');
    expect(starterPlan).toBeDefined();
    expect(starterPlan.monthlyPrice).toBe(29);
  });

  it('2. Merchant Subscriptions API: Manages plan selection, upgrades, downgrades, intervals & cancellation', async () => {
    // Get current subscription & entitlement limits
    const currentRes = await request.get('/api/subscriptions/current').set('Cookie', [merchantACookie]);
    expect(currentRes.status).toBe(200);
    expect(currentRes.body.success).toBe(true);
    expect(currentRes.body.data.entitlements).toBeDefined();

    // Subscribe / Change to Starter plan
    const subRes = await request
      .post('/api/subscriptions/subscribe')
      .set('Cookie', [merchantACookie])
      .send({ planCode: 'starter', interval: 'MONTHLY' });

    expect(subRes.status).toBe(201);
    expect(subRes.body.success).toBe(true);
    expect(subRes.body.data.subscription).toBeDefined();
    /**
     * Subscribing starts a checkout; it does not grant the plan.
     *
     * This test used to assert that an upgrade applied on a 200, which is
     * precisely the hole: `changePlan` wrote the new plan with no charge, and
     * `subscribeToPlan` wrote an ACTIVE subscription plus a PAID invoice
     * straight after minting the authorization URL. Both are now gated on a
     * confirmed payment, so the assertions below encode "costs more => pay
     * first" rather than the old "ask and receive".
     */
    expect(subRes.body.data.requiresPayment).toBe(true);
    expect(subRes.body.data.authorizationUrl).toBeTruthy();

    // Monthly -> annual multiplies what is owed, so it needs payment.
    const intervalRes = await request
      .post('/api/subscriptions/change-interval')
      .set('Cookie', [merchantACookie])
      .send({ interval: 'ANNUAL' });

    expect(intervalRes.status).toBe(402);
    expect(intervalRes.body.code).toBe('SUBSCRIPTION_PAYMENT_REQUIRED');
    expect(intervalRes.body.data.interval).toBe('ANNUAL');

    // Growth costs more than Starter, so this is refused with the plan code
    // the caller should take to checkout.
    const upgradeRes = await request
      .post('/api/subscriptions/change-plan')
      .set('Cookie', [merchantACookie])
      .send({ planCode: 'growth' });

    expect(upgradeRes.status).toBe(402);
    expect(upgradeRes.body.data.planCode).toBe('growth');

    const afterRefusal = await prisma.subscription.findUnique({
      where: { merchantId: merchantAId },
      include: { plan: true },
    });
    expect(afterRefusal!.plan.code).not.toBe('growth');

    // A confirmed payment is what actually grants it. The sandbox provider
    // stands in for the gateway here; `settlePaidInvoice` is the only path
    // that moves a subscription onto a plan.
    const { saasBillingService } = await import('../src/services/billing/saasBilling.service.js');
    const growthCheckout = await saasBillingService.subscribeToPlan(
      merchantAId,
      merchantAEmail,
      'Phase 8 Merchant Alpha',
      'growth',
      'MONTHLY'
    );
    const growthPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'growth' } });
    const settled = await saasBillingService.settlePaidInvoice(growthCheckout.reference, {
      verifiedAmount: growthPlan!.monthlyPrice,
    });
    expect(settled.settled).toBe(true);

    const afterPayment = await prisma.subscription.findUnique({
      where: { merchantId: merchantAId },
      include: { plan: true },
    });
    expect(afterPayment!.plan.code).toBe('growth');
    expect(afterPayment!.status).toBe('ACTIVE');

    // A downgrade lowers what is owed, so it still applies immediately.
    const downgradeRes = await request
      .post('/api/subscriptions/change-plan')
      .set('Cookie', [merchantACookie])
      .send({ planCode: 'starter' });

    expect(downgradeRes.status).toBe(200);
    expect(downgradeRes.body.data.plan.code).toBe('starter');

    // Cancel subscription at period end
    const cancelRes = await request
      .post('/api/subscriptions/cancel')
      .set('Cookie', [merchantACookie]);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.cancelAtPeriodEnd).toBe(true);

    // Resume subscription
    const resumeRes = await request
      .post('/api/subscriptions/resume')
      .set('Cookie', [merchantACookie]);

    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.data.cancelAtPeriodEnd).toBe(false);
  });

  it('3. Backend Entitlements Enforcement: Enforces product and team member limits with 403 errors', async () => {
    // Switch Store A to starter plan (maxProducts: 50)
    await request
      .post('/api/subscriptions/change-plan')
      .set('Cookie', [merchantACookie])
      .send({ planCode: 'starter' });

    // Artificially update plan maxProducts to 1 for immediate limit testing
    const starterPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'starter' } });
    await prisma.subscriptionPlan.update({
      where: { code: 'starter' },
      data: { maxProducts: 1 },
    });

    // Create 1st product (should succeed)
    const p1Res = await request
      .post('/api/products')
      .set('Cookie', [merchantACookie])
      .send({
        title: 'Entitlement Test Product 1',
        price: 49.0,
      });
    expect(p1Res.status).toBe(201);

    // Attempt to create 2nd product (should be blocked by backend entitlement check with 403)
    const p2Res = await request
      .post('/api/products')
      .set('Cookie', [merchantACookie])
      .send({
        title: 'Entitlement Test Product 2 (Exceeds Limit)',
        price: 49.0,
      });

    expect(p2Res.status).toBe(403);
    expect(p2Res.body.error).toContain('limit reached');

    // Restore starter plan maxProducts
    await prisma.subscriptionPlan.update({
      where: { code: 'starter' },
      data: { maxProducts: 50 },
    });
  });

  it('4. Invoices API: Generates sequential invoice numbers and line item breakdowns', async () => {
    const listRes = await request.get('/api/subscriptions/invoices').set('Cookie', [merchantACookie]);
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

    testInvoiceId = listRes.body.data[0].id;

    // View detail
    const detailRes = await request
      .get(`/api/subscriptions/invoices/${testInvoiceId}`)
      .set('Cookie', [merchantACookie]);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.items).toBeDefined();
  });

  it('5. Platform Admin API & RBAC: Verifies platform role security, MRR metrics, merchant list & plan management', async () => {
    // Normal merchant attempt on platform admin endpoint should return 403
    const forbiddenRes = await request
      .get('/api/admin/metrics')
      .set('Cookie', [merchantACookie]);
    expect(forbiddenRes.status).toBe(403);

    // Platform Owner attempt should succeed
    const metricsRes = await request
      .get('/api/admin/metrics')
      .set('Cookie', [adminCookie]);
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.success).toBe(true);
    expect(metricsRes.body.data.mrr).toBeDefined();

    // List merchants in platform admin
    const merchantsRes = await request
      .get('/api/admin/merchants')
      .set('Cookie', [adminCookie]);
    expect(merchantsRes.status).toBe(200);
    expect(merchantsRes.body.data.length).toBeGreaterThanOrEqual(2);

    // Create new custom plan via platform admin
    const customCode = `custom-${Date.now()}`;
    const planRes = await request
      .post('/api/admin/plans')
      .set('Cookie', [adminCookie])
      .send({
        code: customCode,
        name: 'Custom VIP Plan',
        description: 'Bespoke plan for large scale brands',
        monthlyPrice: 299,
        annualPrice: 2990,
        maxProducts: 5000,
        maxTeamMembers: 25,
      });

    expect(planRes.status).toBe(201);
    expect(planRes.body.success).toBe(true);
    createdPlanId = planRes.body.data.id;

    // Update plan capabilities
    const updatePlanRes = await request
      .patch(`/api/admin/plans/${createdPlanId}`)
      .set('Cookie', [adminCookie])
      .send({ maxProducts: 10000 });

    expect(updatePlanRes.status).toBe(200);
    expect(updatePlanRes.body.data.maxProducts).toBe(10000);
  });

  it('6. Multi-Tenant Billing Isolation: Prevents Merchant A from accessing Merchant B subscription or invoices', async () => {
    // Store B tries to view Store A's specific invoice
    const invIsolationRes = await request
      .get(`/api/subscriptions/invoices/${testInvoiceId}`)
      .set('Cookie', [merchantBCookie]);
    expect(invIsolationRes.status).toBe(404);
  });
});
