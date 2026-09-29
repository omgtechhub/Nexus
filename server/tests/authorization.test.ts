import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

const request = supertest(app);

describe('Nexus Commerce Phase 4 Authorization & Tenant Isolation Tests', () => {
  const timestamp = Date.now();
  const customerEmail = `customer_${timestamp}@example.com`;
  const otherCustomerEmail = `other_customer_${timestamp}@example.com`;
  const seller1Email = `seller1_${timestamp}@example.com`;
  const seller2Email = `seller2_${timestamp}@example.com`;
  const adminEmail = `admin_${timestamp}@example.com`;
  const password = 'Password123!';

  let customerCookie: string;
  let otherCustomerCookie: string;
  let seller1Cookie: string;
  let seller2Cookie: string;
  let adminCookie: string;

  let store1Id: string;
  let store2Id: string;
  let store1OrderId: string;
  let store2OrderId: string;

  beforeAll(async () => {
    // 1. Create Customer account A
    const resCustomer = await request.post('/api/auth/register').send({
      name: 'Customer A',
      email: customerEmail,
      password,
      userType: 'CUSTOMER',
    });
    customerCookie = (resCustomer.headers['set-cookie'] as string[])[0];

    // 2. Create Customer account B
    const resOtherCustomer = await request.post('/api/auth/register').send({
      name: 'Customer B',
      email: otherCustomerEmail,
      password,
      userType: 'CUSTOMER',
    });
    otherCustomerCookie = (resOtherCustomer.headers['set-cookie'] as string[])[0];

    // 3. Create Seller 1 with Store 1
    const resSeller1 = await request.post('/api/auth/register').send({
      name: 'Seller One',
      email: seller1Email,
      password,
      storeName: `Store One ${timestamp}`,
      userType: 'SELLER',
    });
    seller1Cookie = (resSeller1.headers['set-cookie'] as string[])[0];
    store1Id = resSeller1.body.data.store.id;

    // 4. Create Seller 2 with Store 2
    const resSeller2 = await request.post('/api/auth/register').send({
      name: 'Seller Two',
      email: seller2Email,
      password,
      storeName: `Store Two ${timestamp}`,
      userType: 'SELLER',
    });
    seller2Cookie = (resSeller2.headers['set-cookie'] as string[])[0];
    store2Id = resSeller2.body.data.store.id;

    // 5. Create Platform Admin user
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Platform Admin',
        passwordHash: '$2a$10$wZk0x23aQpZ6gH1K.4S4y.7v8B1f9w0x23aQpZ6gH1K.4S4y.7v8B', // dummy hash
        platformRole: 'PLATFORM_ADMIN',
        isVerified: true,
      },
    });

    const resAdminLogin = await request.post('/api/auth/login').send({
      email: adminEmail,
      password: 'Password123!',
    });

    if (resAdminLogin.status === 200 && resAdminLogin.headers['set-cookie']) {
      adminCookie = (resAdminLogin.headers['set-cookie'] as string[])[0];
    } else {
      // Create session manually for admin if password hash bypass needed
      const session = await prisma.session.create({
        data: {
          sessionToken: `token_admin_${timestamp}`,
          userId: adminUser.id,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      adminCookie = `nexus_session=${session.sessionToken}`;
    }

    // Seed Order in Store 1 for Customer A
    const order1 = await prisma.order.create({
      data: {
        storeId: store1Id,
        orderNumber: `NEX-TEST-${timestamp}-1`,
        customerName: 'Customer A',
        customerEmail: customerEmail,
        total: 150.0,
        subtotal: 150.0,
      },
    });
    store1OrderId = order1.id;

    // Seed Order in Store 2 for Customer B
    const order2 = await prisma.order.create({
      data: {
        storeId: store2Id,
        orderNumber: `NEX-TEST-${timestamp}-2`,
        customerName: 'Customer B',
        customerEmail: otherCustomerEmail,
        total: 299.0,
        subtotal: 299.0,
      },
    });
    store2OrderId = order2.id;
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: { in: [store1OrderId, store2OrderId] } } });
    await prisma.user.deleteMany({
      where: { email: { in: [customerEmail, otherCustomerEmail, seller1Email, seller2Email, adminEmail] } },
    });
  });

  it('1. Unauthenticated API access: returns 401 Unauthorized for protected endpoints', async () => {
    const resProducts = await request.get('/api/products');
    expect(resProducts.status).toBe(401);
    expect(resProducts.body.success).toBe(false);

    const resAccountProfile = await request.get('/api/account/profile');
    expect(resAccountProfile.status).toBe(401);

    const resAdminMetrics = await request.get('/api/admin/metrics');
    expect(resAdminMetrics.status).toBe(401);
  });

  it('2. Customer accessing own data: GET /api/account/profile & /api/account/orders succeeds', async () => {
    const resProfile = await request.get('/api/account/profile').set('Cookie', customerCookie);
    expect(resProfile.status).toBe(200);
    expect(resProfile.body.success).toBe(true);
    expect(resProfile.body.data.email).toBe(customerEmail);

    const resOrders = await request.get('/api/account/orders').set('Cookie', customerCookie);
    expect(resOrders.status).toBe(200);
    expect(resOrders.body.success).toBe(true);
    expect(resOrders.body.data.length).toBeGreaterThanOrEqual(1);
    expect(resOrders.body.data[0].id).toBe(store1OrderId);
  });

  it('3. Customer IDOR Defense: Customer A attempting to access Customer B order returns 404', async () => {
    const resOrder = await request
      .get(`/api/account/orders/${store2OrderId}`)
      .set('Cookie', customerCookie);

    expect(resOrder.status).toBe(404);
    expect(resOrder.body.success).toBe(false);
  });

  it('4. Customer accessing Seller APIs: returns 403 Forbidden', async () => {
    const resProducts = await request.get('/api/products').set('Cookie', customerCookie);
    expect(resProducts.status).toBe(403);
    expect(resProducts.body.success).toBe(false);
    // Copy may change; what matters is that a customer account is refused.
    expect(resProducts.body.error).toMatch(/customer account|merchant store membership required/i);

    const resOrders = await request.get('/api/orders').set('Cookie', customerCookie);
    expect(resOrders.status).toBe(403);

    const resAnalytics = await request.get('/api/analytics').set('Cookie', customerCookie);
    expect(resAnalytics.status).toBe(403);
  });

  it('5. Customer accessing Admin APIs: returns 403 Forbidden', async () => {
    const resAdmin = await request.get('/api/admin/metrics').set('Cookie', customerCookie);
    expect(resAdmin.status).toBe(403);
    expect(resAdmin.body.success).toBe(false);
  });

  it('6. Seller accessing own store resources: GET /api/orders & /api/products succeeds', async () => {
    const resOrders = await request.get('/api/orders').set('Cookie', seller1Cookie);
    expect(resOrders.status).toBe(200);
    expect(resOrders.body.success).toBe(true);

    const resOrderById = await request.get(`/api/orders/${store1OrderId}`).set('Cookie', seller1Cookie);
    expect(resOrderById.status).toBe(200);
    expect(resOrderById.body.data.id).toBe(store1OrderId);
  });

  it('7. Seller Tenant Isolation (IDOR Defense): Seller 1 accessing Store 2 order returns 404', async () => {
    const resOrderOtherStore = await request
      .get(`/api/orders/${store2OrderId}`)
      .set('Cookie', seller1Cookie);

    expect(resOrderOtherStore.status).toBe(404);
    expect(resOrderOtherStore.body.success).toBe(false);
  });

  it('8. Seller accessing Admin APIs: returns 403 Forbidden', async () => {
    const resAdmin = await request.get('/api/admin/metrics').set('Cookie', seller1Cookie);
    expect(resAdmin.status).toBe(403);
    expect(resAdmin.body.success).toBe(false);
  });

  it('9. Platform Admin accessing Admin APIs: GET /api/admin/metrics succeeds', async () => {
    const resMetrics = await request.get('/api/admin/metrics').set('Cookie', adminCookie);
    expect(resMetrics.status).toBe(200);
    expect(resMetrics.body.success).toBe(true);
  });
});
