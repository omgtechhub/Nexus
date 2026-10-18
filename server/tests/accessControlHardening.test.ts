import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { escapeHtml, escapeUrl } from '../src/utils/escapeHtml.js';

const request = supertest(app);

/**
 * Access-control holes found in the whole-app security review, each of which
 * was reachable by an ordinary authenticated user.
 *
 * Every test here asserts the *negative* — that the privileged action is
 * refused — so a regression that reopens one of these fails loudly rather
 * than quietly widening what a staff account or a merchant can do.
 */
describe('Access control hardening', () => {
  const ts = Date.now();
  const password = 'Password123!';

  const ownerEmail = `ach_owner_${ts}@example.com`;
  const adminEmail = `ach_admin_${ts}@example.com`;
  const outsiderEmail = `ach_outsider_${ts}@example.com`;
  const rivalEmail = `ach_rival_${ts}@example.com`;
  const buyerEmail = `ach_buyer_${ts}@example.com`;

  let ownerCookie: string;
  let adminCookie: string;
  let outsiderCookie: string;
  let rivalCookie: string;

  let storeId: string;
  let rivalStoreId: string;
  let ownerMemberId: string;
  let adminMemberId: string;
  let customerId: string;

  beforeAll(async () => {
    const owner = await request.post('/api/auth/register').send({
      name: 'Team Owner',
      email: ownerEmail,
      password,
      storeName: `ACH Store ${ts}`,
      userType: 'SELLER',
    });
    ownerCookie = (owner.headers['set-cookie'] as string[])[0];
    storeId = owner.body.data.store.id;

    const rival = await request.post('/api/auth/register').send({
      name: 'Rival Seller',
      email: rivalEmail,
      password,
      storeName: `ACH Rival ${ts}`,
      userType: 'SELLER',
    });
    rivalCookie = (rival.headers['set-cookie'] as string[])[0];
    rivalStoreId = rival.body.data.store.id;

    const admin = await request.post('/api/auth/register').send({
      name: 'Team Admin',
      email: adminEmail,
      password,
      storeName: `ACH Admin Own ${ts}`,
      userType: 'SELLER',
    });
    adminCookie = (admin.headers['set-cookie'] as string[])[0];
    const adminOwnStoreId = admin.body.data.store.id;

    const outsider = await request.post('/api/auth/register').send({
      name: 'Outsider',
      email: outsiderEmail,
      password,
      storeName: `ACH Outsider ${ts}`,
      userType: 'SELLER',
    });
    outsiderCookie = (outsider.headers['set-cookie'] as string[])[0];

    // Seat the admin on the owner's store through a real invitation.
    const invite = await request
      .post('/api/team/invite')
      .set('Cookie', [ownerCookie])
      .send({ email: adminEmail, role: 'ADMIN' });
    const token = invite.body.data.inviteLink.split('token=')[1];
    await request.post('/api/team/accept-invite').set('Cookie', [adminCookie]).send({ token });

    /**
     * Drop the admin's own merchant account.
     *
     * `activeMembershipOf` deliberately prefers a user's own store over one
     * they were invited onto, so while this account owns a store every
     * request it makes is evaluated against *that* store — where it is the
     * OWNER. The scenario under test is a staff-only account, which is what
     * removing its own store leaves behind.
     */
    await prisma.storeMember.deleteMany({ where: { storeId: adminOwnStoreId } });
    await prisma.store.delete({ where: { id: adminOwnStoreId } });

    const team = await request.get('/api/team').set('Cookie', [ownerCookie]);
    ownerMemberId = team.body.data.members.find((m: any) => m.role === 'OWNER').id;
    adminMemberId = team.body.data.members.find((m: any) => m.role === 'ADMIN').id;

    const customer = await request
      .post('/api/customers')
      .set('Cookie', [ownerCookie])
      .send({ name: 'Buyer One', email: buyerEmail });
    customerId = customer.body.data.id;
  });

  describe('Customer update is not a mass assignment', () => {
    it('refuses a storeId in the body instead of moving the record across tenants', async () => {
      const res = await request
        .put(`/api/customers/${customerId}`)
        .set('Cookie', [ownerCookie])
        .send({ name: 'Buyer One', storeId: rivalStoreId });

      expect(res.status).toBe(400);

      const row = await prisma.customer.findUnique({ where: { id: customerId } });
      expect(row?.storeId).toBe(storeId);
    });

    it('refuses a userId, which would link the record to an arbitrary account', async () => {
      const victim = await prisma.user.findUnique({ where: { email: outsiderEmail } });
      const res = await request
        .put(`/api/customers/${customerId}`)
        .set('Cookie', [ownerCookie])
        .send({ userId: victim!.id });

      expect(res.status).toBe(400);

      const row = await prisma.customer.findUnique({ where: { id: customerId } });
      expect(row?.userId).toBeNull();
    });

    it('refuses derived reporting columns', async () => {
      const res = await request
        .put(`/api/customers/${customerId}`)
        .set('Cookie', [ownerCookie])
        .send({ totalSpent: 999999 });

      expect(res.status).toBe(400);
      const row = await prisma.customer.findUnique({ where: { id: customerId } });
      expect(row?.totalSpent).toBe(0);
    });

    it('still applies a legitimate edit, normalised', async () => {
      const res = await request
        .put(`/api/customers/${customerId}`)
        .set('Cookie', [ownerCookie])
        .send({ name: '  Buyer Renamed  ' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Buyer Renamed');
    });
  });

  describe('A store ADMIN cannot take the store over', () => {
    it('cannot promote itself to OWNER', async () => {
      const res = await request
        .patch(`/api/team/members/${adminMemberId}/role`)
        .set('Cookie', [adminCookie])
        .send({ role: 'OWNER' });

      expect(res.status).toBe(403);
      const member = await prisma.storeMember.findUnique({ where: { id: adminMemberId } });
      expect(member?.role).toBe('ADMIN');
    });

    it('cannot demote the owner', async () => {
      const res = await request
        .patch(`/api/team/members/${ownerMemberId}/role`)
        .set('Cookie', [adminCookie])
        .send({ role: 'VIEWER' });

      expect(res.status).toBe(403);
      const member = await prisma.storeMember.findUnique({ where: { id: ownerMemberId } });
      expect(member?.role).toBe('OWNER');
    });

    it('cannot mint an OWNER-level invitation', async () => {
      const res = await request
        .post('/api/team/invite')
        .set('Cookie', [adminCookie])
        .send({ email: `ach_pawn_${ts}@example.com`, role: 'OWNER' });

      expect(res.status).toBe(403);
      // Specifically refused for the role, not incidentally refused by the
      // plan's seat limit — which is what this asserted before the
      // authorization check was moved ahead of the entitlement check.
      expect(res.body.error).toMatch(/only the store owner/i);
    });

    it('may still make the role changes the owner is entitled to', async () => {
      const res = await request
        .patch(`/api/team/members/${adminMemberId}/role`)
        .set('Cookie', [ownerCookie])
        .send({ role: 'STAFF' });
      expect(res.status).toBe(200);

      const back = await request
        .patch(`/api/team/members/${adminMemberId}/role`)
        .set('Cookie', [ownerCookie])
        .send({ role: 'ADMIN' });
      expect(back.status).toBe(200);
      expect(back.body.data.role).toBe('ADMIN');
    });
  });

  describe('Role input is validated rather than cast', () => {
    it('answers 400 for an unknown role, not 500', async () => {
      const res = await request
        .patch(`/api/team/members/${adminMemberId}/role`)
        .set('Cookie', [ownerCookie])
        .send({ role: 'SUPERUSER' });
      expect(res.status).toBe(400);
    });

    it('answers 400 for a non-string role, not 500', async () => {
      const res = await request
        .patch(`/api/team/members/${adminMemberId}/role`)
        .set('Cookie', [ownerCookie])
        .send({ role: 42 });
      expect(res.status).toBe(400);
    });
  });

  describe('A store keeps an owner', () => {
    it('refuses to demote the only owner', async () => {
      const res = await request
        .patch(`/api/team/members/${ownerMemberId}/role`)
        .set('Cookie', [ownerCookie])
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(400);
      const member = await prisma.storeMember.findUnique({ where: { id: ownerMemberId } });
      expect(member?.role).toBe('OWNER');
    });
  });

  describe('An invitation is bound to the address it was sent to', () => {
    it('refuses redemption by a different account holding the token', async () => {
      // Its own store: the shared one may be at its plan's team-member limit
      // by the time this runs, and a 403 from the entitlement check would
      // look like a pass for the wrong reason.
      const host = await request.post('/api/auth/register').send({
        name: 'Invite Host',
        email: `ach_host_${ts}@example.com`,
        password,
        storeName: `ACH Host ${ts}`,
        userType: 'SELLER',
      });
      const hostCookie = (host.headers['set-cookie'] as string[])[0];
      const hostStoreId = host.body.data.store.id;

      const invite = await request
        .post('/api/team/invite')
        .set('Cookie', [hostCookie])
        .send({ email: `ach_intended_${ts}@example.com`, role: 'STAFF' });
      expect(invite.status).toBe(201);
      const token = invite.body.data.inviteLink.split('token=')[1];

      const res = await request
        .post('/api/team/accept-invite')
        .set('Cookie', [outsiderCookie])
        .send({ token });

      expect(res.status).toBe(403);

      const user = await prisma.user.findUnique({ where: { email: outsiderEmail } });
      const seat = await prisma.storeMember.findFirst({
        where: { userId: user!.id, storeId: hostStoreId },
      });
      expect(seat).toBeNull();
    });
  });

  describe('Custom domains', () => {
    it('refuses a hostname that is not a hostname', async () => {
      const res = await request
        .post('/api/domains')
        .set('Cookie', [rivalCookie])
        .send({ domain: 'not a domain at all' });
      expect(res.status).toBe(400);
    });

    it('refuses a platform-reserved domain', async () => {
      const res = await request
        .post('/api/domains')
        .set('Cookie', [rivalCookie])
        .send({ domain: 'nexuscommerce.io' });
      expect(res.status).toBe(400);

      const sub = await request
        .post('/api/domains')
        .set('Cookie', [rivalCookie])
        .send({ domain: 'shops.nexuscommerce.io' });
      expect(sub.status).toBe(400);
    });

    it('has no unconditional auto-verify branch left in the source', async () => {
      const fs = await import('fs/promises');
      const src = await fs.readFile(
        new URL('../src/controllers/domains.controller.ts', import.meta.url),
        'utf-8'
      );
      // The old fallback verified any domain whose name merely *contained*
      // one of these, with no environment check at all, on the DNS-failure
      // branch — which is the branch you land on for a domain you do not own.
      expect(src).not.toMatch(/customDomain\.domain\.includes\('auraapparel'\)/);
      expect(src).not.toMatch(/customDomain\.domain\.includes\('nexus'\)/);
      expect(src).not.toMatch(/customDomain\.domain\.includes\('example\.com'\)/);
    });
  });

  describe('Email interpolation is escaped', () => {
    it('neutralises markup in a display name', () => {
      expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
      expect(escapeHtml('</p><a href="https://evil.test">Verify</a>')).not.toContain('<a href');
    });

    it('refuses a non-http scheme in an href', () => {
      expect(escapeUrl('javascript:alert(1)')).toBe('#');
      expect(escapeUrl('https://nexus.test/reset?token=abc')).toContain('https://nexus.test');
    });
  });
});
