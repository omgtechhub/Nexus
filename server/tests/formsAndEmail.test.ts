import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { emailService } from '../src/services/email/email.service.js';
import { config } from '../src/config/index.js';

const request = supertest(app);

/**
 * Forms that submit, and sends that send.
 *
 * Three surfaces claimed to have done something and had not: the public
 * contact form set a flag and told the sender a team member had been assigned
 * to their request; the seller's compose window toasted "Email sent to
 * <address>!"; and seller Settings "saved" a profile into React state. None
 * made a request. Each test below is about the thing that was missing -- a
 * real call, a real recipient, and an honest answer when delivery fails.
 */
describe('Forms submit and mail is actually sent', () => {
  const stamp = Date.now();
  const password = 'Password123!';

  let merchantCookie: string;
  let rivalCookie: string;
  let customerId: string;
  let rivalCustomerId: string;

  beforeAll(async () => {
    const merchant = await request.post('/api/auth/register').send({
      name: 'Form Merchant', email: `fm_m_${stamp}@nexus.io`, password,
      displayName: `FM Merchant ${stamp}`,
    });
    expect(merchant.status).toBe(201);
    merchantCookie = merchant.headers['set-cookie'][0];

    const rival = await request.post('/api/auth/register').send({
      name: 'Rival Merchant', email: `fm_r_${stamp}@nexus.io`, password,
      displayName: `FM Rival ${stamp}`,
    });
    expect(rival.status).toBe(201);
    rivalCookie = rival.headers['set-cookie'][0];

    const mine = await request.post('/api/customers').set('Cookie', [merchantCookie]).send({
      name: 'Ada Customer', email: `fm_c_${stamp}@example.com`,
    });
    expect(mine.status).toBe(201);
    customerId = mine.body.data.id;

    const theirs = await request.post('/api/customers').set('Cookie', [rivalCookie]).send({
      name: 'Rival Customer', email: `fm_rc_${stamp}@example.com`,
    });
    expect(theirs.status).toBe(201);
    rivalCustomerId = theirs.body.data.id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('The public contact form', () => {
    it('accepts a message and hands it to the mail transport', async () => {
      const sent = vi.spyOn(emailService, 'sendContactMessage').mockResolvedValue(true);

      const res = await request.post('/api/contact').send({
        name: 'Chidi Visitor',
        email: 'chidi@example.com',
        category: 'listing',
        message: 'How do I list my first product on Nexus?',
      });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(sent).toHaveBeenCalledTimes(1);
      // The destination is ours, never anything the sender chose.
      expect(sent.mock.calls[0][0].to).toBe(config.email.supportTo);
      expect(sent.mock.calls[0][0].fromEmail).toBe('chidi@example.com');
    });

    it('reports a failed send as a failure instead of a thank-you', async () => {
      vi.spyOn(emailService, 'sendContactMessage').mockResolvedValue(false);

      const res = await request.post('/api/contact').send({
        name: 'Chidi Visitor',
        email: 'chidi@example.com',
        category: 'other',
        message: 'This one cannot be delivered.',
      });

      // The old page said "Message Received!" no matter what happened.
      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
    });

    it('rejects a malformed address and an empty message', async () => {
      const badEmail = await request.post('/api/contact').send({
        name: 'X', email: 'not-an-address', category: 'other', message: 'A long enough message.',
      });
      expect(badEmail.status).toBe(400);

      const noMessage = await request.post('/api/contact').send({
        name: 'X', email: 'x@example.com', category: 'other', message: 'hi',
      });
      expect(noMessage.status).toBe(400);
    });

    it('ignores an unexpected field rather than passing it through', async () => {
      const res = await request.post('/api/contact').send({
        name: 'X', email: 'x@example.com', category: 'other',
        message: 'A long enough message to pass.', to: 'victim@example.com',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('A merchant emailing their own customer', () => {
    it('sends to the address on the customer row', async () => {
      const sent = vi.spyOn(emailService, 'sendMerchantMessage').mockResolvedValue(true);

      const res = await request
        .post(`/api/customers/${customerId}/email`)
        .set('Cookie', [merchantCookie])
        .send({ subject: 'Your order', body: 'It ships tomorrow.' });

      expect(res.status).toBe(202);
      expect(sent.mock.calls[0][0].to).toBe(`fm_c_${stamp}@example.com`);
    });

    it('refuses a customer belonging to another merchant', async () => {
      const sent = vi.spyOn(emailService, 'sendMerchantMessage').mockResolvedValue(true);

      const res = await request
        .post(`/api/customers/${rivalCustomerId}/email`)
        .set('Cookie', [merchantCookie])
        .send({ subject: 'Hello', body: 'You do not know me.' });

      expect(res.status).toBe(404);
      expect(sent).not.toHaveBeenCalled();
    });

    it('refuses a signed-out caller', async () => {
      const res = await request
        .post(`/api/customers/${customerId}/email`)
        .send({ subject: 'Hello', body: 'No session here.' });
      expect(res.status).toBe(401);
    });

    it('says so when the transport rejects the message', async () => {
      vi.spyOn(emailService, 'sendMerchantMessage').mockResolvedValue(false);

      const res = await request
        .post(`/api/customers/${customerId}/email`)
        .set('Cookie', [merchantCookie])
        .send({ subject: 'Your order', body: 'It ships tomorrow.' });

      expect(res.status).toBe(502);
    });
  });

  describe('A seller saving their own profile', () => {
    it('persists the new name', async () => {
      const res = await request
        .patch('/api/auth/profile')
        .set('Cookie', [merchantCookie])
        .send({ name: 'Renamed Seller' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renamed Seller');

      const row = await prisma.user.findUnique({ where: { email: `fm_m_${stamp}@nexus.io` } });
      expect(row?.name).toBe('Renamed Seller');
    });

    it('will not let the sign-in address be rewritten through it', async () => {
      const res = await request
        .patch('/api/auth/profile')
        .set('Cookie', [merchantCookie])
        .send({ email: 'someone-elses@example.com' });

      expect(res.status).toBe(400);

      const row = await prisma.user.findUnique({ where: { email: `fm_m_${stamp}@nexus.io` } });
      expect(row).toBeTruthy();
    });

    it('rejects an avatar that is not a URL, so the column cannot hold a data blob', async () => {
      const res = await request
        .patch('/api/auth/profile')
        .set('Cookie', [merchantCookie])
        .send({ avatar: 'data:image/png;base64,iVBORw0KGgo=' });

      expect(res.status).toBe(400);
    });

    it('refuses a signed-out caller', async () => {
      const res = await request.patch('/api/auth/profile').send({ name: 'Nobody' });
      expect(res.status).toBe(401);
    });
  });
});
