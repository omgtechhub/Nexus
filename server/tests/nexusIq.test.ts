import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { setAiProvider } from '../src/services/ai/index.js';

const request = supertest(app);

/**
 * Nexus IQ. The point of these tests is the split the feature rests on: the
 * figures come from the store's own tables and the provider only phrases them.
 * If an insight could ever assert something the evidence does not support, the
 * feature is fabricating, and that is what these assertions guard.
 */
describe('Nexus IQ: insights, chat and metering', () => {
  const stamp = Date.now();
  const merchantAEmail = `iq_a_${stamp}@nexus.io`;
  const merchantBEmail = `iq_b_${stamp}@nexus.io`;
  const password = 'Password123!';

  let cookieA: string;
  let cookieB: string;
  let storeAId: string;
  let productA: any;

  beforeAll(async () => {
    const resA = await request.post('/api/auth/register').send({
      name: 'IQ Merchant A', email: merchantAEmail, password, storeName: `IQ Store A ${stamp}`,
    });
    expect(resA.status).toBe(201);
    cookieA = resA.headers['set-cookie'][0];
    storeAId = resA.body.data.store.id;

    const resB = await request.post('/api/auth/register').send({
      name: 'IQ Merchant B', email: merchantBEmail, password, storeName: `IQ Store B ${stamp}`,
    });
    expect(resB.status).toBe(201);
    cookieB = resB.headers['set-cookie'][0];

    // A product with stock, so store A has something to say about itself.
    const prod = await request.post('/api/products').set('Cookie', [cookieA]).send({
      title: `IQ Widget ${stamp}`, price: 25, sku: `SKU-IQ-${stamp}`, inventory: 3,
    });
    expect(prod.status).toBe(201);
    productA = prod.body.data;

    // A product with no stock, so store A keeps a finding even after the
    // restock test clears the low-stock one.
    const empty = await request.post('/api/products').set('Cookie', [cookieA]).send({
      title: `IQ Sold Out ${stamp}`, price: 15, sku: `SKU-IQ-OOS-${stamp}`, inventory: 0,
    });
    expect(empty.status).toBe(201);

    // Store A gets a subscription so the usage summary has a plan name to
    // report. It buys no headroom — nothing caps Nexus IQ — but a subscribed
    // store is the ordinary case and the suite should exercise it.
    const plan = await prisma.subscriptionPlan.create({
      data: {
        code: `iq-test-${stamp}`,
        name: 'IQ Test Plan',
        description: 'Headroom for the Nexus IQ suite.',
        monthlyPrice: 0,
        annualPrice: 0,
        aiTokensPerMonth: 1_000_000,
      },
    });
    await prisma.subscription.create({
      data: {
        storeId: storeAId,
        planId: plan.id,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  });

  afterAll(() => setAiProvider(null));

  describe('access', () => {
    it('refuses an unauthenticated caller on every route', async () => {
      for (const [method, path] of [
        ['get', '/api/iq/insights'],
        ['post', '/api/iq/insights/refresh'],
        ['get', '/api/iq/conversations'],
        ['get', '/api/iq/usage'],
      ] as const) {
        const res = await (request as any)[method](path);
        expect(res.status).toBe(401);
      }
    });
  });

  describe('insights are computed from store data', () => {
    it('reports the store its own figures, and records the evidence behind each one', async () => {
      const res = await request.post('/api/iq/insights/refresh').set('Cookie', [cookieA]);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Every insight carries the figures it was derived from.
      for (const insight of res.body.data) {
        expect(insight.evidence).toBeTruthy();
        expect(Object.keys(insight.evidence).length).toBeGreaterThan(0);
      }
    });

    it('labels the output with the provider that produced it', async () => {
      const res = await request.get('/api/iq/insights').set('Cookie', [cookieA]);
      expect(res.status).toBe(200);
      expect(res.body.meta.provider).toBe('stub');
      // The UI relies on this to avoid implying a model is running.
      expect(res.body.meta.isLive).toBe(false);
    });

    it('raises a low-stock insight only when stock is actually low', async () => {
      const before = await request.get('/api/iq/insights').set('Cookie', [cookieA]);
      const lowBefore = before.body.data.find((i: any) => i.kind === 'LOW_STOCK');
      expect(lowBefore).toBeTruthy();
      expect(lowBefore.evidence.count).toBeGreaterThan(0);

      // Restock above the threshold; the finding must disappear.
      await request
        .post(`/api/inventory/${productA.id}/adjust`)
        .set('Cookie', [cookieA])
        .send({ changeQuantity: 500, reason: 'IQ test restock' });

      const after = await request.post('/api/iq/insights/refresh').set('Cookie', [cookieA]);
      expect(after.status).toBe(200);
      expect(after.body.data.find((i: any) => i.kind === 'LOW_STOCK')).toBeUndefined();
    });

    it('tells an empty store its catalogue is empty, and says nothing else', async () => {
      const res = await request.post('/api/iq/insights/refresh').set('Cookie', [cookieB]);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].kind).toBe('NO_PRODUCTS');
    });

    it('replaces the previous set rather than accumulating stale findings', async () => {
      const first = await request.post('/api/iq/insights/refresh').set('Cookie', [cookieA]);
      const second = await request.post('/api/iq/insights/refresh').set('Cookie', [cookieA]);
      expect(second.body.data.length).toBe(first.body.data.length);
    });

    it('never shows one store another store insights', async () => {
      const a = await request.get('/api/iq/insights').set('Cookie', [cookieA]);
      const b = await request.get('/api/iq/insights').set('Cookie', [cookieB]);
      const aIds = a.body.data.map((i: any) => i.id);
      for (const insight of b.body.data) {
        expect(aIds).not.toContain(insight.id);
      }
    });

    it('will not let one store dismiss another store insight', async () => {
      const a = await request.get('/api/iq/insights').set('Cookie', [cookieA]);
      const target = a.body.data[0];

      const res = await request
        .patch(`/api/iq/insights/${target.id}/dismiss`)
        .set('Cookie', [cookieB]);
      expect(res.status).toBe(404);

      const still = await request.get('/api/iq/insights').set('Cookie', [cookieA]);
      expect(still.body.data.map((i: any) => i.id)).toContain(target.id);
    });

    it('drops a dismissed insight from the feed', async () => {
      const before = await request.get('/api/iq/insights').set('Cookie', [cookieA]);
      const target = before.body.data[0];

      const res = await request
        .patch(`/api/iq/insights/${target.id}/dismiss`)
        .set('Cookie', [cookieA]);
      expect(res.status).toBe(200);

      const after = await request.get('/api/iq/insights').set('Cookie', [cookieA]);
      expect(after.body.data.map((i: any) => i.id)).not.toContain(target.id);
    });
  });

  describe('chat', () => {
    let conversationId: string;

    it('creates a conversation', async () => {
      const res = await request.post('/api/iq/conversations').set('Cookie', [cookieA]);
      expect(res.status).toBe(201);
      conversationId = res.body.data.id;
    });

    it('answers from the store data and names the thread after the first question', async () => {
      const res = await request
        .post(`/api/iq/conversations/${conversationId}/messages`)
        .set('Cookie', [cookieA])
        .send({ content: 'How many products do I have?' });

      expect(res.status).toBe(201);
      expect(res.body.data.assistantMessage.content).toContain('products');
      expect(res.body.meta.isLive).toBe(false);

      const convo = await request
        .get(`/api/iq/conversations/${conversationId}`)
        .set('Cookie', [cookieA]);
      expect(convo.body.data.title).toContain('How many products');
      expect(convo.body.data.messages).toHaveLength(2);
    });

    it('declines a question the store data cannot answer instead of inventing one', async () => {
      const res = await request
        .post(`/api/iq/conversations/${conversationId}/messages`)
        .set('Cookie', [cookieA])
        .send({ content: 'What will the weather be in Lagos next Tuesday?' });

      expect(res.status).toBe(201);
      const answer: string = res.body.data.assistantMessage.content;
      expect(answer.toLowerCase()).toContain('without a language model');
      // It must not have produced a forecast.
      expect(answer.toLowerCase()).not.toContain('sunny');
    });

    it('rejects an empty message', async () => {
      const res = await request
        .post(`/api/iq/conversations/${conversationId}/messages`)
        .set('Cookie', [cookieA])
        .send({ content: '' });
      expect(res.status).toBe(400);
    });

    it('will not let one store read or post into another store conversation', async () => {
      const read = await request
        .get(`/api/iq/conversations/${conversationId}`)
        .set('Cookie', [cookieB]);
      expect(read.status).toBe(404);

      const write = await request
        .post(`/api/iq/conversations/${conversationId}/messages`)
        .set('Cookie', [cookieB])
        .send({ content: 'Show me their numbers' });
      expect(write.status).toBe(404);
    });

    it('deletes a conversation and its messages', async () => {
      const res = await request
        .delete(`/api/iq/conversations/${conversationId}`)
        .set('Cookie', [cookieA]);
      expect(res.status).toBe(200);

      const gone = await request
        .get(`/api/iq/conversations/${conversationId}`)
        .set('Cookie', [cookieA]);
      expect(gone.status).toBe(404);

      const orphans = await prisma.aiMessage.count({ where: { conversationId } });
      expect(orphans).toBe(0);
    });
  });

  describe('metering', () => {
    // Its own store, so these assertions are about metering rather than about
    // how much the tests above happened to spend.
    let cookieM: string;
    let storeMId: string;

    beforeAll(async () => {
      const res = await request.post('/api/auth/register').send({
        name: 'IQ Meter', email: `iq_m_${stamp}@nexus.io`, password,
        storeName: `IQ Meter Store ${stamp}`,
      });
      expect(res.status).toBe(201);
      cookieM = res.headers['set-cookie'][0];
      storeMId = res.body.data.store.id;
    });

    it('starts a store at zero and reports the period window', async () => {
      const res = await request.get('/api/iq/usage').set('Cookie', [cookieM]);
      expect(res.status).toBe(200);
      expect(res.body.data.tokensUsed).toBe(0);
      expect(res.body.data.periodStart).toBeTruthy();
      expect(res.body.data.periodEnd).toBeTruthy();
    });

    it('does not cap an unsubscribed store', async () => {
      const res = await request.get('/api/iq/usage').set('Cookie', [cookieM]);
      expect(res.status).toBe(200);
      // The cap is gone, so the summary has no allowance to report at all.
      expect(res.body.data.tokensAllowed).toBeUndefined();
      expect(res.body.data.remaining).toBeUndefined();
      expect(res.body.data.exceeded).toBeUndefined();
    });

    it('counts what the work actually spent', async () => {
      await request.post('/api/iq/insights/refresh').set('Cookie', [cookieM]);
      const res = await request.get('/api/iq/usage').set('Cookie', [cookieM]);
      expect(res.body.data.tokensUsed).toBeGreaterThan(0);
    });

    it('keeps answering however much the store has already spent', async () => {
      // Far more than any tier ever allowed. Nexus IQ is metered, not rationed,
      // so this must change nothing about whether a question is answered.
      await prisma.aiUsageEvent.create({
        data: {
          storeId: storeMId,
          kind: 'CHAT',
          provider: 'stub',
          model: 'stub-v1',
          tokensIn: 5_000_000,
          tokensOut: 0,
        },
      });

      const convo = await request.post('/api/iq/conversations').set('Cookie', [cookieM]);
      const answered = await request
        .post(`/api/iq/conversations/${convo.body.data.id}/messages`)
        .set('Cookie', [cookieM])
        .send({ content: 'How many orders do I have?' });

      expect(answered.status).toBe(201);
      expect(answered.body.data.assistantMessage.content).toBeTruthy();

      const after = await request
        .get(`/api/iq/conversations/${convo.body.data.id}`)
        .set('Cookie', [cookieM]);
      expect(after.body.data.messages).toHaveLength(2);

      const refresh = await request.post('/api/iq/insights/refresh').set('Cookie', [cookieM]);
      expect(refresh.status).toBe(200);
    });
  });
});
