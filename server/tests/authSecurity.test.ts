import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { hashPassword } from '../src/utils/password.js';
import { PlatformRole, Role, StoreStatus } from '@prisma/client';

const request = supertest(app);

/**
 * Regression tests for the authentication holes found in the 2026-09-28 audit.
 *
 * These exist because the original 72-test suite covered every happy path and
 * never asserted that a *failed* sign-in actually fails. That blind spot let an
 * unauthenticated caller obtain a PLATFORM_OWNER session by posting an email
 * address. Every assertion below describes an attack that previously worked.
 */
describe('Auth security regressions', () => {
  const stamp = Date.now();
  const adminEmail = `sec_admin_${stamp}@example.com`;
  const sellerEmail = `sec_seller_${stamp}@example.com`;
  const customerEmail = `sec_customer_${stamp}@example.com`;
  const password = 'Password123!';

  let sellerCookie: string;
  let customerCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, sellerEmail, customerEmail] } },
    });

    // Platform owner — the account the original exploit targeted.
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Security Test Admin',
        passwordHash: await hashPassword(password),
        plan: 'enterprise',
        platformRole: PlatformRole.PLATFORM_OWNER,
      },
    });

    // Seller with a store.
    const sellerRes = await request.post('/api/auth/register').send({
      name: 'Security Test Seller',
      email: sellerEmail,
      password,
      storeName: `Sec Store ${stamp}`,
      userType: 'SELLER',
    });
    sellerCookie = (sellerRes.headers['set-cookie'] as unknown as string[])[0];

    // Customer with no store.
    const customerRes = await request.post('/api/auth/register').send({
      name: 'Security Test Customer',
      email: customerEmail,
      password,
      userType: 'CUSTOMER',
    });
    customerCookie = (customerRes.headers['set-cookie'] as unknown as string[])[0];

    const adminLogin = await request.post('/api/auth/login').send({ email: adminEmail, password });
    adminCookie = (adminLogin.headers['set-cookie'] as unknown as string[])[0];
    expect(admin.platformRole).toBe(PlatformRole.PLATFORM_OWNER);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, sellerEmail, customerEmail] } },
    });
  });

  describe('OAuth cannot be driven by a client-supplied identity', () => {
    it('refuses a bare email address — the original platform-takeover exploit', async () => {
      const res = await request
        .post('/api/auth/oauth')
        .send({ provider: 'google', email: adminEmail, name: 'Attacker' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('refuses a forged access token', async () => {
      const res = await request
        .post('/api/auth/oauth')
        .send({ provider: 'google', accessToken: 'ya29.not-a-real-token' });

      expect(res.status).toBe(401);
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('refuses a forged id token', async () => {
      const res = await request
        .post('/api/auth/oauth')
        .send({ provider: 'google', idToken: 'eyJhbGciOiJSUzI1NiJ9.forged.signature' });

      expect(res.status).toBe(401);
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('refuses an unknown provider', async () => {
      const res = await request
        .post('/api/auth/oauth')
        .send({ provider: 'myspace', accessToken: 'whatever' });

      expect(res.status).toBe(400);
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('never issues a session without a provider token', async () => {
      const res = await request.post('/api/auth/oauth').send({ provider: 'google' });

      expect(res.status).toBe(400);
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('Password authentication fails closed', () => {
    it('rejects a wrong password without issuing a cookie', async () => {
      const res = await request
        .post('/api/auth/login')
        .send({ email: adminEmail, password: 'WrongPassword123!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('rejects an unknown email without issuing a cookie', async () => {
      const res = await request
        .post('/api/auth/login')
        .send({ email: `nobody_${stamp}@example.com`, password });

      expect(res.status).toBe(401);
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('rejects a fabricated session cookie', async () => {
      const res = await request
        .get('/api/auth/me')
        .set('Cookie', 'nexus_session=deadbeefdeadbeefdeadbeefdeadbeef');

      expect(res.status).toBe(401);
    });
  });

  describe('Portal separation is enforced server-side', () => {
    it('reports the correct accountType for each portal', async () => {
      const seller = await request.get('/api/auth/me').set('Cookie', sellerCookie);
      const customer = await request.get('/api/auth/me').set('Cookie', customerCookie);
      const admin = await request.get('/api/auth/me').set('Cookie', adminCookie);

      expect(seller.body.data.accountType).toBe('SELLER');
      expect(customer.body.data.accountType).toBe('CUSTOMER');
      expect(admin.body.data.accountType).toBe('ADMIN');
    });

    it('blocks a seller from the customer portal', async () => {
      const res = await request.get('/api/account/orders').set('Cookie', sellerCookie);
      expect(res.status).toBe(403);
    });

    it('blocks a platform admin from the customer portal', async () => {
      const res = await request.get('/api/account/orders').set('Cookie', adminCookie);
      expect(res.status).toBe(403);
    });

    it('allows a customer into the customer portal', async () => {
      const res = await request.get('/api/account/orders').set('Cookie', customerCookie);
      expect(res.status).toBe(200);
    });

    it('blocks a customer from seller endpoints', async () => {
      const res = await request.get('/api/products').set('Cookie', customerCookie);
      expect(res.status).toBe(403);
    });

    it('blocks a seller from platform admin endpoints', async () => {
      const res = await request.get('/api/admin/metrics').set('Cookie', sellerCookie);
      expect(res.status).toBe(403);
    });
  });

  describe('Public order tracking does not leak other customers', () => {
    let orderNumber: string;
    let storeId: string;
    const buyerEmail = `sec_buyer_${stamp}@example.com`;

    beforeAll(async () => {
      const store = await prisma.store.findFirst({ where: { name: `Sec Store ${stamp}` } });
      storeId = store!.id;

      const order = await prisma.order.create({
        data: {
          storeId,
          orderNumber: `SEC-${stamp}`,
          customerName: 'Private Buyer',
          customerEmail: buyerEmail,
          total: 100,
          subtotal: 100,
        },
      });
      orderNumber = order.orderNumber;
    });

    it('refuses a partial order number — the enumeration attack', async () => {
      const res = await request.get('/api/storefront/track/search?query=SEC');
      expect(res.status).toBe(400);
      expect(res.body.data).toBeUndefined();
    });

    it('refuses an order number without the matching email', async () => {
      const res = await request.get(`/api/storefront/track/search?orderNumber=${orderNumber}`);
      expect(res.status).toBe(400);
    });

    it('refuses a correct order number with the wrong email', async () => {
      const res = await request.get(
        `/api/storefront/track/search?orderNumber=${orderNumber}&email=attacker@evil.com`
      );
      expect(res.status).toBe(404);
      expect(res.body.data).toBeUndefined();
    });

    it('returns the order only when both order number and email match', async () => {
      const res = await request.get(
        `/api/storefront/track/search?orderNumber=${orderNumber}&email=${buyerEmail}`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBe(orderNumber);
      expect(res.body.data.customerName).toBe('Private Buyer');
    });
  });
});
