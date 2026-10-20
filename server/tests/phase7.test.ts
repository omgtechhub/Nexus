import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

const request = supertest(app);

/*
 * What used to be six tests is two.
 *
 * Storefront config, custom pages, navigation menus and custom domains were
 * four features of a shopfront a seller operated themselves. Nexus is one
 * marketplace, so they have no tables, no routes and no UI; their tests went
 * with them rather than being left asserting against 404s. Team management
 * and audit logs are untouched -- both are about a merchant ACCOUNT, which
 * still exists.
 */
describe('Nexus Commerce Phase 7 Integration Tests (Team Management & Audit Logs)', () => {
  const merchantAEmail = `owner_p7_${Date.now()}@nexus.io`;
  const merchantBEmail = `other_p7_${Date.now()}@nexus.io`;
  const invitedStaffEmail = `staff_p7_${Date.now()}@nexus.io`;
  const password = 'Password123!';

  let merchantACookie: string;
  let merchantBCookie: string;
  let staffCookie: string;
  let merchantAId: string;
  let merchantBId: string;

  let invitationId: string;
  let invitationToken: string;
  let invitedMemberId: string;

  beforeAll(async () => {
    // 1. Register Store A (Owner A)
    const resA = await request.post('/api/auth/register').send({
      name: 'Phase 7 Merchant Owner',
      email: merchantAEmail,
      password,
      displayName: 'Phase7 Merchant Alpha',
    });
    expect(resA.status).toBe(201);
    merchantACookie = resA.headers['set-cookie'][0];
    merchantAId = resA.body.data.merchant.id;

    // 2. Register Store B (Owner B)
    const resB = await request.post('/api/auth/register').send({
      name: 'Phase 7 Storefront Beta Owner',
      email: merchantBEmail,
      password,
      displayName: 'Phase7 Merchant Beta',
    });
    expect(resB.status).toBe(201);
    merchantBCookie = resB.headers['set-cookie'][0];
    merchantBId = resB.body.data.merchant.id;

    // 3. Register Staff User (who will accept invitation later)
    const resStaff = await request.post('/api/auth/register').send({
      name: 'Invited Staff Member',
      email: invitedStaffEmail,
      password,
      displayName: 'Temp Staff Merchant',
    });
    expect(resStaff.status).toBe(201);
    staffCookie = resStaff.headers['set-cookie'][0];
  });

  it('4. Team Management & RBAC: Sends invitations, verifies token acceptance, role changes, and RBAC security', async () => {
    // Get team
    const teamRes = await request.get('/api/team').set('Cookie', [merchantACookie]);
    expect(teamRes.status).toBe(200);
    expect(teamRes.body.data.members.length).toBeGreaterThanOrEqual(1);
    expect(teamRes.body.data.members[0].role).toBe('OWNER');

    // Invite new team member
    const inviteRes = await request
      .post('/api/team/invite')
      .set('Cookie', [merchantACookie])
      .send({
        email: invitedStaffEmail,
        role: 'STAFF',
      });

    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.success).toBe(true);
    invitationId = inviteRes.body.data.invitation.id;

    // Use invitation token from API link
    invitationToken = inviteRes.body.data.inviteLink.split('token=')[1];

    // Accept invitation with Staff User cookie
    const acceptRes = await request
      .post('/api/team/accept-invite')
      .set('Cookie', [staffCookie])
      .send({ token: invitationToken });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    invitedMemberId = acceptRes.body.data.member.id;

    // Change member role to ADMIN
    const roleRes = await request
      .patch(`/api/team/members/${invitedMemberId}/role`)
      .set('Cookie', [merchantACookie])
      .send({ role: 'ADMIN' });
    expect(roleRes.status).toBe(200);
    expect(roleRes.body.data.role).toBe('ADMIN');

    // Multi-tenant isolation check: Store B cannot see or alter Store A's team
    const bTeamRes = await request.get('/api/team').set('Cookie', [merchantBCookie]);
    expect(bTeamRes.body.data.members.some((m: any) => m.id === invitedMemberId)).toBe(false);
  });

  it('6. Merchant Audit Logs API: Verifies audit logs record sensitive actions', async () => {
    const auditRes = await request.get('/api/audit-logs').set('Cookie', [merchantACookie]);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.success).toBe(true);
    expect(auditRes.body.data.length).toBeGreaterThanOrEqual(1);

    /*
     * This asserted on STOREFRONT_PUBLISHED, which only the storefront
     * publisher ever wrote and which nothing can write now. Team management
     * is the sensitive action this file still exercises, so that is what the
     * log has to show -- and it is the better assertion anyway, since a role
     * change is the one an auditor actually comes looking for.
     */
    const actions = auditRes.body.data.map((log: any) => log.action);
    expect(actions).toContain('TEAM_ROLE_CHANGED');
  });
});
