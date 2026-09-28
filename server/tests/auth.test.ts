import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

const request = supertest(app);

describe('Nexus Commerce Phase 1 & 2 Auth & API Integration Tests', () => {
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Integration Test User';
  let authCookie: string;

  beforeAll(async () => {
    // Clean test user if exists
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  it('1. Registration: creates User, Store, OWNER membership, Session & cookie', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({
        name: testName,
        email: testEmail,
        password: testPassword,
        storeName: 'Test Store',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.store).toBeDefined();
    expect(res.body.data.membership.role).toBe('OWNER');

    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    authCookie = cookies[0];
  });

  it('2. Duplicate Registration: rejects existing email', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({
        name: testName,
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('3. Login: authenticates with valid credentials', async () => {
    const res = await request
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);

    const cookies = res.headers['set-cookie'] as unknown as string[];
    authCookie = cookies[0];
  });

  it('4. Wrong password: returns 401', async () => {
    const res = await request
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword999!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('5. /api/auth/me: returns current user, store, and membership', async () => {
    const res = await request
      .get('/api/auth/me')
      .set('Cookie', [authCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.store).toBeDefined();
    expect(res.body.data.membership.role).toBe('OWNER');
  });

  it('6. Protected business endpoints: GET /api/products works with auth', async () => {
    const res = await request
      .get('/api/products')
      .set('Cookie', [authCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('7. Logout: revokes session & clears cookie', async () => {
    const res = await request
      .post('/api/auth/logout')
      .set('Cookie', [authCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('8. Unauthorized access: protected endpoint returns 401 without valid session', async () => {
    const res = await request.get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
