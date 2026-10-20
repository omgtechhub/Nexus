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

  let merchantId: string;
  let rivalMerchantId: string;
  let ownerMemberId: string;
  let adminMemberId: string;
  let customerId: string;

  beforeAll(async () => {
    const owner = await request.post('/api/auth/register').send({
      name: 'Team Owner',
      email: ownerEmail,
      password,
      displayName: `ACH Merchant ${ts}`,
      userType: 'SELLER',
    });
    ownerCookie = (owner.headers['set-cookie'] as string[])[0];
    merchantId = owner.body.data.merchant.id;

    const rival = await request.post('/api/auth/register').send({
      name: 'Rival Seller',
      email: rivalEmail,
      password,
      displayName: `ACH Rival ${ts}`,
      userType: 'SELLER',
    });
    rivalCookie = (rival.headers['set-cookie'] as string[])[0];
    rivalMerchantId = rival.body.data.merchant.id;

    const admin = await request.post('/api/auth/register').send({
      name: 'Team Admin',
      email: adminEmail,
      password,
      displayName: `ACH Admin Own ${ts}`,
      userType: 'SELLER',
    });
    adminCookie = (admin.headers['set-cookie'] as string[])[0];
    const adminOwnMerchantId = admin.body.data.merchant.id;

    const outsider = await request.post('/api/auth/register').send({
      name: 'Outsider',
      email: outsiderEmail,
      password,
      displayName: `ACH Outsider ${ts}`,
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
    await prisma.merchantMember.deleteMany({ where: { merchantId: adminOwnMerchantId } });
    await prisma.merchant.delete({ where: { id: adminOwnMerchantId } });

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
    it('refuses a merchantId in the body instead of moving the record across tenants', async () => {
      const res = await request
        .put(`/api/customers/${customerId}`)
        .set('Cookie', [ownerCookie])
        .send({ name: 'Buyer One', merchantId: rivalMerchantId });

      expect(res.status).toBe(400);

      const row = await prisma.customer.findUnique({ where: { id: customerId } });
      expect(row?.merchantId).toBe(merchantId);
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

  describe('A merchant ADMIN cannot take the merchant over', () => {
    it('cannot promote itself to OWNER', async () => {
      const res = await request
        .patch(`/api/team/members/${adminMemberId}/role`)
        .set('Cookie', [adminCookie])
        .send({ role: 'OWNER' });

      expect(res.status).toBe(403);
      const member = await prisma.merchantMember.findUnique({ where: { id: adminMemberId } });
      expect(member?.role).toBe('ADMIN');
    });

    it('cannot demote the owner', async () => {
      const res = await request
        .patch(`/api/team/members/${ownerMemberId}/role`)
        .set('Cookie', [adminCookie])
        .send({ role: 'VIEWER' });

      expect(res.status).toBe(403);
      const member = await prisma.merchantMember.findUnique({ where: { id: ownerMemberId } });
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
      expect(res.body.error).toMatch(/only the merchant owner/i);
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

  describe('A merchant keeps an owner', () => {
    it('refuses to demote the only owner', async () => {
      const res = await request
        .patch(`/api/team/members/${ownerMemberId}/role`)
        .set('Cookie', [ownerCookie])
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(400);
      const member = await prisma.merchantMember.findUnique({ where: { id: ownerMemberId } });
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
        displayName: `ACH Host ${ts}`,
        userType: 'SELLER',
      });
      const hostCookie = (host.headers['set-cookie'] as string[])[0];
      const hostMerchantId = host.body.data.merchant.id;

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
      const seat = await prisma.merchantMember.findFirst({
        where: { userId: user!.id, merchantId: hostMerchantId },
      });
      expect(seat).toBeNull();
    });
  });

  /*
   * The custom-domain tests are gone with the feature.
   *
   * They asserted that domain verification had no unconditional auto-verify
   * branch -- the hole that let any seller claim a hostname containing
   * "nexus", including nexuscommerce.io itself. There is now no CustomDomain
   * table, no /api/domains route and no verification code at all, because a
   * merchant on a marketplace has no hostname of its own. The guard that
   * replaces those tests is `noDomainFeature` below: it fails if the route
   * ever comes back.
   */
  describe('The custom-domain feature is gone', () => {
    it('serves no domain route', async () => {
      const res = await request.post('/api/domains').set('Cookie', [rivalCookie]).send({
        domain: 'rival.example.com',
      });
      expect(res.status).toBe(404);
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
