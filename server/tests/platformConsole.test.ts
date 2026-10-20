import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

const request = supertest(app);

/**
 * Covers the two platform-console endpoints that had no test: invoices and
 * transactions. Transactions in particular used to return the whole
 * BillingTransaction row, including `rawResponse` — the payment gateway's full
 * payload — which nothing in the console needs.
 */
describe('Platform console: invoices and transactions', () => {
  const stamp = Date.now();
  const adminEmail = `platform_admin_${stamp}@nexus.io`;
  const merchantEmail = `merchant_pc_${stamp}@nexus.io`;
  const password = 'Password123!';

  let adminCookie: string;
  let merchantCookie: string;
  let merchantId: string;

  beforeAll(async () => {
    const merchant = await request.post('/api/auth/register').send({
      name: 'Console Merchant', email: merchantEmail, password, displayName: `Console Merchant ${stamp}`,
    });
    expect(merchant.status).toBe(201);
    merchantCookie = merchant.headers['set-cookie'][0];
    merchantId = merchant.body.data.merchant.id;

    const { hashPassword } = await import('../src/utils/password.js');
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Console Admin',
        passwordHash: await hashPassword(password),
        platformRole: 'PLATFORM_OWNER',
        plan: 'enterprise',
      },
    });

    const login = await request.post('/api/auth/login').send({ email: adminEmail, password });
    expect(login.status).toBe(200);
    adminCookie = login.headers['set-cookie'][0];

    // A transaction to read back, with a payload that must not be served.
    await prisma.billingTransaction.create({
      data: {
        merchantId,
        amount: 49,
        currency: 'USD',
        type: 'SUBSCRIPTION_CHARGE',
        status: 'SUCCESS',
        provider: 'PAYSTACK',
        providerReference: `ref_pc_${stamp}`,
        rawResponse: { secret_gateway_blob: `do-not-ship-${stamp}`, card: { last4: '4242' } },
      },
    });
  });

  describe('transactions', () => {
    it('serves a platform admin', async () => {
      const res = await request.get('/api/admin/transactions').set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      const mine = res.body.data.find((t: any) => t.providerReference === `ref_pc_${stamp}`);
      expect(mine).toBeTruthy();
      expect(mine.amount).toBe(49);
      expect(mine.merchant.name).toBe(`Console Merchant ${stamp}`);
    });

    it('never ships the gateway raw payload', async () => {
      const res = await request.get('/api/admin/transactions').set('Cookie', [adminCookie]);
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('rawResponse');
      expect(body).not.toContain(`do-not-ship-${stamp}`);
      expect(body).not.toContain('4242');
    });

    it('refuses a merchant', async () => {
      const res = await request.get('/api/admin/transactions').set('Cookie', [merchantCookie]);
      expect(res.status).toBe(403);
    });

    it('refuses an unauthenticated caller', async () => {
      const res = await request.get('/api/admin/transactions');
      expect(res.status).toBe(401);
    });
  });

  describe('invoices', () => {
    it('serves a platform admin', async () => {
      const res = await request.get('/api/admin/invoices').set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('refuses a merchant', async () => {
      const res = await request.get('/api/admin/invoices').set('Cookie', [merchantCookie]);
      expect(res.status).toBe(403);
    });

    it('refuses an unauthenticated caller', async () => {
      const res = await request.get('/api/admin/invoices');
      expect(res.status).toBe(401);
    });
  });
});
