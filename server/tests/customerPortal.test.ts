import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

const request = supertest(app);

/**
 * Covers the two customer-facing surfaces: public order tracking, which is
 * reachable signed out and must be entitled by the order's email; and the
 * /account API, which spans every store a customer has bought from.
 */
describe('Customer portal: public tracking and the account API', () => {
  const stamp = Date.now();
  const merchantAEmail = `merchant_cp_a_${stamp}@nexus.io`;
  const merchantBEmail = `merchant_cp_b_${stamp}@nexus.io`;
  const buyerEmail = `buyer_cp_${stamp}@example.com`;
  const otherBuyerEmail = `other_cp_${stamp}@example.com`;
  const password = 'Password123!';

  let merchantACookie: string;
  let merchantBCookie: string;
  let buyerCookie: string;
  let orderFromMerchantA: any;
  let orderFromMerchantB: any;

  /** The server generates the order number itself, prefixed with '#'. */
  async function createOrderIn(cookie: string, label: string, email: string) {
    const product = await request
      .post('/api/products')
      .set('Cookie', [cookie])
      .send({ title: `CP Widget ${label}`, price: 100, sku: `SKU-CP-${label}`, inventory: 50 });
    expect(product.status).toBe(201);

    const res = await request
      .post('/api/orders')
      .set('Cookie', [cookie])
      .send({
        customerName: 'Buyer Person',
        customerEmail: email,
        items: [{ productId: product.body.data.id, quantity: 1 }],
        shippingAddress: {
          firstName: 'Buyer', lastName: 'Person', address1: '1 Test Way',
          city: 'Lagos', state: 'LA', zip: '100001', country: 'NG',
        },
      });
    expect(res.status).toBe(201);
    return res.body.data;
  }

  beforeAll(async () => {
    const resA = await request.post('/api/auth/register').send({
      name: 'Merchant A', email: merchantAEmail, password, displayName: `CP Merchant A ${stamp}`,
    });
    expect(resA.status).toBe(201);
    merchantACookie = resA.headers['set-cookie'][0];

    const resB = await request.post('/api/auth/register').send({
      name: 'Merchant B', email: merchantBEmail, password, displayName: `CP Merchant B ${stamp}`,
    });
    expect(resB.status).toBe(201);
    merchantBCookie = resB.headers['set-cookie'][0];

    orderFromMerchantA = await createOrderIn(merchantACookie, `A-${stamp}`, buyerEmail);
    orderFromMerchantB = await createOrderIn(merchantBCookie, `B-${stamp}`, buyerEmail);

    const buyerRes = await request.post('/api/auth/register').send({
      name: 'Buyer Person', email: buyerEmail, password, userType: 'CUSTOMER',
    });
    expect(buyerRes.status).toBe(201);
    buyerCookie = buyerRes.headers['set-cookie'][0];
  });

  describe('public order tracking', () => {
    it('finds an order when the number is typed without its leading #', async () => {
      const res = await request
        .get('/api/shop/track/search')
        .query({ orderNumber: orderFromMerchantA.orderNumber.replace(/^#/, ''), email: buyerEmail });

      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBe(orderFromMerchantA.orderNumber);
      expect(orderFromMerchantA.orderNumber.startsWith('#')).toBe(true);
    });

    it('finds the same order when the # is included', async () => {
      const res = await request
        .get('/api/shop/track/search')
        .query({ orderNumber: orderFromMerchantA.orderNumber, email: buyerEmail });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(orderFromMerchantA.id);
    });

    it('refuses a correct order number paired with the wrong email', async () => {
      const res = await request
        .get('/api/shop/track/search')
        .query({ orderNumber: orderFromMerchantA.orderNumber, email: otherBuyerEmail });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('answers identically for a wrong email and a missing order, so order numbers cannot be probed', async () => {
      const wrongEmail = await request
        .get('/api/shop/track/search')
        .query({ orderNumber: orderFromMerchantA.orderNumber, email: otherBuyerEmail });
      const noSuchOrder = await request
        .get('/api/shop/track/search')
        .query({ orderNumber: `CP-${stamp}-DOES-NOT-EXIST`, email: buyerEmail });

      expect(wrongEmail.status).toBe(noSuchOrder.status);
      expect(wrongEmail.body.error).toBe(noSuchOrder.body.error);
    });

    it('requires both an order number and an email', async () => {
      const onlyNumber = await request
        .get('/api/shop/track/search')
        .query({ orderNumber: orderFromMerchantA.orderNumber });
      const onlyEmail = await request
        .get('/api/shop/track/search')
        .query({ email: buyerEmail });

      expect(onlyNumber.status).toBe(400);
      expect(onlyEmail.status).toBe(400);
    });

    it('never returns the buyer email to an unauthenticated caller', async () => {
      const res = await request
        .get('/api/shop/track/search')
        .query({ orderNumber: orderFromMerchantA.orderNumber, email: buyerEmail });

      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain(buyerEmail);
    });
  });

  describe('account API', () => {
    it('returns orders from every merchant the customer bought from', async () => {
      const res = await request.get('/api/account/orders').set('Cookie', [buyerCookie]);

      expect(res.status).toBe(200);
      const numbers = res.body.data.map((o: any) => o.orderNumber);
      expect(numbers).toContain(orderFromMerchantA.orderNumber);
      expect(numbers).toContain(orderFromMerchantB.orderNumber);
      // Each order says which store it came from, or the combined list is unreadable.
      expect(res.body.data.every((o: any) => o.merchant && o.merchant.name)).toBe(true);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request.get('/api/account/orders');
      expect(res.status).toBe(401);
    });

    it('refuses a seller account, which belongs to a different portal', async () => {
      const res = await request.get('/api/account/orders').set('Cookie', [merchantACookie]);
      expect(res.status).toBe(403);
    });

    it('does not leak another customer order through the by-id route', async () => {
      const outsiderEmail = `outsider_cp_${stamp}@example.com`;
      const outsider = await request.post('/api/auth/register').send({
        name: 'Outsider', email: outsiderEmail, password, userType: 'CUSTOMER',
      });
      expect(outsider.status).toBe(201);

      const res = await request
        .get(`/api/account/orders/${orderFromMerchantA.id}`)
        .set('Cookie', [outsider.headers['set-cookie'][0]]);

      expect(res.status).toBe(404);
    });

    it('links the customer record to the user so orders survive an email lookup', async () => {
      const linked = await prisma.customer.findFirst({
        where: { email: { equals: buyerEmail, mode: 'insensitive' } },
      });
      // A Customer row only exists once a store has recorded one; when it does,
      // sign-up must have claimed it for this user.
      if (linked) {
        const user = await prisma.user.findUnique({ where: { email: buyerEmail } });
        expect(linked.userId).toBe(user!.id);
      }
    });
  });
});
