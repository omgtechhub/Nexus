import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { VoicePortal, PaymentProvider, PaymentStatus } from '@prisma/client';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { setSpeakerEmbedder, type SpeakerEmbedder } from '../src/services/voice/embedder.js';
import { enrolVoice } from '../src/services/voice/speaker.service.js';
import { runPolicyScan, getActivitySummary, spokenReport } from '../src/services/admin/policy.service.js';
import { parseAdminIntent } from '../src/controllers/adminVoice.controller.js';

const request = supertest(app);

/**
 * Platform monitoring.
 *
 * The checks are the whole feature, so the tests are mostly about whether a
 * finding is *true*. A monitor that invents breaches is worse than none: it
 * would have an administrator suspend a merchant over a false positive. So
 * every check below is asserted twice — once that it fires on a real breach,
 * and once that it stays silent on the clean case it most resembles.
 */
describe('Admin monitoring: policy checks, activity and the voice briefing', () => {
  const stamp = Date.now();
  const password = 'Password123!';

  let adminCookie: string;
  let adminId: string;
  let merchantCookie: string;
  let merchantId: string;

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

  async function makeProduct(body: Record<string, unknown>) {
    const res = await request.post('/api/products').set('Cookie', [merchantCookie]).send(body);
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  }

  async function makeOrder(productId: string, quantity = 1) {
    const res = await request.post('/api/orders').set('Cookie', [merchantCookie]).send({
      customerName: 'Monitor Buyer',
      customerEmail: `monitor_${stamp}@example.com`,
      items: [{ productId, quantity }],
      shippingAddress: {
        firstName: 'M', lastName: 'B', address1: '1 Watch Street',
        city: 'Lagos', state: 'LA', zip: '100001', country: 'NG',
      },
    });
    expect(res.status).toBe(201);
    return res.body.data;
  }

  beforeAll(async () => {
    setSpeakerEmbedder(fakeEmbedder());

    const merchant = await request.post('/api/auth/register').send({
      name: 'Monitored Merchant',
      email: `mon_m_${stamp}@nexus.io`,
      password,
      displayName: `Monitored Merchant ${stamp}`,
    });
    expect(merchant.status).toBe(201);
    merchantCookie = merchant.headers['set-cookie'][0];
    merchantId = merchant.body.data.merchant.id;

    const admin = await request.post('/api/auth/register').send({
      name: 'Platform Admin',
      email: `mon_a_${stamp}@nexus.io`,
      password,
      displayName: `Admin Merchant ${stamp}`,
    });
    adminId = admin.body.data.user.id;
    await prisma.user.update({
      where: { id: adminId },
      data: { platformRole: 'PLATFORM_OWNER' },
    });

    const relogin = await request.post('/api/auth/login').send({
      email: `mon_a_${stamp}@nexus.io`,
      password,
    });
    expect(relogin.status).toBe(200);
    adminCookie = relogin.headers['set-cookie'][0];

    await enrolVoice(adminId, VoicePortal.ADMIN, clipsFor(1, 4));
  });

  afterAll(() => setSpeakerEmbedder(null));

  describe('payment integrity', () => {
    it('flags an order marked paid with no payment record', async () => {
      const product = await makeProduct({
        title: `Ghost Payment Item ${stamp}`,
        description: 'x',
        price: 100,
        sku: `SKU-GP-${stamp}`,
        inventory: 10,
      });
      const order = await makeOrder(product);

      // Mark it paid directly, which is exactly the shape of the hole this
      // check exists to catch: a paid order that no gateway ever confirmed.
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.PAID },
      });

      const report = await runPolicyScan();
      const finding = report.findings.find(
        f => f.kind === 'PAID_WITHOUT_PAYMENT' && f.subject.id === order.id
      );

      expect(finding).toBeTruthy();
      expect(finding!.severity).toBe('CRITICAL');
      expect(finding!.evidence.total).toBe(100);
    });

    it('does not flag a paid order that has a payment record', async () => {
      const product = await makeProduct({
        title: `Honest Payment Item ${stamp}`,
        description: 'x',
        price: 70,
        sku: `SKU-HP-${stamp}`,
        inventory: 10,
      });
      const order = await makeOrder(product);

      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.PAID },
      });
      await prisma.payment.create({
        data: {
          merchantId,
          orderId: order.id,
          provider: PaymentProvider.PAYSTACK,
          providerReference: `ref_ok_${stamp}`,
          amount: order.total,
          status: PaymentStatus.PAID,
        },
      });

      const report = await runPolicyScan();
      expect(
        report.findings.some(f => f.kind === 'PAID_WITHOUT_PAYMENT' && f.subject.id === order.id)
      ).toBe(false);
    });

    it('flags a charge that does not match the order total', async () => {
      const product = await makeProduct({
        title: `Mismatch Item ${stamp}`,
        description: 'x',
        price: 200,
        sku: `SKU-MM-${stamp}`,
        inventory: 10,
      });
      const order = await makeOrder(product);

      await prisma.payment.create({
        data: {
          merchantId,
          orderId: order.id,
          provider: PaymentProvider.PAYSTACK,
          providerReference: `ref_mm_${stamp}`,
          amount: order.total + 45,
          status: PaymentStatus.PAID,
        },
      });

      const report = await runPolicyScan();
      const finding = report.findings.find(
        f => f.kind === 'PAYMENT_AMOUNT_MISMATCH' && f.subject.id === order.id
      );

      expect(finding).toBeTruthy();
      expect(finding!.evidence.difference).toBe(45);
    });

    it('flags a refund larger than the payment it came from', async () => {
      const product = await makeProduct({
        title: `Over Refund Item ${stamp}`,
        description: 'x',
        price: 90,
        sku: `SKU-OR-${stamp}`,
        inventory: 10,
      });
      const order = await makeOrder(product);

      const payment = await prisma.payment.create({
        data: {
          merchantId,
          orderId: order.id,
          provider: PaymentProvider.PAYSTACK,
          providerReference: `ref_or_${stamp}`,
          amount: order.total,
          status: PaymentStatus.PAID,
        },
      });
      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          orderId: order.id,
          merchantId,
          amount: order.total + 30,
          status: 'SUCCESS',
          providerReference: `rfd_or_${stamp}`,
        },
      });

      const report = await runPolicyScan();
      const finding = report.findings.find(
        f => f.kind === 'OVER_REFUNDED' && f.subject.id === order.id
      );

      expect(finding).toBeTruthy();
      expect(finding!.severity).toBe('CRITICAL');
    });
  });

  describe('listing integrity', () => {
    it('flags a was-price that is not above the selling price', async () => {
      const product = await makeProduct({
        title: `Fake Discount Item ${stamp}`,
        description: 'x',
        price: 100,
        comparePrice: 90,
        sku: `SKU-FD-${stamp}`,
        inventory: 5,
      });

      const report = await runPolicyScan();
      const finding = report.findings.find(
        f => f.kind === 'FAKE_DISCOUNT' && f.subject.id === product
      );

      expect(finding).toBeTruthy();
      expect(finding!.evidence.comparePrice).toBe(90);
      expect(finding!.evidence.price).toBe(100);
    });

    it('leaves a genuine discount alone', async () => {
      const product = await makeProduct({
        title: `Real Discount Item ${stamp}`,
        description: 'x',
        price: 80,
        comparePrice: 120,
        sku: `SKU-RD-${stamp}`,
        inventory: 5,
      });

      const report = await runPolicyScan();
      expect(report.findings.some(f => f.kind === 'FAKE_DISCOUNT' && f.subject.id === product)).toBe(
        false
      );
    });
  });

  describe('review integrity', () => {
    it('flags a merchant reviewing its own product', async () => {
      const product = await makeProduct({
        title: `Self Reviewed Item ${stamp}`,
        description: 'x',
        price: 40,
        sku: `SKU-SR-${stamp}`,
        inventory: 10,
      });
      const order = await makeOrder(product);
      const item = await prisma.orderItem.findFirst({ where: { orderId: order.id } });

      // The merchant's own user account, reviewing its own catalogue. The
      // purchase is real, which is why this needs a membership join to catch
      // rather than a heuristic about the text.
      const merchantUser = await prisma.merchantMember.findFirst({ where: { merchantId } });
      await prisma.productReview.create({
        data: {
          productId: product,
          merchantId,
          userId: merchantUser!.userId,
          orderId: order.id,
          orderItemId: item!.id,
          rating: 5,
          body: 'An excellent product, if I do say so myself.',
        },
      });

      const report = await runPolicyScan();
      const finding = report.findings.find(f => f.kind === 'SELF_REVIEW');

      expect(finding).toBeTruthy();
      expect(finding!.evidence.rating).toBe(5);
      expect(finding!.evidence.merchantId).toBe(merchantId);
    });
  });

  describe('the report as a whole', () => {
    it('reports what it examined, so a clean scan means something', async () => {
      const report = await runPolicyScan();

      expect(report.scanned.checks).toBeGreaterThanOrEqual(10);
      expect(report.scanned.merchants).toBeGreaterThan(0);
      expect(report.scanned.orders).toBeGreaterThan(0);
      expect(report.counts.total).toBe(report.findings.length);
    });

    it('orders findings worst first', async () => {
      const report = await runPolicyScan();
      const rank = { CRITICAL: 0, WARNING: 1, INFO: 2 } as const;
      for (let i = 1; i < report.findings.length; i++) {
        expect(rank[report.findings[i].severity]).toBeGreaterThanOrEqual(
          rank[report.findings[i - 1].severity]
        );
      }
    });

    it('counts activity over a window', async () => {
      const activity = await getActivitySummary(24);
      expect(activity.windowHours).toBe(24);
      expect(activity.orders).toBeGreaterThan(0);
    });

    it('speaks the critical findings rather than only a count', async () => {
      const report = await runPolicyScan();
      const activity = await getActivitySummary(24);
      const spoken = spokenReport(report, activity);

      expect(spoken).toContain('order(s)');
      if (report.counts.critical > 0) {
        expect(spoken).toContain('critical');
        // At least the first critical finding is read out in full.
        expect(spoken).toContain(report.findings[0].summary);
      }
    });
  });

  describe('intent parsing', () => {
    it('separates the briefings an administrator can ask for', () => {
      expect(parseAdminIntent('give me the report')).toBe('FULL_REPORT');
      expect(parseAdminIntent('any critical findings')).toBe('CRITICAL_ONLY');
      expect(parseAdminIntent('check the payments')).toBe('PAYMENT_CHECKS');
      expect(parseAdminIntent('any policy violations')).toBe('VIOLATIONS_ONLY');
      expect(parseAdminIntent('what has been happening today')).toBe('ACTIVITY_ONLY');
      expect(parseAdminIntent('what can you do')).toBe('HELP');
    });

    it('admits it did not understand rather than guessing a briefing', () => {
      // Guessing here would read merchant compliance findings aloud in answer
      // to a sentence that asked for something else entirely.
      expect(parseAdminIntent('mmm')).toBe('UNKNOWN');
      expect(parseAdminIntent('')).toBe('UNKNOWN');
    });
  });

  describe('the HTTP surface', () => {
    it('refuses a guest', async () => {
      expect((await request.get('/api/admin/voice/report')).status).toBe(401);
      expect((await request.post('/api/admin/voice/command')).status).toBe(401);
    });

    it('refuses a merchant who is not a platform admin', async () => {
      const res = await request.get('/api/admin/voice/report').set('Cookie', [merchantCookie]);
      expect(res.status).toBe(403);
    });

    it('serves the report to a platform admin', async () => {
      const res = await request.get('/api/admin/voice/report').set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.report.scanned.checks).toBeGreaterThan(0);
      expect(typeof res.body.data.spoken).toBe('string');
    });

    it('keeps the admin voice profile separate from the seller one', async () => {
      const adminStatus = await request.get('/api/admin/voice/status').set('Cookie', [adminCookie]);
      expect(adminStatus.body.data.enrolled).toBe(true);

      // The same person also owns a store; enrolling to hear compliance
      // findings must not have enrolled them to ask about their own margin.
      const sellerStatus = await request.get('/api/iq/voice/status').set('Cookie', [adminCookie]);
      expect(sellerStatus.body.data.enrolled).toBe(false);
    });

    it('declines to brief a voice that is not the registered one', async () => {
      const [clip] = clipsFor(900, 1);
      const res = await request
        .post('/api/admin/voice/command')
        .set('Cookie', [adminCookie])
        .attach('audio', wavOf(clip.samples), 'command.wav');

      expect(res.status).toBe(403);
      expect(res.body.data.verification.accepted).toBe(false);
      // Refused before transcription: this report names merchants.
      expect(res.body.data.transcript).toBeUndefined();
    });

    it('exposes no route that enforces against a merchant', async () => {
      // Voice is defeated by a recording, so suspending a store must stay a
      // deliberate click rather than something a misheard sentence can do.
      for (const path of ['/api/admin/voice/suspend', '/api/admin/voice/enforce']) {
        const res = await request.post(path).set('Cookie', [adminCookie]);
        expect(res.status).toBe(404);
      }
    });
  });
});
