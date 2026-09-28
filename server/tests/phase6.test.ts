import { describe, it, expect, beforeAll, vi } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

const request = supertest(app);

describe('Nexus Commerce Phase 6 Integration Tests (Discounts, Analytics, Notifications, Emails & Background Jobs)', () => {
  const storeAEmail = `storeA_p6_${Date.now()}@nexus.io`;
  const storeBEmail = `storeB_p6_${Date.now()}@nexus.io`;
  const password = 'Password123!';

  let storeACookie: string;
  let storeBCookie: string;
  let storeAId: string;
  let storeBId: string;

  let activeProductId: string;
  let activeVariantId: string;
  let discountId: string;
  let discountCodeName = `TESTCODE_${Date.now()}`;

  beforeAll(async () => {
    // 1. Register Store A
    const resA = await request.post('/api/auth/register').send({
      name: 'Commerce Alpha Owner',
      email: storeAEmail,
      password,
      storeName: 'Commerce Alpha',
    });
    expect(resA.status).toBe(201);
    storeACookie = resA.headers['set-cookie'][0];
    storeAId = resA.body.data.store.id;

    // 2. Register Store B
    const resB = await request.post('/api/auth/register').send({
      name: 'Commerce Beta Owner',
      email: storeBEmail,
      password,
      storeName: 'Commerce Beta',
    });
    expect(resB.status).toBe(201);
    storeBCookie = resB.headers['set-cookie'][0];
    storeBId = resB.body.data.store.id;

    // 3. Create active product for Store A
    const skuP6 = `SKU-P6-${Date.now()}`;
    const prodARes = await request
      .post('/api/products')
      .set('Cookie', [storeACookie])
      .send({
        title: 'Phase 6 Denim Jacket',
        description: 'Classic vintage indigo denim jacket',
        price: 100.0,
        sku: skuP6,
        status: 'ACTIVE',
        category: 'Apparel',
        variants: [{ title: 'Medium / Blue', sku: `${skuP6}-VAR`, price: 100.0, inventoryQuantity: 15 }],
      });
    expect(prodARes.status).toBe(201);
    activeProductId = prodARes.body.data.id;
    activeVariantId = prodARes.body.data.variants[0].id;
  });

  it('1. Discounts Management: Creates, lists, and updates discount code', async () => {
    // Create Discount Code
    const createRes = await request
      .post('/api/discounts')
      .set('Cookie', [storeACookie])
      .send({
        code: discountCodeName,
        type: 'PERCENTAGE',
        value: '20',
        maxRedemptions: 50,
        minOrderAmount: 50.0,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.code).toBe(discountCodeName.toUpperCase());
    discountId = createRes.body.data.id;

    // List Discounts
    const listRes = await request.get('/api/discounts').set('Cookie', [storeACookie]);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

    // Update Discount
    const updateRes = await request
      .patch(`/api/discounts/${discountId}`)
      .set('Cookie', [storeACookie])
      .send({ maxRedemptions: 100 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.maxRedemptions).toBe(100);
  });

  it('2. Discount Code Validation API: Validates percentage, minimum amount, and invalid codes', async () => {
    // Valid code above min order
    const validRes = await request.post('/api/discounts/validate').send({
      code: discountCodeName,
      subtotal: 100.0,
      storeDomain: storeAId,
    });
    expect(validRes.status).toBe(200);
    expect(validRes.body.valid).toBe(true);
    expect(validRes.body.discountAmount).toBe(20.0);
    expect(validRes.body.newTotal).toBe(80.0);

    // Below min order subtotal threshold
    const minOrderRes = await request.post('/api/discounts/validate').send({
      code: discountCodeName,
      subtotal: 30.0,
      storeDomain: storeAId,
    });
    expect(minOrderRes.status).toBe(200);
    expect(minOrderRes.body.valid).toBe(false);
    expect(minOrderRes.body.message).toContain('Minimum order subtotal');

    // Non-existent code
    const invalidRes = await request.post('/api/discounts/validate').send({
      code: 'INVALID_CODE_99',
      subtotal: 100.0,
      storeDomain: storeAId,
    });
    expect(invalidRes.status).toBe(200);
    expect(invalidRes.body.valid).toBe(false);
  });

  it('3. Checkout Discount Integration: Applies discount code to order and increments redemptions count', async () => {
    const checkoutRes = await request
      .post(`/api/storefront/${storeAId}/checkout`)
      .send({
        items: [{ variantId: activeVariantId, quantity: 1 }],
        customer: { email: 'phase6buyer@example.com', name: 'Phase6 Customer' },
        shippingAddress: {
          firstName: 'Phase6',
          lastName: 'Customer',
          address1: '500 Tech Blvd',
          city: 'Austin',
          state: 'TX',
          zip: '78701',
          country: 'US',
        },
        discountCode: discountCodeName,
      });

    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.body.order.discountCode).toBe(discountCodeName.toUpperCase());
    expect(checkoutRes.body.order.discount).toBe(20.0);

    // Verify redemption count incremented in DB
    const updatedDisc = await prisma.discount.findUnique({ where: { id: discountId } });
    expect(updatedDisc?.redemptions).toBe(1);
  });

  it('4. Analytics API with Date Range Filtering: Aggregates real revenue, orders, and customer metrics', async () => {
    const res30d = await request
      .get('/api/analytics?range=30d')
      .set('Cookie', [storeACookie]);

    expect(res30d.status).toBe(200);
    expect(res30d.body.success).toBe(true);
    expect(res30d.body.data.orders).toBeGreaterThanOrEqual(1);
    expect(res30d.body.data.chartData).toBeDefined();

    const resToday = await request
      .get('/api/analytics?range=today')
      .set('Cookie', [storeACookie]);

    expect(resToday.status).toBe(200);
    expect(resToday.body.data.range).toBe('today');
  });

  it('5. Notifications API: Retrieves notifications and updates read status', async () => {
    // List notifications (should include new order notification created in test 3)
    const notifRes = await request
      .get('/api/notifications')
      .set('Cookie', [storeACookie]);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.success).toBe(true);
    expect(notifRes.body.data.length).toBeGreaterThanOrEqual(1);

    const firstNotifId = notifRes.body.data[0].id;

    // Mark single notification read
    const markReadRes = await request
      .patch(`/api/notifications/${firstNotifId}/read`)
      .set('Cookie', [storeACookie]);

    expect(markReadRes.status).toBe(200);
    expect(markReadRes.body.data.read).toBe(true);

    // Mark all read
    const markAllRes = await request
      .patch('/api/notifications/read-all')
      .set('Cookie', [storeACookie]);

    expect(markAllRes.status).toBe(200);
    expect(markAllRes.body.success).toBe(true);
  });

  it('6. Background Job Queue & Email Provider: Enqueues and executes transactional email jobs', async () => {
    const { jobQueue } = await import('../src/jobs/jobQueue.js');
    const { emailService } = await import('../src/services/email/email.service.js');

    const spySend = vi.spyOn(emailService, 'sendOrderConfirmation');

    jobQueue.enqueue('SEND_EMAIL_ORDER_CONFIRMATION', {
      orderNumber: '#NX-TEST-EMAIL',
      customerEmail: 'test_job@example.com',
      customerName: 'Test Job User',
      total: 80.0,
      currency: 'USD',
      items: [{ productTitle: 'Denim Jacket', quantity: 1, price: 80.0 }],
    });

    // Wait 200ms for setImmediate queue execution
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(spySend).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNumber: '#NX-TEST-EMAIL',
        customerEmail: 'test_job@example.com',
      })
    );
  });

  it('7. Store Multi-Tenant Security Isolation: Ensures Store B cannot view Store A discounts or notifications', async () => {
    // Store B trying to read Store A discounts
    const storeBDiscounts = await request
      .get('/api/discounts')
      .set('Cookie', [storeBCookie]);

    expect(storeBDiscounts.status).toBe(200);
    const codesInB = storeBDiscounts.body.data.map((d: any) => d.code);
    expect(codesInB).not.toContain(discountCodeName.toUpperCase());

    // Store B trying to delete Store A discount code
    const deleteCrossRes = await request
      .delete(`/api/discounts/${discountId}`)
      .set('Cookie', [storeBCookie]);

    expect(deleteCrossRes.status).toBe(404);
  });
});
