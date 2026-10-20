import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { allowedOrigins } from '../src/app.js';

const request = supertest(app);

/**
 * Hardening.
 *
 * These assert the shape of the attack, not just the config value, so a later
 * refactor that reintroduces the hole fails here rather than in production.
 */
describe('Hardening: CSRF surface, CORS and origin handling', () => {
  const stamp = Date.now();
  const email = `harden_${stamp}@nexus.io`;
  const password = 'Password123!';

  let cookie: string;
  let productId: string;

  beforeAll(async () => {
    const res = await request.post('/api/auth/register').send({
      name: 'Harden Merchant', email, password, displayName: `Harden Merchant ${stamp}`,
    });
    expect(res.status).toBe(201);
    cookie = res.headers['set-cookie'][0];

    const prod = await request.post('/api/products').set('Cookie', [cookie]).send({
      title: `Harden Widget ${stamp}`, price: 10, sku: `SKU-H-${stamp}`, inventory: 5,
    });
    expect(prod.status).toBe(201);
    productId = prod.body.data.id;
  });

  describe('cross-site form posts', () => {
    it('refuses a form-encoded state change, which a cross-site <form> can send without a preflight', async () => {
      // application/x-www-form-urlencoded is a CORS "simple" content type: a
      // form on any site can POST it with the victim's cookie attached and the
      // browser never asks permission first. JSON, by contrast, is preflighted.
      const res = await request
        .post('/api/products')
        .set('Cookie', [cookie])
        .type('form')
        .send({ title: 'CSRF product', price: '1', sku: `csrf-${stamp}`, inventory: '1' });

      expect(res.status).not.toBe(201);
      expect([400, 403, 415]).toContain(res.status);
    });

    it('refuses a form-encoded delete', async () => {
      // Its own product: before the fix this delete succeeded, and a shared
      // fixture meant every later test failed for the wrong reason.
      const victim = await request.post('/api/products').set('Cookie', [cookie]).send({
        title: `Harden Victim ${stamp}`, price: 10, sku: `SKU-HV-${stamp}`, inventory: 1,
      });
      expect(victim.status).toBe(201);
      const victimId = victim.body.data.id;

      const res = await request
        .delete(`/api/products/${victimId}`)
        .set('Cookie', [cookie])
        .set('Origin', 'https://attacker.example')
        .type('form')
        .send({});

      expect(res.status).not.toBe(200);

      // It must still be there.
      const check = await request.get('/api/products').set('Cookie', [cookie]);
      const ids = (check.body.data.products ?? check.body.data).map((p: any) => p.id);
      expect(ids).toContain(victimId);
    });

    it('still accepts an ordinary JSON state change', async () => {
      const res = await request
        .patch(`/api/products/${productId}`)
        .set('Cookie', [cookie])
        .send({ title: `Renamed ${stamp}` });
      expect(res.status).toBe(200);
    });
  });

  describe('cross-site requests carrying a session', () => {
    it('refuses a state change whose Origin is not an allowed one', async () => {
      const res = await request
        .post('/api/products')
        .set('Cookie', [cookie])
        .set('Origin', 'https://attacker.example')
        .send({ title: 'Evil', price: 1, sku: `evil-${stamp}`, inventory: 1 });

      expect(res.status).toBe(403);
    });

    it('does not treat a lookalike host as the allowed origin', async () => {
      // `origin.includes('localhost')` used to accept this.
      for (const origin of [
        'https://localhost.attacker.example',
        'https://127.0.0.1.attacker.example',
        'https://notlocalhost',
      ]) {
        const res = await request
          .post('/api/products')
          .set('Cookie', [cookie])
          .set('Origin', origin)
          .send({ title: 'Evil', price: 1, sku: `evil2-${stamp}`, inventory: 1 });
        expect(res.status, `origin ${origin} was accepted`).toBe(403);
      }
    });

    it('allows a state change from a configured origin', async () => {
      const origin = allowedOrigins[0] || 'http://localhost:5173';
      const res = await request
        .patch(`/api/products/${productId}`)
        .set('Cookie', [cookie])
        .set('Origin', origin)
        .send({ title: `Same origin ${stamp}` });

      expect(res.status).toBe(200);
    });

    it('allows a write with no Origin at all, which is a deliberate gap', async () => {
      // Browsers send Origin on every cross-origin request and on every
      // same-origin non-GET, so a CSRF attempt always carries one. A request
      // with none is curl, a webhook sender or a mobile client — none of which
      // has an ambient cookie for an attacker to ride. Blocking them would
      // break those callers without closing anything.
      const res = await request
        .patch(`/api/products/${productId}`)
        .set('Cookie', [cookie])
        .send({ title: `No origin ${stamp}` });
      expect(res.status).toBe(200);
    });

    it('leaves reads alone — only state changes are origin-checked', async () => {
      const res = await request
        .get('/api/products')
        .set('Cookie', [cookie])
        .set('Origin', 'https://attacker.example');
      expect(res.status).toBe(200);
    });
  });

  describe('response headers', () => {
    it('does not advertise the server implementation', async () => {
      const res = await request.get('/api/plans');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('sets the usual hardening headers', async () => {
      const res = await request.get('/api/plans');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['strict-transport-security']).toBeTruthy();
    });

    it('does not leave connect-src wide open in the CSP', async () => {
      const res = await request.get('/api/plans');
      const csp = res.headers['content-security-policy'] || '';
      expect(csp).toBeTruthy();
      expect(csp).not.toMatch(/connect-src[^;]*\*/);
    });
  });
});
