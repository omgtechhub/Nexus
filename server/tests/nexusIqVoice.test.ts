import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { VoicePortal } from '@prisma/client';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { setSpeakerEmbedder, type SpeakerEmbedder } from '../src/services/voice/embedder.js';
import { enrolVoice, verifyVoice } from '../src/services/voice/speaker.service.js';
import { decodeWav, decodeToMono16k, peakOf, AudioDecodeError } from '../src/services/voice/audio.js';
import { computeProfitSummary, computePriceBenchmarks } from '../src/services/ai/margins.service.js';

const request = supertest(app);

/**
 * Nexus IQ's voice path and the margin figures it answers from.
 *
 * The speaker tests run against a deterministic fake embedder rather than the
 * 26 MB WeSpeaker model: the model's accuracy is WeSpeaker's business, while
 * what belongs here is the logic built on top of it — that a threshold is
 * measured rather than guessed, that an impostor is turned away, and that an
 * embedder which cannot run fails *open* rather than silently making the
 * assistant deaf.
 */

/**
 * A fake embedder whose vectors are controlled by the audio's first sample.
 *
 * Each "speaker" is a direction in 8-space; samples of the same speaker differ
 * only by a small jitter, so leave-one-out behaves as it does with real
 * embeddings without needing real audio.
 */
function fakeEmbedder(overrides: Partial<SpeakerEmbedder> = {}): SpeakerEmbedder {
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
      // Rotate the base vector by the speaker id so different speakers point
      // in genuinely different directions.
      const v = base.map((b, i) => b * Math.cos(speaker + i) + jitter * Math.sin(i + 1));
      const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      return Float32Array.from(v.map(x => x / n));
    },
    ...overrides,
  };
}

/** `count` clips of one speaker, each with its own small jitter. */
function clipsFor(speaker: number, count: number, spread = 0.01) {
  return Array.from({ length: count }, (_, i) => {
    const samples = new Float32Array(16_000);
    samples[0] = speaker / 1000;
    samples[1] = i * spread;
    for (let s = 2; s < samples.length; s++) samples[s] = Math.sin(s / 50) * 0.3;
    return { samples, condition: i < 2 ? 'close' : 'far' };
  });
}

/** A valid 16-bit PCM WAV, as the browser capture path produces. */
function wavOf(samples: Float32Array, sampleRate = 16_000): Buffer {
  const header = Buffer.alloc(44);
  const body = Buffer.alloc(samples.length * 2);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + body.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(body.length, 40);
  for (let i = 0; i < samples.length; i++) {
    body.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32768))), i * 2);
  }
  return Buffer.concat([header, body]);
}

describe('Nexus IQ voice: identity, audio and margins', () => {
  const stamp = Date.now();
  const password = 'Password123!';
  let merchantCookie: string;
  let merchantUserId: string;
  let storeId: string;

  beforeAll(async () => {
    setSpeakerEmbedder(fakeEmbedder());

    const merchant = await request.post('/api/auth/register').send({
      name: 'Voice Merchant',
      email: `iq_voice_${stamp}@nexus.io`,
      password,
      storeName: `IQ Voice Store ${stamp}`,
    });
    expect(merchant.status).toBe(201);
    merchantCookie = merchant.headers['set-cookie'][0];
    merchantUserId = merchant.body.data.user.id;
    storeId = merchant.body.data.store.id;
  });

  afterAll(() => setSpeakerEmbedder(null));

  describe('enrolment measures a threshold rather than assuming one', () => {
    it('refuses to build a profile from too few samples', async () => {
      await expect(
        enrolVoice(merchantUserId, VoicePortal.SELLER, clipsFor(1, 2))
      ).rejects.toThrow(/at least/i);
    });

    it('derives the bar from held-out samples and stores it', async () => {
      const result = await enrolVoice(merchantUserId, VoicePortal.SELLER, clipsFor(1, 4));

      expect(result.samples).toBe(4);
      // Measured, not a constant: it has to sit below the weakest held-out
      // score, which is the whole point of the leave-one-out pass.
      expect(result.weakestHeldOut).not.toBeNull();
      expect(result.threshold).toBeLessThan(result.weakestHeldOut!);
      expect(result.threshold).toBeGreaterThanOrEqual(0.4);
      expect(result.threshold).toBeLessThanOrEqual(0.9);

      const stored = await prisma.voiceProfile.findUnique({
        where: { userId_portal: { userId: merchantUserId, portal: VoicePortal.SELLER } },
      });
      expect(stored?.threshold).toBe(result.threshold);
      expect(stored?.sampleCount).toBe(4);
      // One anchor per recording condition, so a voice heard from further away
      // is compared against how it sounds from further away.
      expect((stored?.anchors as unknown as number[][]).length).toBe(2);
    });

    it('records that a non-neural embedder produced the profile', async () => {
      const stored = await prisma.voiceProfile.findUnique({
        where: { userId_portal: { userId: merchantUserId, portal: VoicePortal.SELLER } },
      });
      // The fake is not neural, and the row says so rather than letting the UI
      // imply an accuracy this deployment does not have.
      expect(stored?.isNeural).toBe(false);
      expect(stored?.embedder).toBe('fake');
    });
  });

  describe('verification', () => {
    it('accepts the enrolled speaker', async () => {
      const [clip] = clipsFor(1, 1, 0.005);
      const decision = await verifyVoice(merchantUserId, VoicePortal.SELLER, clip.samples);

      expect(decision.undetermined).toBeNull();
      expect(decision.accepted).toBe(true);
      expect(decision.similarity).toBeGreaterThanOrEqual(decision.threshold);
    });

    it('turns away a different speaker', async () => {
      const [clip] = clipsFor(900, 1);
      const decision = await verifyVoice(merchantUserId, VoicePortal.SELLER, clip.samples);

      expect(decision.undetermined).toBeNull();
      expect(decision.accepted).toBe(false);
      expect(decision.similarity).toBeLessThan(decision.threshold);
    });

    it('fails open when the embedder cannot run, rather than going deaf', async () => {
      setSpeakerEmbedder(fakeEmbedder({ unavailableReason: () => 'model not installed' }));
      const [clip] = clipsFor(900, 1);
      const decision = await verifyVoice(merchantUserId, VoicePortal.SELLER, clip.samples);

      // "I could not tell" must not mean "not you": a missing model would
      // otherwise silently lock every merchant out of a feature they enrolled
      // for. This gates activation, not access, so accepting is the safe side.
      expect(decision.accepted).toBe(true);
      expect(decision.undetermined).toBe('model not installed');
      setSpeakerEmbedder(fakeEmbedder());
    });

    it('fails open for a user who has not enrolled', async () => {
      const other = await request.post('/api/auth/register').send({
        name: 'Unenrolled Merchant',
        email: `iq_noenrol_${stamp}@nexus.io`,
        password,
        storeName: `IQ No Enrol ${stamp}`,
      });
      const [clip] = clipsFor(1, 1);
      const decision = await verifyVoice(other.body.data.user.id, VoicePortal.SELLER, clip.samples);

      expect(decision.accepted).toBe(true);
      expect(decision.undetermined).toBe('no voice enrolled');
    });

    it('keeps profiles separate per portal', async () => {
      // Enrolling as a seller must not silently unlock the admin console.
      const decision = await verifyVoice(merchantUserId, VoicePortal.ADMIN, clipsFor(1, 1)[0].samples);
      expect(decision.undetermined).toBe('no voice enrolled');
    });
  });

  describe('the HTTP surface', () => {
    it('refuses every voice route without a session', async () => {
      for (const route of ['/api/iq/voice/status', '/api/iq/voice/command']) {
        const res = await request.get(route);
        expect([401, 404]).toContain(res.status);
      }
      const post = await request.post('/api/iq/voice/command');
      expect(post.status).toBe(401);
    });

    it('reports enrolment status and which engine produced it', async () => {
      const res = await request.get('/api/iq/voice/status').set('Cookie', [merchantCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.enrolled).toBe(true);
      expect(res.body.data.engine).toBeTruthy();
      expect(res.body.data.transcriber.local).toBe(true);
    });

    it('rejects a silent clip before spending a model on it', async () => {
      const silence = new Float32Array(16_000);
      const res = await request
        .post('/api/iq/voice/command')
        .set('Cookie', [merchantCookie])
        .attach('audio', wavOf(silence), 'clip.wav');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/silent/i);
    });

    it('rejects a clip too short to identify anyone from', async () => {
      const brief = new Float32Array(3_000).fill(0.3);
      const res = await request
        .post('/api/iq/voice/command')
        .set('Cookie', [merchantCookie])
        .attach('audio', wavOf(brief), 'clip.wav');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/at least a second/i);
    });

    it('declines to answer a voice that is not the enrolled one', async () => {
      const [clip] = clipsFor(900, 1);
      const res = await request
        .post('/api/iq/voice/command')
        .set('Cookie', [merchantCookie])
        .attach('audio', wavOf(clip.samples), 'clip.wav');

      expect(res.status).toBe(403);
      expect(res.body.data.verification.accepted).toBe(false);
      // Refused before transcription, so a stranger's words never reach the
      // merchant's conversation history.
      expect(res.body.data.transcript).toBeUndefined();
    });

    it('lets the merchant delete the profile and start again', async () => {
      const res = await request.delete('/api/iq/voice/enrol').set('Cookie', [merchantCookie]);
      expect(res.status).toBe(200);
      expect(res.body.data.removed).toBe(true);

      const after = await request.get('/api/iq/voice/status').set('Cookie', [merchantCookie]);
      expect(after.body.data.enrolled).toBe(false);
    });
  });

  describe('WAV decoding', () => {
    it('reads mono 16-bit PCM back to the samples that went in', () => {
      const original = Float32Array.from({ length: 1000 }, (_, i) => Math.sin(i / 10) * 0.5);
      const { samples, sampleRate, channels } = decodeWav(wavOf(original));

      expect(sampleRate).toBe(16_000);
      expect(channels).toBe(1);
      expect(samples.length).toBe(1000);
      // 16-bit quantisation, so exact equality is not available.
      for (let i = 0; i < 1000; i++) expect(Math.abs(samples[i] - original[i])).toBeLessThan(0.001);
    });

    it('resamples a browser that ignored the requested rate', () => {
      const at48k = new Float32Array(48_000).fill(0.4);
      const out = decodeToMono16k(wavOf(at48k, 48_000));
      expect(out.length).toBe(16_000);
      expect(peakOf(out)).toBeGreaterThan(0.3);
    });

    it('refuses something that is not a WAV', () => {
      expect(() => decodeWav(Buffer.alloc(100))).toThrow(AudioDecodeError);
    });
  });

  describe('profit and loss', () => {
    async function productWithCost(title: string, price: number, cost: number | null) {
      const res = await request.post('/api/products').set('Cookie', [merchantCookie]).send({
        title,
        price,
        ...(cost === null ? {} : { costPrice: cost }),
        sku: `SKU-M-${title.replace(/\W/g, '')}-${stamp}`,
        inventory: 100,
      });
      expect(res.status).toBe(201);
      return res.body.data.id as string;
    }

    async function sell(productId: string, quantity: number) {
      const order = await request.post('/api/orders').set('Cookie', [merchantCookie]).send({
        customerName: 'Margin Buyer',
        customerEmail: `margin_${stamp}@example.com`,
        items: [{ productId, quantity }],
        shippingAddress: {
          firstName: 'M', lastName: 'B', address1: '1 Margin Way',
          city: 'Lagos', state: 'LA', zip: '100001', country: 'NG',
        },
      });
      expect(order.status).toBe(201);
      await request
        .patch(`/api/orders/${order.body.data.id}`)
        .set('Cookie', [merchantCookie])
        .send({ paymentStatus: 'PAID' });
    }

    it('computes gross profit from recorded cost', async () => {
      const winner = await productWithCost('Profitable Thing', 100, 60);
      await sell(winner, 2);

      const summary = await computeProfitSummary(storeId);
      expect(summary.revenue).toBe(200);
      expect(summary.cost).toBe(120);
      expect(summary.profit).toBe(80);
      expect(summary.marginPercent).toBe(40);
      expect(summary.coverage).toBe(1);
    });

    it('reports a loss when cost exceeds price, and names the product', async () => {
      const loser = await productWithCost('Loss Leader', 50, 80);
      await sell(loser, 1);

      const summary = await computeProfitSummary(storeId);
      const flagged = summary.lossMakers.find(p => p.title === 'Loss Leader');
      expect(flagged).toBeTruthy();
      expect(flagged!.profit).toBe(-30);
      expect(summary.profit).toBe(50); // 80 earned, 30 given back
    });

    it('excludes uncosted revenue from profit instead of treating cost as zero', async () => {
      const unknown = await productWithCost('No Cost Recorded', 40, null);
      await sell(unknown, 3);

      const summary = await computeProfitSummary(storeId);

      // The 120 shows up in revenue but must not inflate profit: a missing
      // cost is unknown, not free, and assuming free flatters the figure in
      // exactly the direction a merchant would price against.
      // 200 profitable + 50 loss-making + 120 uncosted.
      expect(summary.revenue).toBe(370);
      expect(summary.uncostedRevenue).toBe(120);
      expect(summary.profit).toBe(50);
      expect(summary.productsMissingCost).toBeGreaterThanOrEqual(1);
      expect(summary.coverage).toBeLessThan(1);
    });

    it('ignores cancelled orders', async () => {
      const before = await computeProfitSummary(storeId);
      const product = await productWithCost('Cancelled Item', 70, 10);

      const order = await request.post('/api/orders').set('Cookie', [merchantCookie]).send({
        customerName: 'Cancel Buyer',
        customerEmail: `cancel_${stamp}@example.com`,
        items: [{ productId: product, quantity: 5 }],
        shippingAddress: {
          firstName: 'C', lastName: 'B', address1: '2 Cancel Road',
          city: 'Lagos', state: 'LA', zip: '100001', country: 'NG',
        },
      });
      await request
        .patch(`/api/orders/${order.body.data.id}`)
        .set('Cookie', [merchantCookie])
        .send({ paymentStatus: 'PAID', status: 'CANCELLED' });

      const after = await computeProfitSummary(storeId);
      expect(after.revenue).toBe(before.revenue);
    });
  });

  describe('price benchmarking', () => {
    it('declines to call a handful of listings a market', async () => {
      const benchmarks = await computePriceBenchmarks(storeId, 20);
      const thin = benchmarks.find(b => b.sampleSize < 3);

      // A median of two listings is not a market, and reporting one as though
      // it were is how a merchant cuts a price against a single outlier.
      if (thin) {
        expect(thin.position).toBe('unknown');
        expect(thin.marketMedian).toBeNull();
      }
    });

    it('places a price against other live stores when there are enough of them', async () => {
      const stampB = `${stamp}b`;
      const rival = await request.post('/api/auth/register').send({
        name: 'Rival Merchant',
        email: `iq_rival_${stampB}@nexus.io`,
        password,
        storeName: `IQ Rival ${stampB}`,
      });
      const rivalCookie = rival.headers['set-cookie'][0];

      for (const price of [100, 110, 120]) {
        await request.post('/api/products').set('Cookie', [rivalCookie]).send({
          title: `Rival Gadget ${price} ${stampB}`,
          price,
          category: 'Benchmarked',
          sku: `SKU-R-${price}-${stampB}`,
          inventory: 10,
        });
      }
      await request.post('/api/products').set('Cookie', [merchantCookie]).send({
        title: `My Gadget ${stampB}`,
        price: 200,
        category: 'Benchmarked',
        sku: `SKU-MINE-${stampB}`,
        inventory: 10,
      });

      const benchmarks = await computePriceBenchmarks(storeId, 30);
      const mine = benchmarks.find(b => b.category === 'Benchmarked');

      expect(mine).toBeTruthy();
      expect(mine!.sampleSize).toBe(3);
      expect(mine!.marketMedian).toBe(110);
      expect(mine!.position).toBe('above');
      expect(mine!.differencePercent).toBeGreaterThan(80);
    });
  });
});
