import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { VoicePortal } from '@prisma/client';
import { app } from '../src/app.js';
import { setSpeakerEmbedder, type SpeakerEmbedder } from '../src/services/voice/embedder.js';
import { enrolVoice } from '../src/services/voice/speaker.service.js';
import { parseIntent, parseUtterance } from '../src/services/voice/intent.js';
import { searchCatalogue, spokenPrice, spokenList } from '../src/services/ai/shopping.service.js';
import { runIntent, runPlan, contextFor } from '../src/controllers/customerVoice.controller.js';

const request = supertest(app);

/**
 * The spoken shopping assistant.
 *
 * The intent parser gets the most attention here, and deliberately so: it is
 * the component that decides whether a sentence spends money. A model that
 * mishears a search as a confirmation is not a wording bug, it is a purchase
 * nobody asked for, so the cases below are mostly about the boundary between
 * "find me" and "yes, buy it".
 */
describe('Shopping assistant: intent, catalogue and the confirmation gate', () => {
  const stamp = Date.now();
  const password = 'Password123!';

  let shopperCookie: string;
  let shopperId: string;

  function fakeEmbedder(): SpeakerEmbedder {
    return {
      name: 'fake',
      model: 'fake-v1',
      isNeural: false,
      unavailableReason: () => null,
      async embed(samples: Float32Array) {
        if (samples.length < 100) return null;
        const speaker = Math.round(samples[0] * 1000);
        const jitter = samples[1];
        const base = [1, 0.5, 0.25, 0.1, 0.05, 0, 0, 0];
        const v = base.map((b, i) => b * Math.cos(speaker + i) + jitter * Math.sin(i + 1));
        const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
        return Float32Array.from(v.map(x => x / n));
      },
    };
  }

  function clipsFor(speaker: number, count: number) {
    return Array.from({ length: count }, (_, i) => {
      const samples = new Float32Array(16_000);
      samples[0] = speaker / 1000;
      samples[1] = i * 0.01;
      for (let s = 2; s < samples.length; s++) samples[s] = Math.sin(s / 50) * 0.3;
      return { samples, condition: i < 2 ? 'close' : 'far' };
    });
  }

  function wavOf(samples: Float32Array): Buffer {
    const header = Buffer.alloc(44);
    const body = Buffer.alloc(samples.length * 2);
    header.write('RIFF', 0, 'ascii');
    header.writeUInt32LE(36 + body.length, 4);
    header.write('WAVE', 8, 'ascii');
    header.write('fmt ', 12, 'ascii');
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(16_000, 24);
    header.writeUInt32LE(32_000, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36, 'ascii');
    header.writeUInt32LE(body.length, 40);
    for (let i = 0; i < samples.length; i++) {
      body.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32768))), i * 2);
    }
    return Buffer.concat([header, body]);
  }

  beforeAll(async () => {
    setSpeakerEmbedder(fakeEmbedder());

    const merchant = await request.post('/api/auth/register').send({
      name: 'Shop Merchant',
      email: `shop_m_${stamp}@nexus.io`,
      password,
      storeName: `Shop Store ${stamp}`,
    });
    const merchantCookie = merchant.headers['set-cookie'][0];

    for (const [title, price, category] of [
      ['Merino Wool Jumper', 85, 'Apparel'],
      ['Cotton Crew Jumper', 45, 'Apparel'],
      ['Leather Weekend Bag', 220, 'Bags'],
    ] as const) {
      await request.post('/api/products').set('Cookie', [merchantCookie]).send({
        title: `${title} ${stamp}`,
        description: `A very nice ${title.toLowerCase()} for testing.`,
        price,
        category,
        sku: `SKU-SHOP-${title.replace(/\W/g, '')}-${stamp}`,
        inventory: 7,
      });
    }

    const shopper = await request.post('/api/auth/register').send({
      name: 'Voice Shopper',
      email: `shop_c_${stamp}@example.com`,
      password,
      userType: 'CUSTOMER',
    });
    expect(shopper.status).toBe(201);
    shopperCookie = shopper.headers['set-cookie'][0];
    shopperId = shopper.body.data.user.id;

    await enrolVoice(shopperId, VoicePortal.CUSTOMER, clipsFor(1, 4));
  });

  afterAll(() => setSpeakerEmbedder(null));

  describe('intent parsing', () => {
    it('reads a search with a price ceiling', () => {
      const intent = parseIntent('Nexus, find me a wool jumper under fifty');
      expect(intent.kind).toBe('SEARCH');
      expect(intent.query).toContain('wool');
      expect(intent.query).toContain('jumper');
      expect(intent.maxPrice).toBe(50);
      // The assistant's own name must not end up in the search terms.
      expect(intent.query).not.toContain('nexus');
    });

    it('reads a quantity and an ordinal together', () => {
      const intent = parseIntent('add two of the first one to my cart');
      expect(intent.kind).toBe('ADD_TO_CART');
      expect(intent.quantity).toBe(2);
      expect(intent.ordinal).toBe(1);
    });

    it('does not mistake a price ceiling for a quantity', () => {
      const intent = parseIntent('show me bags under 200');
      expect(intent.kind).toBe('SEARCH');
      expect(intent.maxPrice).toBe(200);
      expect(intent.quantity ?? 1).toBe(1);
    });

    it('treats a bare noun phrase as a search', () => {
      expect(parseIntent('leather weekend bag').kind).toBe('SEARCH');
    });

    it('recognises the cart questions', () => {
      expect(parseIntent('what is in my bag').kind).toBe('REVIEW_CART');
      expect(parseIntent('empty my cart').kind).toBe('CLEAR_CART');
      expect(parseIntent('remove the jumper from my cart').kind).toBe('REMOVE_FROM_CART');
    });

    it('recognises checkout without placing anything', () => {
      for (const phrase of ['check out', 'checkout', 'place my order', 'buy it']) {
        expect(parseIntent(phrase).kind).toBe('CHECKOUT');
      }
    });

    it('matches confirmation only at the start of a sentence', () => {
      expect(parseIntent('yes').kind).toBe('CONFIRM');
      expect(parseIntent('yes please go ahead').kind).toBe('CONFIRM');

      // "yes" buried in a sentence must not confirm a purchase, and a request
      // that merely contains the word is still the request it looks like.
      expect(parseIntent('do you have anything in yes blue').kind).not.toBe('CONFIRM');
    });

    it('does not let a confirmation smuggle a basket change past the gate', () => {
      // "yes, add ten more" confirms what was already quoted; it must not be
      // read as an add, because the quoted total would then be wrong.
      const intent = parseIntent('yes add ten more');
      expect(intent.kind).toBe('CONFIRM');
      expect(intent.quantity).toBeUndefined();
    });

    it('recognises a cancellation', () => {
      for (const phrase of ['no', 'cancel', 'never mind', 'stop']) {
        expect(parseIntent(phrase).kind).toBe('CANCEL');
      }
    });

    it('gives up rather than guessing', () => {
      // Too short to be a product name, and Whisper's usual hallucination on
      // silence ("you", "thank you") is all stop words, so both land here
      // rather than becoming a search for noise.
      expect(parseIntent('uh').kind).toBe('UNKNOWN');
      expect(parseIntent('you').kind).toBe('UNKNOWN');
    });

    it('searches a bare phrase rather than refusing it', () => {
      // "leather weekend bag" has no verb but is obviously a search; treating
      // it as unrecognised would make the assistant feel broken. A phrase that
      // matches nothing is answered with "I could not find anything for ...",
      // which at least tells the shopper what was heard.
      expect(parseIntent('merino wool jumper').kind).toBe('SEARCH');
    });

    /**
     * Follow-ups. These are the sentences a shopper says *second*, and every
     * one of them used to dead-end: the price question fell through to the
     * catch-all, and the refinement was searched for literally, which answered
     * "I could not find anything for anything cheaper".
     */
    it('reads a question about the thing just shown', () => {
      expect(parseIntent('how much is it?')).toMatchObject({
        kind: 'PRODUCT_DETAIL',
        detail: 'price',
      });
      expect(parseIntent('is it in stock?')).toMatchObject({
        kind: 'PRODUCT_DETAIL',
        detail: 'stock',
      });
      expect(parseIntent('tell me about the second one')).toMatchObject({
        kind: 'PRODUCT_DETAIL',
        detail: 'general',
        ordinal: 2,
      });
    });

    it('reads a refinement as a refinement, not as a search for its words', () => {
      expect(parseIntent('do you have anything cheaper?')).toMatchObject({
        kind: 'REFINE',
        direction: 'cheaper',
      });
      expect(parseIntent('something more expensive')).toMatchObject({
        kind: 'REFINE',
        direction: 'dearer',
      });
    });

    it('does not let a refinement hijack an explicit instruction', () => {
      // "add the cheaper one" is an add. Matching the refinement first would
      // turn an instruction to buy into a browse.
      expect(parseIntent('add the cheaper one').kind).toBe('ADD_TO_CART');
    });
  });

  /**
   * What a "yes" means.
   *
   * The assistant asks questions — "shall I add it to your bag?", "shall I
   * check you out?" — and used to refuse its own offers, because `CONFIRM`
   * only ever knew about a pending checkout. A shopper answering the question
   * they were just asked got "There is nothing waiting to be confirmed", which
   * is the single most unintelligent thing this feature could do.
   */
  describe('a yes answers the question that was actually asked', () => {
    const line = {
      productId: 'p-test',
      variantId: 'v-test',
      title: 'Test Line',
      quantity: 1,
      price: 40,
      storeId: 'store-test',
      storeName: 'Test Store',
    };

    it('adds the product after the assistant offered to add it', async () => {
      const context = contextFor(`offer-add-${stamp}`);
      const { results: found } = await searchCatalogue('merino wool', { limit: 5 });
      expect(found.length).toBeGreaterThan(0);

      // Stand in for the single-result search that makes the offer.
      context.lastResults = [found[0]];
      context.pendingOffer = { kind: 'ADD', productId: found[0].id, quantity: 1 };

      const turn = await runIntent({ kind: 'CONFIRM' }, context, [], 'USD');
      expect(turn.action?.type).toBe('ADD');
      expect(turn.reply).toMatch(/added/i);
      // Consumed, so a second yes does not add it twice.
      expect(context.pendingOffer).toBeNull();
    });

    it('reads the order back after the assistant offered to check out', async () => {
      const context = contextFor(`offer-checkout-${stamp}`);
      context.pendingOffer = { kind: 'CHECKOUT' };

      const turn = await runIntent({ kind: 'CONFIRM' }, context, [line], 'USD');
      expect(turn.action).toMatchObject({ type: 'CHECKOUT', stage: 'SUMMARY' });
      // Still a question, not a purchase: the money gate is untouched.
      expect(turn.reply).toMatch(/say yes/i);
      expect(context.pendingCheckout).not.toBeNull();
    });

    it('only moves the shopper to payment on the second yes', async () => {
      const context = contextFor(`two-step-${stamp}`);

      const summary = await runIntent({ kind: 'CHECKOUT' }, context, [line], 'USD');
      expect(summary.action).toMatchObject({ type: 'CHECKOUT', stage: 'SUMMARY' });

      const go = await runIntent({ kind: 'CONFIRM' }, context, [line], 'USD');
      expect(go.action).toMatchObject({ type: 'CHECKOUT', stage: 'GO' });
      expect(go.reply).toMatch(/taking you to payment/i);
    });

    it('says so plainly when nothing was asked', async () => {
      const context = contextFor(`nothing-${stamp}`);
      const turn = await runIntent({ kind: 'CONFIRM' }, context, [line], 'USD');
      expect(turn.action).toBeUndefined();
      expect(turn.reply).toMatch(/had not asked/i);
    });

    it('leaves no stale question behind after a confirmed checkout', async () => {
      const context = contextFor(`stale-${stamp}`);
      // The bag was read back (offering checkout) and then checkout ran.
      context.pendingOffer = { kind: 'CHECKOUT' };
      await runIntent({ kind: 'CHECKOUT' }, context, [line], 'USD');
      await runIntent({ kind: 'CONFIRM' }, context, [line], 'USD');

      // That yes was spent. Another one must not re-answer the old offer.
      const extra = await runIntent({ kind: 'CONFIRM' }, context, [line], 'USD');
      expect(extra.action).toBeUndefined();
      expect(extra.reply).toMatch(/had not asked/i);
    });

    it('a cancellation clears the offer as well as the checkout', async () => {
      const context = contextFor(`cancel-${stamp}`);
      context.pendingOffer = { kind: 'CHECKOUT' };

      const cancelled = await runIntent({ kind: 'CANCEL' }, context, [line], 'USD');
      expect(cancelled.reply).toMatch(/cancelled/i);

      const after = await runIntent({ kind: 'CONFIRM' }, context, [line], 'USD');
      expect(after.action).toBeUndefined();
    });

    it('still refuses a yes when the basket moved under it', async () => {
      const context = contextFor(`moved-${stamp}`);
      await runIntent({ kind: 'CHECKOUT' }, context, [line], 'USD');

      // The shopper added something between the read-back and the yes.
      const changed = [line, { ...line, variantId: 'v-other', quantity: 2 }];
      const turn = await runIntent({ kind: 'CONFIRM' }, context, changed, 'USD');

      expect(turn.action).toBeUndefined();
      expect(turn.reply).toMatch(/bag changed/i);
    });
  });

  describe('follow-up questions are answered from what was just shown', () => {
    it('answers a price question without searching again', async () => {
      const context = contextFor(`detail-${stamp}`);
      const { results: found } = await searchCatalogue('merino wool', { limit: 5 });
      context.lastResults = [found[0]];

      const turn = await runIntent(
        { kind: 'PRODUCT_DETAIL', detail: 'price' },
        context,
        [],
        'USD'
      );
      expect(turn.reply).toContain(found[0].title);
      expect(turn.reply).toContain(spokenPrice(found[0].price, 'USD'));
    });

    it('asks what for, rather than guessing, when nothing has been shown', async () => {
      const context = contextFor(`detail-empty-${stamp}`);
      const turn = await runIntent(
        { kind: 'PRODUCT_DETAIL', detail: 'price' },
        context,
        [],
        'USD'
      );
      expect(turn.reply).toMatch(/not shown you anything/i);
    });

    it('refines the last search instead of searching for the word cheaper', async () => {
      const context = contextFor(`refine-${stamp}`);
      const turn = await runIntent(
        { kind: 'REFINE', direction: 'cheaper' },
        context,
        [],
        'USD'
      );
      // Nothing searched yet, so it asks — the one thing it must not do is
      // report that it could not find anything called "cheaper".
      expect(turn.reply).toMatch(/cheaper than what/i);
      expect(turn.reply).not.toMatch(/could not find/i);
    });
  });

  describe('catalogue search reads real rows', () => {
    it('finds a product by words from its title', async () => {
      const { results } = await searchCatalogue('merino wool jumper');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Merino');
      // Cost price is the merchant's margin and must never reach a shopper.
      expect(JSON.stringify(results)).not.toContain('costPrice');
    });

    it('honours a price ceiling', async () => {
      const { results } = await searchCatalogue('jumper', { maxPrice: 50 });
      expect(results.every(r => r.price <= 50)).toBe(true);
    });

    it('returns nothing rather than something irrelevant', async () => {
      const { results } = await searchCatalogue('xyzzy quantum harpsichord');
      expect(results).toHaveLength(0);
    });
  });

  /**
   * One sentence, several instructions.
   *
   * "Find me a white wristwatch, add it to my bag and take me straight to
   * payment" used to be read as a single command: the first rule that matched
   * anywhere won, and every remaining word — "payment" included — was swept
   * into the search query.
   */
  describe('a sentence holding more than one instruction', () => {
    it('splits into the instructions it actually contains', () => {
      const steps = parseUtterance(
        'Find me a white wristwatch, add it to my bag and take me straight to payment.'
      );
      expect(steps.map(s => s.kind)).toEqual(['SEARCH', 'ADD_TO_CART', 'CHECKOUT']);
      expect(steps[0].query).toBe('white wristwatch');
    });

    it('keeps a single description in one piece', () => {
      // "red and white shirt" is one product, not two instructions. Splitting
      // on every "and" would shred it.
      const steps = parseUtterance('Find me a red and white shirt');
      expect(steps).toHaveLength(1);
      expect(steps[0].kind).toBe('SEARCH');
    });

    it('survives a word misheard in the middle of it', () => {
      // What the recogniser actually produced: "bag" as "bug", "me straight"
      // as "mystery". The plan must come out the same, because the clause that
      // adds refers back to the result rather than searching its own words.
      const steps = parseUtterance(
        'Find me a white wristwatch, add it to my bug and take mystery to payment.'
      );
      expect(steps.map(s => s.kind)).toEqual(['SEARCH', 'ADD_TO_CART', 'CHECKOUT']);
      expect(steps[0].query).toBe('white wristwatch');
      // The stray "bug" must not become something to go looking for.
      expect(steps[1].refersBack).toBe(true);
      expect(steps[1].query).toBeUndefined();
    });

    it('carries out the whole instruction when the product is unambiguous', async () => {
      const context = contextFor(`plan-${stamp}`);
      const outcome = await runPlan(
        parseUtterance('Find me a merino wool sweater, add it to my bag and take me to payment.'),
        context,
        [],
        'USD'
      );

      expect(outcome.action?.type).toBe('ADD');
      expect(outcome.reply).toMatch(/added/i);
      // The payment step could not also act this turn, so it became the
      // question the next yes answers.
      expect(outcome.reply).toMatch(/take you to payment/i);
      expect(context.pendingOffer).toEqual({ kind: 'CHECKOUT' });
    });

    it('stops and asks rather than adding one of several matches', async () => {
      const context = contextFor(`plan-ambiguous-${stamp}`);
      const outcome = await runPlan(
        parseUtterance('Find me a watch, add it to my bag and check out'),
        context,
        [],
        'USD'
      );

      // Four watches match; picking one would be a purchase nobody chose.
      expect(outcome.action).toBeUndefined();
      expect(outcome.reply).toMatch(/which/i);
      expect(context.pendingOffer).toBeNull();
    });
  });

  /**
   * What the catalogue is allowed to offer.
   *
   * The reply that prompted all of this: "find me a white wristwatch" was
   * answered with a lounge chair, a vase and a moisturiser, announced as
   * "3 that could match". Nothing matched both words, the fallback ORed the
   * terms, and "white" appears in those three descriptions.
   */
  describe('search answers the question that was asked', () => {
    it('does not offer a product that merely mentions one of the words', async () => {
      const found = await searchCatalogue('white wristwatch');
      for (const product of found.results) {
        const names = `${product.title} ${product.category}`.toLowerCase();
        // Every result has to be named by a surviving term, not just contain
        // one somewhere in its body text.
        expect(names).toContain('watch');
      }
    });

    it('finds the watches a wristwatch means', async () => {
      // "wristwatch" never matched "Dive Watch": the catalogue word is inside
      // the spoken one, so containment runs the wrong way.
      const found = await searchCatalogue('wristwatch');
      expect(found.results.length).toBeGreaterThan(0);
      expect(found.relaxed).toContainEqual({ from: 'wristwatch', to: 'watch' });
    });

    it('says which word it had to give up', async () => {
      const found = await searchCatalogue('white wristwatch');
      expect(found.exact).toBe(false);
      expect(found.dropped).toContain('white');
    });

    it('reports an exact match as exact', async () => {
      const found = await searchCatalogue('merino wool');
      expect(found.exact).toBe(true);
      expect(found.dropped).toEqual([]);
    });

    it('returns nothing at all rather than something irrelevant', async () => {
      const found = await searchCatalogue('xyzzy quantum harpsichord');
      expect(found.results).toHaveLength(0);
    });
  });

  describe('spoken formatting', () => {
    it('reads whole amounts without trailing zeros', () => {
      expect(spokenPrice(12)).toBe('$12');
      expect(spokenPrice(12.5)).toBe('$12.50');
    });

    it('joins a list the way a person would say it', () => {
      expect(spokenList(['a'])).toBe('a');
      expect(spokenList(['a', 'b'])).toBe('a and b');
      expect(spokenList(['a', 'b', 'c'])).toBe('a, b and c');
    });
  });

  describe('the HTTP surface', () => {
    it('refuses a guest', async () => {
      const res = await request.post('/api/shop/voice/command');
      expect(res.status).toBe(401);
    });

    it('refuses a merchant account', async () => {
      const merchant = await request.post('/api/auth/register').send({
        name: 'Nosy Merchant',
        email: `shop_nosy_${stamp}@nexus.io`,
        password,
        storeName: `Nosy Store ${stamp}`,
      });
      const res = await request
        .get('/api/shop/voice/status')
        .set('Cookie', [merchant.headers['set-cookie'][0]]);
      expect(res.status).toBe(403);
    });

    it('keeps the shopping profile separate from the seller one', async () => {
      const res = await request.get('/api/shop/voice/status').set('Cookie', [shopperCookie]);
      expect(res.status).toBe(200);
      expect(res.body.data.enrolled).toBe(true);

      // The same person enrolling to shop must not thereby be enrolled to run
      // a store, which is why the profile key is (user, portal).
      const seller = await request.get('/api/iq/voice/status').set('Cookie', [shopperCookie]);
      expect(seller.status).toBe(403);
    });

    it('declines to answer a voice that is not the registered one', async () => {
      const [clip] = clipsFor(900, 1);
      const res = await request
        .post('/api/shop/voice/command')
        .set('Cookie', [shopperCookie])
        .attach('audio', wavOf(clip.samples), 'command.wav');

      expect(res.status).toBe(403);
      expect(res.body.data.verification.accepted).toBe(false);
      // Refused before transcription, so an unrecognised voice is never
      // written down.
      expect(res.body.data.transcript).toBeUndefined();
    });

    it('rejects a silent clip before spending a model on it', async () => {
      const res = await request
        .post('/api/shop/voice/command')
        .set('Cookie', [shopperCookie])
        .attach('audio', wavOf(new Float32Array(16_000)), 'command.wav');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/silent/i);
    });

    it('exposes a product the assistant named, without merchant-only fields', async () => {
      const { results } = await searchCatalogue(`Leather Weekend Bag ${stamp}`);
      const mine = results.find(r => r.title.includes(String(stamp)));
      expect(mine).toBeTruthy();

      const res = await request
        .get(`/api/shop/voice/product/${mine!.id}`)
        .set('Cookie', [shopperCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toContain('Leather');
      expect(res.body.data.costPrice).toBeUndefined();
    });

    it('404s a product that is not purchasable', async () => {
      const res = await request
        .get('/api/shop/voice/product/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [shopperCookie]);
      expect(res.status).toBe(404);
    });
  });

  /**
   * The typed surface.
   *
   * It exists so the assistant works without a microphone, and it runs the
   * same parser and planner the spoken route does. These tests are therefore
   * about the two things that are genuinely different: who may reach it, and
   * that skipping the voice check did not also skip the confirmation gate.
   */
  describe('the typed surface', () => {
    it('refuses a guest', async () => {
      const res = await request.post('/api/shop/assistant/message').send({ message: 'hello' });
      expect(res.status).toBe(401);
    });

    it('refuses a merchant account', async () => {
      const merchant = await request.post('/api/auth/register').send({
        name: 'Typing Merchant',
        email: `shop_typing_${stamp}@nexus.io`,
        password,
        storeName: `Typing Store ${stamp}`,
      });
      const res = await request
        .post('/api/shop/assistant/message')
        .set('Cookie', [merchant.headers['set-cookie'][0]])
        .send({ message: 'what is in my bag?' });
      expect(res.status).toBe(403);
    });

    it('rejects an empty message', async () => {
      const res = await request
        .post('/api/shop/assistant/message')
        .set('Cookie', [shopperCookie])
        .send({ message: '   ' });
      expect(res.status).toBe(400);
    });

    it('rejects a message longer than the assistant will read', async () => {
      const res = await request
        .post('/api/shop/assistant/message')
        .set('Cookie', [shopperCookie])
        .send({ message: 'a'.repeat(501) });
      expect(res.status).toBe(400);
    });

    it('answers a typed search with products and no voice claim', async () => {
      const res = await request
        .post('/api/shop/assistant/message')
        .set('Cookie', [shopperCookie])
        .send({ message: `find me a Leather Weekend Bag ${stamp}`, cart: [], currency: 'USD' });

      expect(res.status).toBe(200);
      expect(res.body.data.transcript).toContain('Leather');
      expect(res.body.data.results.length).toBeGreaterThan(0);
      // Nothing was heard, so nothing may be reported as verified.
      expect(res.body.data.verification).toBeUndefined();
    });

    it('treats a malformed cart as an empty one rather than erroring', async () => {
      const res = await request
        .post('/api/shop/assistant/message')
        .set('Cookie', [shopperCookie])
        .send({ message: 'what is in my bag?', cart: 'not-a-list' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toMatch(/empty|nothing/i);
    });

    it('still asks before checking out, exactly as the spoken route does', async () => {
      // A synthetic line, like the unit tests above: the confirmation gate
      // reads the basket the page reports, not the catalogue.
      const cart = [
        {
          productId: 'p-typed',
          variantId: 'v-typed',
          title: 'Typed Line',
          quantity: 1,
          price: 40,
          storeId: 'store-typed',
          storeName: 'Typed Store',
        },
      ];

      const res = await request
        .post('/api/shop/assistant/message')
        .set('Cookie', [shopperCookie])
        .send({ message: 'check out', cart, currency: 'USD' });

      expect(res.status).toBe(200);
      // A read-back, not a purchase: only a separate yes may carry stage GO.
      expect(res.body.data.action?.stage).toBe('SUMMARY');
    });
  });
});
