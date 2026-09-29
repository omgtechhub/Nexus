import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { AccountType } from '@prisma/client';
import { hashToken } from '../src/services/auth/tokens.service.js';

const request = supertest(app);

/**
 * Phase 1: stored account types, unified marketplace customer identity,
 * password reset and email verification.
 */
describe('Identity and account recovery', () => {
  const stamp = Date.now();
  const sellerEmail = `id_seller_${stamp}@example.com`;
  const customerEmail = `id_customer_${stamp}@example.com`;
  const password = 'Password123!';
  const newPassword = 'BrandNew456!';

  let sellerCookie: string;
  let customerCookie: string;
  let customerId: string;
  let storeId: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [sellerEmail, customerEmail] } } });

    const sellerRes = await request.post('/api/auth/register').send({
      name: 'Identity Seller',
      email: sellerEmail,
      password,
      storeName: `Identity Store ${stamp}`,
      userType: 'SELLER',
    });
    sellerCookie = (sellerRes.headers['set-cookie'] as unknown as string[])[0];
    storeId = sellerRes.body.data.store.id;

    const customerRes = await request.post('/api/auth/register').send({
      name: 'Identity Customer',
      email: customerEmail,
      password,
      userType: 'CUSTOMER',
    });
    customerCookie = (customerRes.headers['set-cookie'] as unknown as string[])[0];
    customerId = customerRes.body.data.user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [sellerEmail, customerEmail] } } });
  });

  describe('Account type is stored, not inferred', () => {
    it('persists SELLER on the user row', async () => {
      const user = await prisma.user.findUnique({ where: { email: sellerEmail } });
      expect(user?.accountType).toBe(AccountType.SELLER);
    });

    it('persists CUSTOMER on the user row', async () => {
      const user = await prisma.user.findUnique({ where: { email: customerEmail } });
      expect(user?.accountType).toBe(AccountType.CUSTOMER);
    });

    it('a customer stays a customer even if a store is later attached', async () => {
      // The old code decided portal membership from store presence, so this
      // exact situation silently promoted customers to sellers.
      const user = await prisma.user.findUnique({ where: { email: customerEmail } });
      await prisma.store.create({
        data: {
          name: `Stray Store ${stamp}`,
          domain: `stray-${stamp}.nexuscommerce.io`,
          ownerId: user!.id,
        },
      });

      const me = await request.get('/api/auth/me').set('Cookie', customerCookie);
      expect(me.body.data.accountType).toBe('CUSTOMER');

      await prisma.store.deleteMany({ where: { name: `Stray Store ${stamp}` } });
    });

    it('new accounts start unverified', async () => {
      const user = await prisma.user.findUnique({ where: { email: customerEmail } });
      expect(user?.isVerified).toBe(false);
      expect(user?.emailVerifiedAt).toBeNull();
    });

    it('records lastLoginAt on sign-in', async () => {
      await request.post('/api/auth/login').send({ email: customerEmail, password });
      const user = await prisma.user.findUnique({ where: { email: customerEmail } });
      expect(user?.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe('Unified marketplace customer identity', () => {
    it('claims guest orders placed before sign-up, across stores', async () => {
      const guestEmail = `id_guest_${stamp}@example.com`;

      // Two different stores, each with its own CRM row for the same shopper.
      const secondStore = await prisma.store.create({
        data: {
          name: `Second Store ${stamp}`,
          domain: `second-${stamp}.nexuscommerce.io`,
          ownerId: (await prisma.user.findUnique({ where: { email: sellerEmail } }))!.id,
        },
      });

      await prisma.customer.createMany({
        data: [
          { storeId, name: 'Guest Shopper', email: guestEmail },
          { storeId: secondStore.id, name: 'Guest Shopper', email: guestEmail },
        ],
      });

      const res = await request.post('/api/auth/register').send({
        name: 'Guest Shopper',
        email: guestEmail,
        password,
        userType: 'CUSTOMER',
      });
      expect(res.status).toBe(201);

      const linked = await prisma.customer.findMany({ where: { email: guestEmail } });
      expect(linked).toHaveLength(2);
      expect(linked.every((c) => c.userId === res.body.data.user.id)).toBe(true);

      await prisma.user.deleteMany({ where: { email: guestEmail } });
      await prisma.store.delete({ where: { id: secondStore.id } });
    });

    it('never reassigns a CRM record that already belongs to someone', async () => {
      const owned = await prisma.customer.create({
        data: { storeId, name: 'Already Owned', email: customerEmail, userId: customerId },
      });

      await request.post('/api/auth/login').send({ email: customerEmail, password });

      const after = await prisma.customer.findUnique({ where: { id: owned.id } });
      expect(after?.userId).toBe(customerId);

      await prisma.customer.delete({ where: { id: owned.id } });
    });
  });

  describe('Password reset', () => {
    it('does not reveal whether an email is registered', async () => {
      const known = await request.post('/api/auth/forgot-password').send({ email: customerEmail });
      const unknown = await request
        .post('/api/auth/forgot-password')
        .send({ email: `nobody_${stamp}@example.com` });

      expect(known.status).toBe(200);
      expect(unknown.status).toBe(200);
      expect(known.body.message).toBe(unknown.body.message);
    });

    it('rejects an unknown reset token', async () => {
      const res = await request
        .post('/api/auth/reset-password')
        .send({ token: 'not-a-real-token', password: newPassword });
      expect(res.status).toBe(400);
    });

    it('rejects a weak new password', async () => {
      await request.post('/api/auth/forgot-password').send({ email: customerEmail });
      const record = await prisma.passwordResetToken.findFirst({
        where: { userId: customerId, usedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      expect(record).toBeTruthy();

      const res = await request
        .post('/api/auth/reset-password')
        .send({ token: 'x'.repeat(64), password: 'weak' });
      expect(res.status).toBe(400);
    });

    it('resets the password, revokes sessions, and burns the token', async () => {
      // Drive the flow through the API, reading the token the way the emailed
      // link would carry it.
      const rawToken = await issueResetTokenFor(customerId);

      const res = await request
        .post('/api/auth/reset-password')
        .send({ token: rawToken, password: newPassword });
      expect(res.status).toBe(200);

      // Old password no longer works; new one does.
      const oldLogin = await request.post('/api/auth/login').send({ email: customerEmail, password });
      expect(oldLogin.status).toBe(401);

      const newLogin = await request
        .post('/api/auth/login')
        .send({ email: customerEmail, password: newPassword });
      expect(newLogin.status).toBe(200);
      customerCookie = (newLogin.headers['set-cookie'] as unknown as string[])[0];

      // The token is single-use.
      const replay = await request
        .post('/api/auth/reset-password')
        .send({ token: rawToken, password: 'Another999!' });
      expect(replay.status).toBe(400);
    });

    it('signs out sessions that existed before the reset', async () => {
      const staleLogin = await request
        .post('/api/auth/login')
        .send({ email: customerEmail, password: newPassword });
      const staleCookie = (staleLogin.headers['set-cookie'] as unknown as string[])[0];

      const rawToken = await issueResetTokenFor(customerId);
      await request.post('/api/auth/reset-password').send({ token: rawToken, password });

      const res = await request.get('/api/auth/me').set('Cookie', staleCookie);
      expect(res.status).toBe(401);
    });
  });

  describe('Change password while signed in', () => {
    it('rejects a wrong current password', async () => {
      const login = await request.post('/api/auth/login').send({ email: customerEmail, password });
      const cookie = (login.headers['set-cookie'] as unknown as string[])[0];

      const res = await request
        .post('/api/auth/change-password')
        .set('Cookie', cookie)
        .send({ currentPassword: 'WrongPassword1!', newPassword: 'Different123!' });

      expect(res.status).toBe(401);
    });

    it('rejects reusing the same password', async () => {
      const login = await request.post('/api/auth/login').send({ email: customerEmail, password });
      const cookie = (login.headers['set-cookie'] as unknown as string[])[0];

      const res = await request
        .post('/api/auth/change-password')
        .set('Cookie', cookie)
        .send({ currentPassword: password, newPassword: password });

      expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
      const res = await request
        .post('/api/auth/change-password')
        .send({ currentPassword: password, newPassword: 'Different123!' });
      expect(res.status).toBe(401);
    });
  });

  describe('Email verification', () => {
    it('rejects an invalid confirmation token', async () => {
      const res = await request.post('/api/auth/verify-email').send({ token: 'nope' });
      expect(res.status).toBe(400);
    });

    it('confirms the address and is single-use', async () => {
      const login = await request.post('/api/auth/login').send({ email: customerEmail, password });
      const cookie = (login.headers['set-cookie'] as unknown as string[])[0];

      const send = await request.post('/api/auth/send-verification').set('Cookie', cookie);
      expect(send.status).toBe(200);

      const record = await prisma.emailVerificationToken.findFirst({
        where: { userId: customerId, usedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      expect(record).toBeTruthy();

      // Only the hash is stored — the raw token must not be recoverable from it.
      expect(record!.tokenHash).not.toContain('-');
      expect(record!.tokenHash).toHaveLength(64);

      const raw = await reissueVerificationTokenFor(customerId);
      const verify = await request.post('/api/auth/verify-email').send({ token: raw });
      expect(verify.status).toBe(200);

      const user = await prisma.user.findUnique({ where: { id: customerId } });
      expect(user?.isVerified).toBe(true);
      expect(user?.emailVerifiedAt).toBeInstanceOf(Date);

      const replay = await request.post('/api/auth/verify-email').send({ token: raw });
      expect(replay.status).toBe(400);
    });
  });

  describe('Token storage', () => {
    it('stores only the digest of a reset token', async () => {
      const raw = await issueResetTokenFor(customerId);
      const stored = await prisma.passwordResetToken.findFirst({
        where: { userId: customerId, usedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      expect(stored?.tokenHash).toBe(hashToken(raw));
      expect(stored?.tokenHash).not.toBe(raw);
    });

    it('invalidates an outstanding reset when a new one is issued', async () => {
      const first = await issueResetTokenFor(customerId);
      await issueResetTokenFor(customerId);

      const res = await request
        .post('/api/auth/reset-password')
        .send({ token: first, password: 'Rotated123!' });
      expect(res.status).toBe(400);
    });
  });
});

/** Helpers that mint a token the way the emailed link would carry it. */
async function issueResetTokenFor(userId: string): Promise<string> {
  const { issuePasswordResetToken } = await import('../src/services/auth/tokens.service.js');
  return issuePasswordResetToken(userId);
}

async function reissueVerificationTokenFor(userId: string): Promise<string> {
  const { issueEmailVerificationToken } = await import('../src/services/auth/tokens.service.js');
  return issueEmailVerificationToken(userId);
}
