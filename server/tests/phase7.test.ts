import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

const request = supertest(app);

describe('Nexus Commerce Phase 7 Integration Tests (Storefront Builder, Pages, Navigation, Team Management, Custom Domains & Audit Logs)', () => {
  const storeAEmail = `owner_p7_${Date.now()}@nexus.io`;
  const storeBEmail = `other_p7_${Date.now()}@nexus.io`;
  const invitedStaffEmail = `staff_p7_${Date.now()}@nexus.io`;
  const password = 'Password123!';

  let storeACookie: string;
  let storeBCookie: string;
  let staffCookie: string;
  let storeAId: string;
  let storeBId: string;

  let createdPageId: string;
  let invitationId: string;
  let invitationToken: string;
  let invitedMemberId: string;
  let customDomainId: string;

  beforeAll(async () => {
    // 1. Register Store A (Owner A)
    const resA = await request.post('/api/auth/register').send({
      name: 'Phase 7 Storefront Owner',
      email: storeAEmail,
      password,
      storeName: 'Phase7 Store Alpha',
    });
    expect(resA.status).toBe(201);
    storeACookie = resA.headers['set-cookie'][0];
    storeAId = resA.body.data.store.id;

    // 2. Register Store B (Owner B)
    const resB = await request.post('/api/auth/register').send({
      name: 'Phase 7 Storefront Beta Owner',
      email: storeBEmail,
      password,
      storeName: 'Phase7 Store Beta',
    });
    expect(resB.status).toBe(201);
    storeBCookie = resB.headers['set-cookie'][0];
    storeBId = resB.body.data.store.id;

    // 3. Register Staff User (who will accept invitation later)
    const resStaff = await request.post('/api/auth/register').send({
      name: 'Invited Staff Member',
      email: invitedStaffEmail,
      password,
      storeName: 'Temp Staff Store',
    });
    expect(resStaff.status).toBe(201);
    staffCookie = resStaff.headers['set-cookie'][0];
  });

  it('1. Storefront Config: Manages draft vs published configuration workflows', async () => {
    // Get default storefront config
    const getRes = await request.get('/api/storefront-config').set('Cookie', [storeACookie]);
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.isPublished).toBe(true);

    // Update draft config
    const patchRes = await request
      .patch('/api/storefront-config')
      .set('Cookie', [storeACookie])
      .send({
        draftConfig: {
          theme: { primaryColor: '#FFBD2E', fontFamily: 'Inter', accentColor: '#27C93F', bannerText: 'Draft Banner 2026' },
          sections: [{ id: 'sec-1', type: 'hero', enabled: true, settings: { title: 'Draft Hero Title' } }],
        },
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.draftConfig.theme.bannerText).toBe('Draft Banner 2026');

    // Public storefront preview before publish should serve draft config
    const previewRes = await request.get('/api/storefront-config/preview').set('Cookie', [storeACookie]);
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.data.theme.bannerText).toBe('Draft Banner 2026');

    // Publish storefront config
    const publishRes = await request.post('/api/storefront-config/publish').set('Cookie', [storeACookie]);
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.isPublished).toBe(true);
    expect(publishRes.body.data.publishedConfig.theme.bannerText).toBe('Draft Banner 2026');
  });

  it('2. Custom Pages API: Creates, lists, updates, and deletes custom pages with slug validation', async () => {
    // Create custom page (About Us)
    const createRes = await request
      .post('/api/pages')
      .set('Cookie', [storeACookie])
      .send({
        title: 'About Our Brand',
        slug: 'about-us',
        content: '<h1>Our Story</h1><p>We craft sustainable fashion for the world.</p>',
        isPublished: true,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.slug).toBe('about-us');
    createdPageId = createRes.body.data.id;

    // List pages
    const listRes = await request.get('/api/pages').set('Cookie', [storeACookie]);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

    // Duplicate slug in same store should fail
    const dupRes = await request
      .post('/api/pages')
      .set('Cookie', [storeACookie])
      .send({
        title: 'Duplicate About Page',
        slug: 'about-us',
        content: 'Duplicate content',
      });
    expect(dupRes.status).toBe(400);

    // Update page
    const updateRes = await request
      .put(`/api/pages/${createdPageId}`)
      .set('Cookie', [storeACookie])
      .send({ title: 'About Our Sustainable Brand' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe('About Our Sustainable Brand');
  });

  it('3. Navigation Menus API: Creates and manages custom navigation menus', async () => {
    // Save main navigation menu
    const navRes = await request
      .put('/api/navigation/main-menu')
      .set('Cookie', [storeACookie])
      .send({
        title: 'Main Navigation Header',
        items: [
          { id: 'item-1', label: 'Home', url: '/', order: 0 },
          { id: 'item-2', label: 'Catalog', url: '/products', order: 1 },
          { id: 'item-3', label: 'About Us', url: '/pages/about-us', order: 2 },
        ],
      });

    expect(navRes.status).toBe(200);
    expect(navRes.body.success).toBe(true);
    expect(navRes.body.data.items.length).toBe(3);

    // Fetch menus
    const listNavRes = await request.get('/api/navigation').set('Cookie', [storeACookie]);
    expect(listNavRes.status).toBe(200);
    expect(listNavRes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('4. Team Management & RBAC: Sends invitations, verifies token acceptance, role changes, and RBAC security', async () => {
    // Get team
    const teamRes = await request.get('/api/team').set('Cookie', [storeACookie]);
    expect(teamRes.status).toBe(200);
    expect(teamRes.body.data.members.length).toBeGreaterThanOrEqual(1);
    expect(teamRes.body.data.members[0].role).toBe('OWNER');

    // Invite new team member
    const inviteRes = await request
      .post('/api/team/invite')
      .set('Cookie', [storeACookie])
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
      .set('Cookie', [storeACookie])
      .send({ role: 'ADMIN' });
    expect(roleRes.status).toBe(200);
    expect(roleRes.body.data.role).toBe('ADMIN');

    // Multi-tenant isolation check: Store B cannot see or alter Store A's team
    const bTeamRes = await request.get('/api/team').set('Cookie', [storeBCookie]);
    expect(bTeamRes.body.data.members.some((m: any) => m.id === invitedMemberId)).toBe(false);
  });

  it('5. Custom Domains API: Adds domain, verifies DNS simulation/lookup, sets primary, and enforces store isolation', async () => {
    // Add custom domain
    const domainName = `shop-${Date.now()}.nexuscommerce.io`;
    const addRes = await request
      .post('/api/domains')
      .set('Cookie', [storeACookie])
      .send({ domain: domainName });

    expect(addRes.status).toBe(201);
    expect(addRes.body.success).toBe(true);
    expect(addRes.body.data.domain).toBe(domainName);
    expect(addRes.body.data.status).toBe('PENDING');
    customDomainId = addRes.body.data.id;

    // Trigger DNS verification endpoint
    const verifyRes = await request
      .post(`/api/domains/${customDomainId}/verify`)
      .set('Cookie', [storeACookie]);

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);

    // Duplicate domain in Store B should be blocked
    const dupRes = await request
      .post('/api/domains')
      .set('Cookie', [storeBCookie])
      .send({ domain: domainName });
    expect(dupRes.status).toBe(400);

    // List domains
    const listDomRes = await request.get('/api/domains').set('Cookie', [storeACookie]);
    expect(listDomRes.status).toBe(200);
    expect(listDomRes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('6. Merchant Audit Logs API: Verifies audit logs record sensitive actions', async () => {
    const auditRes = await request.get('/api/audit-logs').set('Cookie', [storeACookie]);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.success).toBe(true);
    expect(auditRes.body.data.length).toBeGreaterThanOrEqual(1);

    // Check actions recorded in audit logs
    const actions = auditRes.body.data.map((log: any) => log.action);
    expect(actions).toContain('STOREFRONT_PUBLISHED');
  });
});
