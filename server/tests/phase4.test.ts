import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

const request = supertest(app);

describe('Nexus Commerce Phase 4 Integration Tests (Storefront + Cart + Checkout)', () => {
  const storeAEmail = `storeA_p4_${Date.now()}@nexus.io`;
  const storeBEmail = `storeB_p4_${Date.now()}@nexus.io`;
  const password = 'Password123!';

  let storeACookie: string;
  let storeBCookie: string;
  let storeASlug: string;
  let storeBSlug: string;

  let activeProductSlug: string;
  let activeVariantId: string;
  let activeProductId: string;
  let createdOrderNumber: string;

  beforeAll(async () => {
    // 1. Register Store A
    const resA = await request.post('/api/auth/register').send({
      name: 'Storefront Alpha Owner',
      email: storeAEmail,
      password,
      storeName: 'Storefront Alpha',
    });
    expect(resA.status).toBe(201);
    storeACookie = resA.headers['set-cookie'][0];
    storeASlug = resA.body.data.store.id;

    // 2. Register Store B
    const resB = await request.post('/api/auth/register').send({
      name: 'Storefront Beta Owner',
      email: storeBEmail,
      password,
      storeName: 'Storefront Beta',
    });
    expect(resB.status).toBe(201);
    storeBCookie = resB.headers['set-cookie'][0];
    storeBSlug = resB.body.data.store.id;

    /**
     * The platform levies 8% tax for the duration of this suite.
     *
     * Tax used to be a hardcoded `subtotal * 0.08` applied to every order, so
     * these tests asserted 24.00 on a 300.00 subtotal without anything ever
     * having been configured. It is now platform configuration that defaults
     * to off — Nexus is one marketplace, so the rate is its decision rather
     * than each merchant's — which is why the figures below have to be asked
     * for. Restored in afterAll so no other suite inherits it.
     */
    process.env.PLATFORM_TAX_PERCENT = '8';
    process.env.PLATFORM_TAX_LABEL = 'Sales tax';

    // 3. Create active product for Store A
    const skuA = `SKU-P4-A-${Date.now()}`;
    const prodARes = await request
      .post('/api/products')
      .set('Cookie', [storeACookie])
      .send({
        title: 'Alpha Premium Sneakers',
        slug: 'alpha-premium-sneakers',
        description: 'Handcrafted premium leather sneakers',
        price: 150.0,
        sku: skuA,
        status: 'ACTIVE',
        category: 'Footwear',
        variants: [
          { title: 'US 10 / White', sku: `${skuA}-10`, price: 150.0, inventoryQuantity: 20 },
        ],
        images: [{ url: 'https://example.com/sneakers.jpg', isPrimary: true }],
      });
    expect(prodARes.status).toBe(201);
    activeProductId = prodARes.body.data.id;
    activeProductSlug = prodARes.body.data.slug;
    activeVariantId = prodARes.body.data.variants[0].id;

    // 4. Create draft product for Store A (should not appear in public storefront)
    await request
      .post('/api/products')
      .set('Cookie', [storeACookie])
      .send({
        title: 'Alpha Secret Prototype',
        slug: 'alpha-secret-prototype',
        description: 'Unreleased prototype product',
        price: 500.0,
        sku: `SKU-P4-DRAFT-${Date.now()}`,
        status: 'DRAFT',
        category: 'Footwear',
      });
  });

  afterAll(() => {
    delete process.env.PLATFORM_TAX_PERCENT;
    delete process.env.PLATFORM_TAX_LABEL;
  });

  it('1. Public Storefront Info: resolves store metadata and settings by storeSlug', async () => {
    const res = await request.get(`/api/storefront/${storeASlug}`);
    expect(res.status).toBe(200);
    expect(res.body.store.name).toBe('Storefront Alpha');
    expect(res.body.store.id).toBe(storeASlug);
    expect(res.body.store.settings).toBeDefined();
  });

  it('2. Public Products Catalog: returns active products and filters out draft products', async () => {
    const res = await request.get(`/api/storefront/${storeASlug}/products`);
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].slug).toContain('alpha-premium-sneakers');
    expect(res.body.products[0].inStock).toBe(true);
    expect(res.body.products[0].variants).toHaveLength(1);
  });

  it('3. Public Product Detail: resolves active product by productSlug', async () => {
    const res = await request.get(`/api/storefront/${storeASlug}/products/${activeProductSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.product.title).toBe('Alpha Premium Sneakers');
    expect(res.body.product.price).toBe(150.0);
  });

  it('4. Cart Server Validation: validates live prices and stock levels', async () => {
    const res = await request
      .post(`/api/storefront/${storeASlug}/cart/validate`)
      .send({
        items: [{ variantId: activeVariantId, quantity: 2 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.isValid).toBe(true);
    expect(res.body.subtotal).toBe(300.0);
    // The 8% Store A configured in beforeAll, not a platform-wide constant.
    expect(res.body.taxEstimate).toBe(24.0);
    expect(res.body.taxRate).toBe(8);
    expect(res.body.taxLabel).toBe('Sales tax');
    // No shipping zone configured, and defaultShippingFee is 0.
    expect(res.body.shippingEstimate).toBe(0);
    expect(res.body.totalEstimate).toBe(324.0);
  });

  it('4b. Cart Quote: no tax is charged when the platform levies none', async () => {
    /**
     * The case the hardcoded 8% made impossible to express: a platform that
     * charges no tax at all. Previously every order carried a US-shaped sales
     * tax nobody had configured and nobody remits.
     */
    const taxDuringSuite = process.env.PLATFORM_TAX_PERCENT;
    delete process.env.PLATFORM_TAX_PERCENT;
    const skuB = `SKU-P4-B-TAX-${Date.now()}`;
    const prodBRes = await request
      .post('/api/products')
      .set('Cookie', [storeBCookie])
      .send({
        title: 'Beta Untaxed Item',
        price: 300.0,
        sku: skuB,
        status: 'ACTIVE',
        inventory: 5,
      });
    expect(prodBRes.status).toBe(201);

    const res = await request
      .post(`/api/storefront/${storeBSlug}/cart/validate`)
      .send({ items: [{ variantId: prodBRes.body.data.id, quantity: 1 }] });

    expect(res.status).toBe(200);
    expect(res.body.subtotal).toBe(300.0);
    expect(res.body.taxEstimate).toBe(0);
    expect(res.body.taxRate).toBe(0);
    expect(res.body.totalEstimate).toBe(300.0);

    process.env.PLATFORM_TAX_PERCENT = taxDuringSuite;
  });

  it('5. Checkout Engine: executes atomic checkout, customer creation, stock reservation, and order creation', async () => {
    const checkoutPayload = {
      items: [{ variantId: activeVariantId, quantity: 2 }],
      customer: {
        email: 'buyer@example.com',
        name: 'Jane Customer',
        phone: '+1 555-0199',
      },
      shippingAddress: {
        firstName: 'Jane',
        lastName: 'Customer',
        address1: '123 Commerce Way',
        city: 'Seattle',
        state: 'WA',
        zip: '98101',
        country: 'US',
      },
    };

    const res = await request
      .post(`/api/storefront/${storeASlug}/checkout`)
      .send(checkoutPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.order.orderNumber).toMatch(/^#NX-/);
    expect(res.body.order.status).toBe('PENDING');
    expect(res.body.order.paymentStatus).toBe('PENDING');
    expect(res.body.order.subtotal).toBe(300.0);
    expect(res.body.order.tax).toBe(24.0);
    expect(res.body.order.shipping).toBe(0);
    expect(res.body.order.total).toBe(324.0);
    expect(res.body.order.items).toHaveLength(1);

    createdOrderNumber = res.body.order.orderNumber;

    // Verify variant stock was decremented from 20 to 18
    const updatedVariant = await prisma.productVariant.findUnique({
      where: { id: activeVariantId },
    });
    expect(updatedVariant?.inventoryQuantity).toBe(18);

    // Verify Customer record was created
    const customer = await prisma.customer.findFirst({
      where: { email: 'buyer@example.com' },
    });
    expect(customer).toBeDefined();
    expect(customer?.totalOrders).toBe(1);
    expect(customer?.totalSpent).toBe(324.0);
  });

  it('6. Public Order Confirmation: retrieves placed order by orderNumber', async () => {
    const cleanNumber = createdOrderNumber.replace('#', '');
    const res = await request.get(`/api/storefront/${storeASlug}/orders/${cleanNumber}`);
    expect(res.status).toBe(200);
    expect(res.body.order.orderNumber).toBe(createdOrderNumber);
    expect(res.body.order.customerEmail).toBe('buyer@example.com');
    expect(res.body.order.total).toBe(324.0);
  });

  it('7. Stock Validation Rejection: rejects checkout if requested quantity exceeds available stock', async () => {
    const res = await request
      .post(`/api/storefront/${storeASlug}/checkout`)
      .send({
        items: [{ variantId: activeVariantId, quantity: 999 }],
        customer: { email: 'buyer2@example.com', name: 'Bob Smith' },
        shippingAddress: {
          firstName: 'Bob',
          lastName: 'Smith',
          address1: '456 Market St',
          city: 'Portland',
          state: 'OR',
          zip: '97201',
          country: 'US',
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Insufficient stock');
  });

  it('8. Multi-Tenant Security Isolation: Store B storefront cannot checkout Store A items', async () => {
    const res = await request
      .post(`/api/storefront/${storeBSlug}/checkout`)
      .send({
        items: [{ variantId: activeVariantId, quantity: 1 }],
        customer: { email: 'hacker@example.com', name: 'Hacker' },
        shippingAddress: {
          firstName: 'Hack',
          lastName: 'Er',
          address1: '789 Malicious Way',
          city: 'Nowhere',
          state: 'XX',
          zip: '00000',
          country: 'US',
        },
      });

    expect(res.status).toBe(400);
  });
});
