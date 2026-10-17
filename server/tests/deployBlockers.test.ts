import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { PaymentStatus, PaymentProvider, InvoiceStatus, SubscriptionStatus } from '@prisma/client';
import {
  uploadImageBuffer,
  deleteImageByKey,
  UnsupportedImageTypeError,
  InvalidStorageKeyError,
} from '../src/services/storage.service.js';
import { saasBillingService, PaymentRequiredError } from '../src/services/billing/saasBilling.service.js';
import { ConsoleEmailProvider, formatMoney } from '../src/services/email/email.service.js';
import { smtpConfigured } from '../src/services/email/smtp.provider.js';
import { config } from '../src/config/index.js';

const request = supertest(app);

/**
 * The pre-deploy blockers.
 *
 * Each describe block below corresponds to something that was shipped and
 * exploitable, and asserts *the shape of the failure* rather than a config
 * value — so a refactor that reopens one of them fails here rather than in
 * production. Same discipline as `hardening.test.ts`.
 */

/** A minimal, genuinely valid 1x1 PNG. */
const REAL_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a4944415478'
  + '9c63000100000500010d0a2db40000000049454e44ae426082',
  'hex'
);

describe('Blocker 5+6: image upload cannot write or delete outside its own directory', () => {
  const uploadsDir = path.join(process.cwd(), 'uploads');

  it('derives the stored extension from the bytes, not the filename', async () => {
    // The filename says .html. The bytes say PNG. The bytes win, so nothing
    // servable-as-markup ever lands on disk.
    const result = await uploadImageBuffer(REAL_PNG, 'payload.html', 'image/png', 'http://x');

    expect(result.storageKey.endsWith('.png')).toBe(true);
    expect(result.storageKey).not.toContain('html');
    expect(result.url).toBe(`http://x/uploads/${result.storageKey}`);

    await deleteImageByKey(result.storageKey);
  });

  it('refuses an HTML payload declared as an image', async () => {
    const html = Buffer.from('<script>fetch("/api/auth/me").then(r=>r.json())</script>', 'utf8');

    // This is the stored-XSS case: /uploads is served from the API's own
    // origin, so an HTML file written there executes with the session cookie
    // attached. The declared content type is attacker-supplied, so the magic
    // bytes are what decide.
    await expect(uploadImageBuffer(html, 'x.png', 'image/png', 'http://x')).rejects.toThrow(
      UnsupportedImageTypeError
    );
  });

  it('refuses SVG outright, declared type or not', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'utf8');

    await expect(uploadImageBuffer(svg, 'logo.svg', 'image/svg+xml', 'http://x')).rejects.toThrow(
      UnsupportedImageTypeError
    );
    // ...and not by smuggling it under an accepted content type either.
    await expect(uploadImageBuffer(svg, 'logo.png', 'image/png', 'http://x')).rejects.toThrow(
      UnsupportedImageTypeError
    );
  });

  it('refuses a traversal key instead of deleting outside uploads/', async () => {
    // Express matches a `:key` segment BEFORE percent-decoding it, so
    // `..%2F..%2Fpackage.json` arrives as one segment and decodes to
    // `../../package.json`. This was arbitrary file deletion for any
    // authenticated seller.
    const canary = path.join(process.cwd(), 'deploy-blocker-canary.txt');
    fs.writeFileSync(canary, 'must survive');

    try {
      for (const key of [
        '../deploy-blocker-canary.txt',
        '../../deploy-blocker-canary.txt',
        './../deploy-blocker-canary.txt',
        '..\\deploy-blocker-canary.txt',
        '/etc/passwd',
      ]) {
        await expect(deleteImageByKey(key)).rejects.toThrow(InvalidStorageKeyError);
      }

      expect(fs.existsSync(canary)).toBe(true);
    } finally {
      if (fs.existsSync(canary)) fs.unlinkSync(canary);
    }
  });

  it('still deletes a key it actually minted', async () => {
    const result = await uploadImageBuffer(REAL_PNG, 'real.png', 'image/png', 'http://x');
    expect(fs.existsSync(path.join(uploadsDir, result.storageKey))).toBe(true);

    expect(await deleteImageByKey(result.storageKey)).toBe(true);
    expect(fs.existsSync(path.join(uploadsDir, result.storageKey))).toBe(false);

    // A second delete is a miss, not a throw and not a success.
    expect(await deleteImageByKey(result.storageKey)).toBe(false);
  });

  it('serves /uploads with sniffing disabled and a locked-down CSP', async () => {
    const result = await uploadImageBuffer(REAL_PNG, 'served.png', 'image/png', 'http://x');
    const res = await request.get(`/uploads/${result.storageKey}`);

    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    // Neutralises anything the old code already wrote to this directory.
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['content-security-policy']).toContain('sandbox');

    await deleteImageByKey(result.storageKey);
  });
});

describe('Blocker 4: a settled payment is never re-settled', () => {
  const merchantEmail = `blocker4_${Date.now()}@nexus.io`;
  let storeId: string;
  let cookie: string;
  let orderId: string;
  let productId: string;

  beforeAll(async () => {
    const reg = await request.post('/api/auth/register').send({
      name: 'Blocker Four Merchant',
      email: merchantEmail,
      password: 'Password123!',
      storeName: 'Blocker Four Store',
    });
    cookie = reg.headers['set-cookie'][0];
    storeId = reg.body.data.store.id;

    const prod = await request
      .post('/api/products')
      .set('Cookie', [cookie])
      .send({
        title: 'Stock Release Widget',
        price: 25,
        sku: `SKU-B4-${Date.now()}`,
        inventory: 10,
        status: 'ACTIVE',
      });
    productId = prod.body.data.id;

    const order = await prisma.order.create({
      data: {
        storeId,
        orderNumber: `#B4-${Date.now()}`,
        customerName: 'Stock Tester',
        customerEmail: 'stock@example.com',
        subtotal: 50,
        tax: 0,
        shipping: 0,
        total: 50,
        currency: 'NGN',
        items: {
          create: [
            {
              productId,
              productTitle: 'Stock Release Widget',
              sku: `SKU-B4-${Date.now()}`,
              quantity: 5,
              price: 25,
              total: 50,
            },
          ],
        },
      },
    });
    orderId = order.id;
  });

  it('reports a FAILED payment without releasing inventory a second time', async () => {
    const reference = `ref_blocker4_${Date.now()}`;
    await prisma.payment.create({
      data: {
        storeId,
        orderId,
        provider: PaymentProvider.PAYSTACK,
        providerReference: reference,
        amount: 50,
        currency: 'NGN',
        // Already settled as failed: the release, if it was owed, has happened.
        status: PaymentStatus.FAILED,
      },
    });

    const before = await prisma.inventoryItem.findFirst({ where: { storeId, productId } });

    // The old guard only short-circuited on SUCCESS, so a FAILED payment fell
    // through to the gateway and then into the release loop on EVERY call.
    // Three calls inflated stock by three times the order quantity.
    for (let i = 0; i < 3; i++) {
      const res = await request.get(`/api/payments/${reference}/verify`);
      expect(res.status).toBe(400);
      expect(res.body.data.paymentStatus).toBe('FAILED');
    }

    const after = await prisma.inventoryItem.findFirst({ where: { storeId, productId } });
    expect(after?.availableStock).toBe(before?.availableStock);
  });

  it('reports an already-successful payment without writing a second ledger row', async () => {
    const reference = `ref_blocker4ok_${Date.now()}`;
    const payment = await prisma.payment.create({
      data: {
        storeId,
        orderId,
        provider: PaymentProvider.PAYSTACK,
        providerReference: reference,
        amount: 50,
        currency: 'NGN',
        status: PaymentStatus.SUCCESS,
      },
    });

    for (let i = 0; i < 3; i++) {
      const res = await request.get(`/api/payments/${reference}/verify`);
      expect(res.status).toBe(200);
    }

    const charges = await prisma.transaction.count({ where: { paymentId: payment.id } });
    expect(charges).toBe(0);
  });
});

describe('Blocker 2+3: a plan is only granted by a confirmed payment', () => {
  const merchantEmail = `blocker23_${Date.now()}@nexus.io`;
  let storeId: string;
  let cookie: string;

  beforeAll(async () => {
    const reg = await request.post('/api/auth/register').send({
      name: 'Blocker TwoThree Merchant',
      email: merchantEmail,
      password: 'Password123!',
      storeName: 'Blocker TwoThree Store',
    });
    cookie = reg.headers['set-cookie'][0];
    storeId = reg.body.data.store.id;
  });

  it('puts a new store on the cheapest plan as a dated trial, not a free paid plan', async () => {
    const sub = await saasBillingService.getCurrentSubscription(storeId);
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    });

    // It used to auto-create an indefinitely ACTIVE subscription to `growth`
    // — the $79/mo mid-tier — for any store that had none.
    expect(sub?.status).toBe(SubscriptionStatus.TRIALING);
    expect(sub?.planId).toBe(plans[0].id);
    expect(sub?.trialEndsAt).toBeTruthy();
  });

  it('refuses to upgrade a plan without payment', async () => {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'desc' },
    });
    const dearest = plans[0];

    // This is what the seller Settings -> Billing tab calls. It used to write
    // the new plan straight onto the subscription: no charge, no invoice.
    await expect(saasBillingService.changePlan(storeId, dearest.code)).rejects.toThrow(
      PaymentRequiredError
    );

    const sub = await prisma.subscription.findUnique({ where: { storeId } });
    expect(sub?.planId).not.toBe(dearest.id);
  });

  it('returns a 402 with the plan code over HTTP, not a 500', async () => {
    const dearest = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'desc' },
    });

    const res = await request
      .post('/api/subscriptions/change-plan')
      .set('Cookie', [cookie])
      .send({ planCode: dearest!.code });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe('SUBSCRIPTION_PAYMENT_REQUIRED');
    expect(res.body.data.planCode).toBe(dearest!.code);
    expect(res.body.data.requiresPayment).toBe(true);
  });

  it('allows a downgrade immediately, since it lowers what is owed', async () => {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    });

    // Start from a mid-tier so there is something to come down from. Granted
    // directly here because the whole point of the test above is that the API
    // will not do this for free.
    await prisma.subscription.update({
      where: { storeId },
      data: { planId: plans[plans.length - 1].id, status: SubscriptionStatus.ACTIVE },
    });

    const updated = await saasBillingService.changePlan(storeId, plans[0].code);
    expect(updated.planId).toBe(plans[0].id);
  });

  it('refuses a monthly -> annual switch without payment', async () => {
    await expect(saasBillingService.changeInterval(storeId, 'ANNUAL')).rejects.toThrow(
      PaymentRequiredError
    );
  });

  it('leaves the invoice OPEN and the transaction PENDING until the gateway confirms', async () => {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'desc' },
    });

    const sub = await prisma.subscription.findUnique({ where: { storeId } });
    const planBefore = sub!.planId;

    // `subscribeToPlan` needs a configured gateway; without one it throws
    // rather than writing an invoice nobody can pay. Either outcome proves the
    // point, so the assertion branches on which one happened.
    let reference: string | null = null;
    try {
      const result = await saasBillingService.subscribeToPlan(
        storeId,
        merchantEmail,
        'Blocker TwoThree Merchant',
        plan!.code,
        'MONTHLY'
      );
      reference = result.reference;
      expect(result.requiresPayment).toBe(true);
    } catch (err: any) {
      expect(err.code).toMatch(/NOT_CONFIGURED|GATEWAY/);
      return;
    }

    // Before: the plan was written, an invoice was created with status PAID and
    // paidAt set, and a SUCCESS billing transaction was recorded — all from
    // merely minting an authorization URL.
    const after = await prisma.subscription.findUnique({ where: { storeId } });
    expect(after!.planId).toBe(planBefore);

    const txn = await prisma.billingTransaction.findUnique({
      where: { providerReference: reference! },
      include: { invoice: true },
    });
    expect(txn!.status).toBe('PENDING');
    expect(txn!.invoice!.status).toBe(InvoiceStatus.OPEN);
    expect(txn!.invoice!.paidAt).toBeNull();
  });

  it('does not grant the plan when the gateway took less than the invoice', async () => {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'desc' },
    });
    const sub = await prisma.subscription.findUnique({ where: { storeId } });
    const planBefore = sub!.planId;

    const reference = `saas_sub_under_${Date.now()}`;
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `NX-INV-UNDER-${Date.now()}`,
        storeId,
        subscriptionId: sub!.id,
        planId: plan!.id,
        status: InvoiceStatus.OPEN,
        subtotal: plan!.monthlyPrice,
        tax: 0,
        total: plan!.monthlyPrice,
        currency: plan!.currency,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });
    await prisma.billingTransaction.create({
      data: {
        storeId,
        subscriptionId: sub!.id,
        invoiceId: invoice.id,
        amount: plan!.monthlyPrice,
        currency: plan!.currency,
        status: 'PENDING',
        providerReference: reference,
        rawResponse: { requestedPlanCode: plan!.code, requestedInterval: 'MONTHLY' } as any,
      },
    });

    // A ₦1 payment must not buy the Enterprise plan.
    const outcome = await saasBillingService.settlePaidInvoice(reference, { verifiedAmount: 1 });

    expect(outcome.settled).toBe(false);
    expect(outcome.reason).toBe('amount_mismatch');
    const after = await prisma.subscription.findUnique({ where: { storeId } });
    expect(after!.planId).toBe(planBefore);
  });

  it('grants the plan exactly once on a confirmed payment, however often it is delivered', async () => {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'desc' },
    });
    const sub = await prisma.subscription.findUnique({ where: { storeId } });

    const reference = `saas_sub_ok_${Date.now()}`;
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `NX-INV-OK-${Date.now()}`,
        storeId,
        subscriptionId: sub!.id,
        planId: plan!.id,
        status: InvoiceStatus.OPEN,
        subtotal: plan!.monthlyPrice,
        tax: 0,
        total: plan!.monthlyPrice,
        currency: plan!.currency,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });
    await prisma.billingTransaction.create({
      data: {
        storeId,
        subscriptionId: sub!.id,
        invoiceId: invoice.id,
        amount: plan!.monthlyPrice,
        currency: plan!.currency,
        status: 'PENDING',
        providerReference: reference,
        rawResponse: { requestedPlanCode: plan!.code, requestedInterval: 'MONTHLY' } as any,
      },
    });

    const first = await saasBillingService.settlePaidInvoice(reference, {
      verifiedAmount: plan!.monthlyPrice,
    });
    expect(first.settled).toBe(true);

    // A webhook redelivery, or a webhook racing the return leg.
    const second = await saasBillingService.settlePaidInvoice(reference, {
      verifiedAmount: plan!.monthlyPrice,
    });
    expect(second.settled).toBe(false);
    expect(second.reason).toBe('already_settled');

    const after = await prisma.subscription.findUnique({ where: { storeId } });
    expect(after!.planId).toBe(plan!.id);
    expect(after!.status).toBe(SubscriptionStatus.ACTIVE);

    const settledInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(settledInvoice!.status).toBe(InvoiceStatus.PAID);
    expect(settledInvoice!.paidAt).toBeTruthy();
  });
});

describe('Blocker 1: email has a real transport, and never leaks tokens in production', () => {
  it('recognises the shipped placeholder as "not configured"', () => {
    // server/.env.example ships SMTP_PASS=smtp_password_placeholder. "The
    // variable is set" is not the same question as "we can send mail" — the
    // same trap the payment keys had.
    expect(smtpConfigured()).toBe(
      Boolean(config.email.smtpHost && config.email.smtpUser && config.email.smtpPass)
        && !String(config.email.smtpPass).includes('placeholder')
    );
  });

  it('the console provider refuses to print a body when NODE_ENV=production', async () => {
    const provider = new ConsoleEmailProvider();
    const originalIsProd = config.isProd;

    const logged: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => { logged.push(args.join(' ')); };

    try {
      (config as any).isProd = true;
      const sent = await provider.sendEmail({
        to: 'victim@example.com',
        subject: 'Reset your Nexus Commerce password',
        html: '<a href="https://x/reset-password?token=SECRET_TOKEN_VALUE">reset</a>',
        text: 'https://x/reset-password?token=SECRET_TOKEN_VALUE',
      });

      // It reports failure rather than claiming a delivery that did not happen,
      // and the token never reaches stdout.
      expect(sent).toBe(false);
      expect(logged.join('\n')).not.toContain('SECRET_TOKEN_VALUE');
    } finally {
      console.log = originalLog;
      (config as any).isProd = originalIsProd;
    }
  });

  it('formats money in the order currency instead of a hardcoded dollar sign', () => {
    // Receipts read "$42000.00" for an order paid in naira through Paystack.
    expect(formatMoney(42000, 'NGN')).toBe('₦42000.00 NGN');
    expect(formatMoney(99.5, 'USD')).toBe('$99.50 USD');
    expect(formatMoney(10, undefined)).toBe('$10.00 USD');
    expect(formatMoney(10, 'XOF')).toBe('10.00 XOF');
  });
});

describe('Blockers 7-9: the deployment artefacts match what the build produces', () => {
  const root = path.resolve(process.cwd(), '..');

  /**
   * Strip comments and blank lines.
   *
   * Each of these files now explains, in a comment, the broken value it
   * replaced — so a naive "does not contain" check matches the explanation and
   * fails. Only the active configuration is interesting here.
   */
  const activeLines = (text: string, commentPrefix = '#'): string =>
    text
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith(commentPrefix);
      })
      .join('\n');

  it('the API container starts the file the build actually emits', () => {
    const dockerfile = activeLines(
      fs.readFileSync(path.join(process.cwd(), 'Dockerfile'), 'utf8')
    );

    // It said `dist/index.js`, which the build has never produced, so the
    // container crash-looped on first boot with "Cannot find module".
    expect(dockerfile).toContain('CMD ["node", "dist/server.js"]');
    expect(dockerfile).not.toContain('dist/index.js');

    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    expect(pkg.main).toBe('dist/server.js');
  });

  it('the API image is glibc-based, because onnxruntime-node has no musl build', () => {
    const dockerfile = fs.readFileSync(path.join(process.cwd(), 'Dockerfile'), 'utf8');
    expect(dockerfile).not.toMatch(/FROM node:\d+-alpine/);
  });

  it('the frontend image ships an nginx config with an SPA fallback and an API proxy', () => {
    const conf = fs.readFileSync(path.join(root, 'nginx.conf'), 'utf8');

    // Without the fallback every deep link 404s on refresh; without the proxy
    // every API call from the deployed SPA returns the index page.
    expect(conf).toContain('try_files $uri $uri/ /index.html');
    expect(conf).toContain('proxy_pass http://api:5000/api/');
    expect(conf).toContain('proxy_pass http://api:5000/uploads/');
    expect(conf).toContain('X-Forwarded-For');

    const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
    expect(dockerfile).toContain('nginx.conf /etc/nginx/conf.d/default.conf');
  });

  it('compose carries no hardcoded secret and persists uploads', () => {
    const compose = activeLines(fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8'));

    // It shipped SESSION_SECRET: replace_with_a_super_secret_key... inline.
    expect(compose).not.toContain('replace_with_a_super_secret_key');
    expect(compose).toContain('SESSION_SECRET: ${SESSION_SECRET:?');
    // Product images were lost on every redeploy.
    expect(compose).toContain('uploads_data:/app/uploads');
    // Payment and SMTP keys were absent entirely, so checkout 503'd.
    expect(compose).toContain('PAYSTACK_SECRET_KEY');
    expect(compose).toContain('SMTP_HOST');
  });

  it('the deployment guide no longer prescribes a data-destroying migration', () => {
    const guide = fs.readFileSync(path.join(root, 'DEPLOYMENT.md'), 'utf8');

    // It told the operator to run `prisma db push --accept-data-loss` against
    // production, which ignores the migration history and is authorised to
    // drop columns to reach the target schema.
    //
    // Checked per fenced command block rather than over the whole document,
    // because the guide now explains the old command in order to warn against
    // it — and that explanation must not make this test fail.
    const commands = (guide.match(/```bash\n[\s\S]*?```/g) || []).join('\n');

    expect(commands).not.toContain('--accept-data-loss');
    expect(commands).not.toMatch(/prisma db push/);
    expect(commands).toContain('prisma migrate deploy');
  });
});
