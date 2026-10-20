import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { classify, answerPublicQuestion } from '../src/services/ai/concierge.service.js';

const request = supertest(app);

/**
 * Nexus IQ on the public pages.
 *
 * Two things are being tested, and the second matters more than the first.
 *
 * The first is that a visitor with no session at all gets a real answer about
 * Nexus — typed or spoken — because that is the point of the surface: the
 * landing page, pricing and contact are read by people deciding whether to
 * sign up, and answering them with "sign in first" answers the wrong question.
 *
 * The second is that opening that door did not open any other. This is the
 * only unauthenticated router in the API, so the suite pins the gated
 * surfaces shut alongside it: if `/iq` or `/shop/*` ever start answering an
 * anonymous caller, these tests fail here rather than in production.
 */
describe('Public Nexus IQ: open to visitors, and only as far as the public data', () => {
  const stamp = Date.now();
  const password = 'Password123!';

  let liveMerchantId: string;

  beforeAll(async () => {
    const merchant = await request.post('/api/auth/register').send({
      name: 'Concierge Merchant',
      email: `concierge_${stamp}@nexus.io`,
      password,
      displayName: `Concierge Merchant ${stamp}`,
    });
    expect(merchant.status).toBe(201);
    const cookie = merchant.headers['set-cookie'][0];
    liveMerchantId = merchant.body.data.merchant.id;

    const product = await request
      .post('/api/products')
      .set('Cookie', [cookie])
      .send({
        title: 'Lagos Linen Shirt',
        description: 'A breathable linen shirt for the heat.',
        price: 42,
        sku: `LINEN-${stamp}`,
        category: 'Clothing',
        status: 'ACTIVE',
      });
    expect(product.status).toBe(201);

    await prisma.merchant.update({
      where: { id: liveMerchantId },
      data: { status: 'ACTIVE' },
    });
  });

  describe('it answers with no session', () => {
    it('takes a typed question from an anonymous visitor', async () => {
      const res = await request
        .post('/api/assistant/message')
        .send({ message: 'How do I list my products on Nexus?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.topic).toBe('SELL_ON_NEXUS');
      expect(res.body.data.reply).toMatch(/list/i);
      // Answers point somewhere, so the panel can offer the next step.
      expect(res.body.data.links.length).toBeGreaterThan(0);
    });

    it('reports that the public surface does no voice matching', async () => {
      const res = await request.get('/api/assistant/status');

      expect(res.status).toBe(200);
      expect(res.body.data.typing).toBe(true);
      // The honest half of the feature: out here any voice works, and the
      // panel tells the visitor so rather than implying a check it skips.
      expect(res.body.data.voice.verified).toBe(false);
    });

    it('refuses an empty question and an essay', async () => {
      const empty = await request.post('/api/assistant/message').send({ message: '   ' });
      expect(empty.status).toBe(400);

      const essay = await request
        .post('/api/assistant/message')
        .send({ message: 'x'.repeat(401) });
      expect(essay.status).toBe(400);
    });
  });

  describe('it quotes figures that exist', () => {
    it('reads plan prices from the rows that bill, not from copy', async () => {
      const starter = await prisma.subscriptionPlan.findUniqueOrThrow({
        where: { code: 'starter' },
      });

      const res = await request
        .post('/api/assistant/message')
        .send({ message: 'How much does a plan cost?' });

      expect(res.status).toBe(200);
      expect(res.body.data.topic).toBe('PRICING');
      // The figure a seller would actually be charged. A hard-coded copy of it
      // is how three surfaces came to quote three different Growth prices.
      expect(res.body.data.reply).toContain(String(Math.round(starter.monthlyPrice)));
      // Four advertised tiers, however many rows the table happens to hold.
      expect(res.body.data.reply).toMatch(/are 4 seller plans/);
    });

    /**
     * A bespoke plan is active and is not an offer.
     *
     * Reading "every active plan" is what made the development database answer
     * a visitor with thirty-five of them, a per-customer "Custom VIP Plan"
     * among them. Quoting one merchant's negotiated price to a stranger is the
     * part that would actually matter in production.
     */
    it('never quotes a plan that was not advertised', async () => {
      const bespoke = await prisma.subscriptionPlan.create({
        data: {
          code: `bespoke_${stamp}`,
          name: 'Secretly Negotiated Plan',
          description: 'One merchant only.',
          monthlyPrice: 1234,
          annualPrice: 12340,
          isActive: true,
          displayOrder: 0,
        },
      });

      try {
        const res = await request
          .post('/api/assistant/message')
          .send({ message: 'What plans do you offer?' });

        expect(res.status).toBe(200);
        expect(res.body.data.reply).not.toContain('Secretly Negotiated');
        expect(res.body.data.reply).not.toContain('1234');
      } finally {
        await prisma.subscriptionPlan.delete({ where: { id: bespoke.id } });
      }
    });

    it('searches the public catalogue and names a real listing', async () => {
      const res = await request
        .post('/api/assistant/message')
        .send({ message: 'Do you have any linen shirts?' });

      expect(res.status).toBe(200);
      expect(res.body.data.topic).toBe('PRODUCT_SEARCH');
      expect(res.body.data.results.length).toBeGreaterThan(0);
      expect(res.body.data.reply).toContain('Lagos Linen Shirt');
    });

    it('says plainly when it does not know, rather than inventing a policy', async () => {
      const res = await request
        .post('/api/assistant/message')
        .send({ message: 'Qwerty zxcvb plugh xyzzy' });

      expect(res.status).toBe(200);
      expect(res.body.data.topic).toBe('UNKNOWN');
      expect(res.body.data.reply).toMatch(/not sure|rather say so/i);
    });
  });

  describe('opening the public surface did not open the gated ones', () => {
    it('still refuses an anonymous caller on the merchant assistant', async () => {
      const res = await request.get('/api/iq/insights');
      expect(res.status).toBe(401);
    });

    it('still refuses an anonymous caller on the shopping assistant', async () => {
      const typed = await request
        .post('/api/shop/assistant/message')
        .send({ message: 'add two of the first one' });
      expect(typed.status).toBe(401);

      const spoken = await request.get('/api/shop/voice/status');
      expect(spoken.status).toBe(401);
    });

    /**
     * The structural guarantee behind the two tests above: a public answer is
     * computed from published plans and public listings, so there is no
     * account for an unidentified caller to reach. If a future topic starts
     * reading an order or a basket, this is the test that should stop it.
     */
    it('never returns account-shaped data', async () => {
      const questions = [
        'What is in my bag?',
        'Show me my orders',
        'What is my revenue this month?',
        'How many customers do I have?',
      ];

      // And it says so in those words rather than searching the catalogue for
      // the question. "Show me my orders" used to come back "I could not find
      // anything for my orders in the shop."
      const mine = await request
        .post('/api/assistant/message')
        .send({ message: 'Show me my orders' });
      expect(mine.body.data.topic).toBe('MY_ACCOUNT_DATA');
      expect(mine.body.data.reply).toMatch(/sign in/i);

      for (const message of questions) {
        const res = await request.post('/api/assistant/message').send({ message });
        expect(res.status).toBe(200);

        // Everything but the echo of what was asked. `transcript` is the
        // visitor's own sentence, so asserting against it would only prove the
        // visitor said "revenue", which is not the thing worth checking.
        const { transcript, ...answer } = res.body.data;
        expect(transcript).toBe(message);

        const body = JSON.stringify(answer);
        expect(body).not.toMatch(/\border(Number|Id)\b/i);
        expect(body).not.toMatch(/\bcustomerEmail\b/i);
        expect(body).not.toMatch(/\bmy (revenue|orders|customers)\b/i);
      }
    });
  });

  describe('the topic classifier', () => {
    it('reads a sentence for what it is actually asking', () => {
      // "sell" appears in both, and only one of them is a pricing question.
      expect(classify('How much does it cost to sell on Nexus?')).toBe('PRICING');
      expect(classify('I want to sell my products here')).toBe('SELL_ON_NEXUS');

      // "order" appears in both, and only one is about tracking.
      expect(classify('Where is my order?')).toBe('TRACK_ORDER');

      // Shared word, different question: one is a shopper, one is a seller.
      expect(classify('What do you sell?')).toBe('CATEGORIES');
      expect(classify('How do I list my products on Nexus?')).toBe('SELL_ON_NEXUS');

      expect(classify('Do I have to register my voice?')).toBe('VOICE');
      expect(classify('What is your office address?')).toBe('CONTACT');
      expect(classify('help')).toBe('HELP');
    });

    it('treats a lookup as a lookup only after the platform topics', async () => {
      expect(classify('Find me a linen shirt')).toBe('PRODUCT_SEARCH');

      // The lead-in is stripped, so the catalogue is searched for the product
      // rather than for the question wrapped around it.
      const answer = await answerPublicQuestion('Do you have any linen shirts?');
      expect(answer.results?.some(p => p.title === 'Lagos Linen Shirt')).toBe(true);
    });
  });
});
