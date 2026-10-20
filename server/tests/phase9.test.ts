import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

const request = supertest(app);

describe('Nexus Commerce Phase 9 Integration & Security Audit Tests', () => {
  const merchantAEmail = `merchant_p9_a_${Date.now()}@nexus.io`;
  const merchantBEmail = `merchant_p9_b_${Date.now()}@nexus.io`;
  const password = 'Password123!';

  let merchantACookie: string;
  let merchantBCookie: string;
  let merchantAProduct: any;
  let merchantACustomer: any;
  let merchantAOrder: any;

  beforeAll(async () => {
    // Register Store A
    const resA = await request.post('/api/auth/register').send({
      name: 'Merchant A Owner',
      email: merchantAEmail,
      password,
      displayName: 'Phase 9 Merchant A',
    });
    expect(resA.status).toBe(201);
    merchantACookie = resA.headers['set-cookie'][0];

    // Register Store B
    const resB = await request.post('/api/auth/register').send({
      name: 'Merchant B Owner',
      email: merchantBEmail,
      password,
      displayName: 'Phase 9 Merchant B',
    });
    expect(resB.status).toBe(201);
    merchantBCookie = resB.headers['set-cookie'][0];

    // Create resource in Store A
    const prodRes = await request
      .post('/api/products')
      .set('Cookie', [merchantACookie])
      .send({
        title: 'Merchant A Secret Widget',
        price: 99.99,
        sku: `SKU-P9-A-${Date.now()}`,
        inventory: 100,
      });
    expect(prodRes.status).toBe(201);
    merchantAProduct = prodRes.body.data;

    const custRes = await request
      .post('/api/customers')
      .set('Cookie', [merchantACookie])
      .send({
        name: 'Merchant A Confidential Customer',
        email: `cust_a_${Date.now()}@example.com`,
      });
    expect(custRes.status).toBe(201);
    merchantACustomer = custRes.body.data;

    const orderRes = await request
      .post('/api/orders')
      .set('Cookie', [merchantACookie])
      .send({
        customerName: merchantACustomer.name,
        customerEmail: merchantACustomer.email,
        items: [{ productId: merchantAProduct.id, quantity: 1 }],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US',
        },
      });
    expect(orderRes.status).toBe(201);
    merchantAOrder = orderRes.body.data;
  });

  it('1. Health & Readiness Probes: Verifies system availability and DB connectivity', async () => {
    const healthRes = await request.get('/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('ok');

    const readyRes = await request.get('/ready');
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.status).toBe('ready');
    expect(readyRes.body.database).toBe('connected');
  });

  it('2. Security Headers: Verifies Helmet security headers on API responses', async () => {
    const res = await request.get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('3. Multi-Tenant Cross-Isolation (Products): Prevents Merchant B from accessing/modifying Merchant A product', async () => {
    // Store B tries to view Store A product detail
    const getRes = await request
      .get(`/api/products/${merchantAProduct.id}`)
      .set('Cookie', [merchantBCookie]);
    expect([403, 404]).toContain(getRes.status);

    // Store B tries to update Store A product
    const updateRes = await request
      .put(`/api/products/${merchantAProduct.id}`)
      .set('Cookie', [merchantBCookie])
      .send({ title: 'Hacked Product Title' });
    expect([403, 404]).toContain(updateRes.status);

    // Store B tries to delete Store A product
    const deleteRes = await request
      .delete(`/api/products/${merchantAProduct.id}`)
      .set('Cookie', [merchantBCookie]);
    expect([403, 404]).toContain(deleteRes.status);
  });

  it('4. Multi-Tenant Cross-Isolation (Orders & Customers): Denies Merchant B access to Merchant A orders & customers', async () => {
    // Store B tries to access Store A order
    const orderRes = await request
      .get(`/api/orders/${merchantAOrder.id}`)
      .set('Cookie', [merchantBCookie]);
    expect([403, 404]).toContain(orderRes.status);

    // Store B tries to access Store A customer
    const custRes = await request
      .get(`/api/customers/${merchantACustomer.id}`)
      .set('Cookie', [merchantBCookie]);
    expect([403, 404]).toContain(custRes.status);
  });

  it('5. Platform RBAC Security: Prevents standard merchants from accessing platform admin routes', async () => {
    const adminRes = await request
      .get('/api/admin/metrics')
      .set('Cookie', [merchantACookie]);
    expect(adminRes.status).toBe(403);
    expect(adminRes.body.error).toContain('Forbidden');
  });

  it('6. Rate Limiting Enforcement: Returns 429 when auth endpoint threshold is exceeded', async () => {
    const testEmail = `ratelimit_${Date.now()}@test.io`;
    // Perform 32 consecutive login attempts to exceed limit of 30
    let lastStatus = 0;
    for (let i = 0; i < 32; i++) {
      const res = await request.post('/api/auth/login').send({
        email: testEmail,
        password: 'WrongPassword!',
      });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
