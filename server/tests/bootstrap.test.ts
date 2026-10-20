import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '../src/prisma.js';
import { PlatformRole } from '@prisma/client';
import { verifyPassword } from '../src/utils/password.js';
import { DEFAULT_PLAN_CODE } from '../src/services/billing/defaultPlan.js';
import { resolveDefaultPlan } from '../src/services/billing/defaultPlan.js';
import {
  PLANS,
  REQUIRED_DEFAULT_CODE,
  MONTHLY_UPLIFT,
  monthlyFrom,
  readOptions,
  ensurePlans,
  ensureOwner,
  type BootstrapOptions,
} from '../src/scripts/bootstrap.js';

/**
 * The bootstrap command.
 *
 * It exists because a fresh database was deadlocked: no signup path reaches
 * `platformRole`, so no admin could exist; plan creation is behind
 * `requirePlatformAdmin`; and `entitlement.service.ts` answers 503 with an
 * empty plans table. These tests assert the two properties that make running
 * it against production defensible — **it is idempotent and it never
 * destroys** — plus the prices themselves, which are the actual deliverable.
 */

function opts(over: Partial<BootstrapOptions> = {}): BootstrapOptions {
  return {
    email: 'owner@nexus.test',
    name: 'Platform Owner',
    password: undefined,
    updatePlans: false,
    dryRun: false,
    ...over,
  };
}

/** Users this file created, removed after each test so nothing bleeds. */
const createdUserIds: string[] = [];

afterEach(async () => {
  while (createdUserIds.length) {
    const id = createdUserIds.pop()!;
    await prisma.user.deleteMany({ where: { id } });
  }
});

describe('bootstrap: the plan definitions are the deliverable', () => {
  it('prices all four tiers in naira at the agreed ANNUAL figures', () => {
    const byCode = Object.fromEntries(PLANS.map(p => [p.code, p]));

    expect(Object.keys(byCode).sort()).toEqual(['enterprise', 'growth', 'pro', 'starter']);
    // David quoted these annually. Reading them as monthly put Starter at
    // ₦50,000/month — ten times the intended price — so the anchor is asserted
    // on the annual field, where the quoted figure actually belongs.
    expect(byCode.starter.annualPrice).toBe(50_000);
    expect(byCode.growth.annualPrice).toBe(80_000);
    expect(byCode.pro.annualPrice).toBe(150_000);
    expect(byCode.enterprise.annualPrice).toBe(450_000);

    // A tier priced in a currency the Paystack account has not enabled fails
    // at initialize, not at display time, so this is a payment invariant.
    for (const plan of PLANS) {
      expect(plan.currency).toBe('NGN');
    }
  });

  it('derives every monthly price from the annual one', () => {
    for (const plan of PLANS) {
      expect(plan.monthlyPrice).toBe(monthlyFrom(Number(plan.annualPrice)));
    }
  });

  it('merchants whole naira, not floating-point dust', () => {
    // 50_000 * 1.1 is 55000.00000000001. Stored unrounded, the pricing card
    // rendered "Saves ₦5,000.00" beside a neighbouring tier's "₦8,000".
    expect(50_000 * MONTHLY_UPLIFT).not.toBe(55_000);
    for (const plan of PLANS) {
      expect(Number.isInteger(plan.monthlyPrice)).toBe(true);
      expect(Number.isInteger(Number(plan.monthlyPrice) - Number(plan.annualPrice))).toBe(true);
    }
  });

  it('prices the monthly plan above the annual one, but only slightly', () => {
    for (const plan of PLANS) {
      // The direction is the requirement: committing for a year must be the
      // cheaper option, or there is no reason to offer it. A previous version
      // derived monthly as annual/10, which made it look ten times cheaper.
      expect(Number(plan.monthlyPrice)).toBeGreaterThan(Number(plan.annualPrice));
      expect(Number(plan.monthlyPrice)).toBeLessThan(Number(plan.annualPrice) * 1.5);
    }
  });

  it('keeps every derived monthly rate a whole naira figure', () => {
    for (const plan of PLANS) {
      // A tier whose annual price is not divisible by ANNUAL_MONTHS would
      // show as ₦5,333.33 on the pricing page.
      expect(Number.isInteger(plan.monthlyPrice)).toBe(true);
    }
  });

  it('includes the tier DEFAULT_PLAN_CODE resolves against', () => {
    // If these two ever disagree, bootstrap "succeeds" and entitlements still
    // answer 503 — the exact failure the command exists to prevent.
    expect(REQUIRED_DEFAULT_CODE).toBe(DEFAULT_PLAN_CODE);
    expect(PLANS.some(p => p.code === REQUIRED_DEFAULT_CODE)).toBe(true);
  });

  it('gives the entry tier the lowest displayOrder', () => {
    const entry = PLANS.find(p => p.code === REQUIRED_DEFAULT_CODE)!;
    const orders = PLANS.map(p => p.displayOrder as number);
    expect(entry.displayOrder).toBe(Math.min(...orders));
  });
});

describe('bootstrap: option parsing', () => {
  it('requires an owner email', () => {
    expect(() => readOptions({})).toThrow(/BOOTSTRAP_OWNER_EMAIL is required/);
    expect(() => readOptions({ BOOTSTRAP_OWNER_EMAIL: '   ' })).toThrow(/required/);
  });

  it('rejects an address that is not one', () => {
    expect(() => readOptions({ BOOTSTRAP_OWNER_EMAIL: 'not-an-email' })).toThrow(/not a valid/);
  });

  it('enforces the same minimum password length as signup', () => {
    expect(() =>
      readOptions({ BOOTSTRAP_OWNER_EMAIL: 'a@b.co', BOOTSTRAP_OWNER_PASSWORD: 'short' })
    ).toThrow(/at least 8 characters/);
  });

  it('normalises the email and defaults the rest', () => {
    const o = readOptions({ BOOTSTRAP_OWNER_EMAIL: '  Owner@Nexus.TEST ' });
    expect(o.email).toBe('owner@nexus.test');
    expect(o.name).toBe('Platform Owner');
    expect(o.updatePlans).toBe(false);
    expect(o.dryRun).toBe(false);
  });

  it('treats the flags as opt-in strings, not truthiness', () => {
    const base = { BOOTSTRAP_OWNER_EMAIL: 'a@b.co' };
    expect(readOptions({ ...base, BOOTSTRAP_UPDATE_PLANS: 'yes' }).updatePlans).toBe(false);
    expect(readOptions({ ...base, BOOTSTRAP_UPDATE_PLANS: 'true' }).updatePlans).toBe(true);
    expect(readOptions({ ...base, BOOTSTRAP_DRY_RUN: '1' }).dryRun).toBe(false);
    expect(readOptions({ ...base, BOOTSTRAP_DRY_RUN: 'true' }).dryRun).toBe(true);
  });
});

describe('bootstrap: ensurePlans never destroys', () => {
  it('leaves existing tiers untouched on a re-run', async () => {
    const before = await prisma.subscriptionPlan.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, monthlyPrice: true, annualPrice: true, currency: true },
    });
    expect(before.length).toBeGreaterThan(0);

    await ensurePlans(opts());

    const after = await prisma.subscriptionPlan.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, monthlyPrice: true, annualPrice: true, currency: true },
    });

    // Same rows, same ids, same prices: running it twice is a no-op, which is
    // what makes it safe to re-run on a live install.
    expect(after).toEqual(before);
  });

  it('writes nothing at all under BOOTSTRAP_UPDATE_PLANS with a dry run', async () => {
    const before = await prisma.subscriptionPlan.findMany({ orderBy: { code: 'asc' } });
    await ensurePlans(opts({ updatePlans: true, dryRun: true }));
    const after = await prisma.subscriptionPlan.findMany({ orderBy: { code: 'asc' } });
    expect(after).toEqual(before);
  });

  it('creates a tier that is missing, in naira', async () => {
    const original = await prisma.subscriptionPlan.findUnique({ where: { code: 'enterprise' } });
    expect(original).not.toBeNull();

    // The row is *parked*, not deleted. By the time the whole suite runs, other
    // files have attached subscriptions and invoices to these plans — and those
    // point at `planId`, never at `code`. Renaming the code therefore makes
    // `enterprise` absent for this test without breaking a single foreign key,
    // where deleting the row would make the test pass or fail depending on
    // which files ran before it.
    await prisma.subscriptionPlan.update({
      where: { id: original!.id },
      data: { code: 'enterprise__parked_by_test' },
    });

    try {
      await ensurePlans(opts());

      const created = await prisma.subscriptionPlan.findUnique({ where: { code: 'enterprise' } });
      expect(created).not.toBeNull();
      expect(created!.id).not.toBe(original!.id);
      expect(created!.currency).toBe('NGN');
      // The quoted figure is the ANNUAL price; monthly derives from it.
      expect(created!.annualPrice).toBe(450_000);
      expect(created!.monthlyPrice).toBe(monthlyFrom(450_000));
      // The unlimited Nexus IQ allowance the pricing page promises this tier.
      expect(created!.aiTokensPerMonth).toBeNull();

      // The parked row was left completely alone.
      const parked = await prisma.subscriptionPlan.findUnique({ where: { id: original!.id } });
      expect(parked!.monthlyPrice).toBe(original!.monthlyPrice);
      expect(parked!.currency).toBe(original!.currency);
    } finally {
      // Remove the row this test caused to be created, then un-park the
      // original, so later files see the database they expect.
      await prisma.subscriptionPlan.deleteMany({ where: { code: 'enterprise' } });
      await prisma.subscriptionPlan.update({
        where: { id: original!.id },
        data: { code: 'enterprise' },
      });
    }
  });

  it('leaves a default plan resolvable, which is the whole point', async () => {
    await ensurePlans(opts());
    await expect(resolveDefaultPlan()).resolves.not.toBeNull();
  });
});

describe('bootstrap: ensureOwner', () => {
  it('promotes an existing account rather than duplicating it', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'promote-me@nexus.test',
        name: 'Promote Me',
        passwordHash: 'x',
      },
    });
    createdUserIds.push(user.id);
    expect(user.platformRole).toBeNull();

    await ensureOwner(opts({ email: 'promote-me@nexus.test' }));

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after!.platformRole).toBe(PlatformRole.PLATFORM_OWNER);
    expect(await prisma.user.count({ where: { email: 'promote-me@nexus.test' } })).toBe(1);
  });

  it('matches the address case-insensitively', async () => {
    const user = await prisma.user.create({
      data: { email: 'MixedCase@Nexus.test', name: 'Mixed', passwordHash: 'x' },
    });
    createdUserIds.push(user.id);

    await ensureOwner(opts({ email: 'mixedcase@nexus.test' }));

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after!.platformRole).toBe(PlatformRole.PLATFORM_OWNER);
  });

  it('never overwrites a role somebody already set', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'support@nexus.test',
        name: 'Support',
        passwordHash: 'x',
        platformRole: PlatformRole.PLATFORM_SUPPORT,
      },
    });
    createdUserIds.push(user.id);

    await ensureOwner(opts({ email: 'support@nexus.test' }));

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    // Silently promoting a deliberately-reduced account is not a thing a
    // provisioning script should do.
    expect(after!.platformRole).toBe(PlatformRole.PLATFORM_SUPPORT);
  });

  it('creates the owner when the database has nobody to promote', async () => {
    const email = 'brand-new-owner@nexus.test';
    await ensureOwner(opts({ email, password: 'a-real-password', name: 'First Owner' }));

    const created = await prisma.user.findFirst({ where: { email } });
    expect(created).not.toBeNull();
    createdUserIds.push(created!.id);

    expect(created!.platformRole).toBe(PlatformRole.PLATFORM_OWNER);
    expect(created!.name).toBe('First Owner');
    // Usable immediately: this is the account used to prove SMTP works, so it
    // cannot itself depend on a verification email arriving.
    expect(created!.isVerified).toBe(true);
    expect(created!.emailVerifiedAt).not.toBeNull();
    // A real bcrypt hash, not the plaintext.
    expect(created!.passwordHash).not.toBe('a-real-password');
    expect(await verifyPassword('a-real-password', created!.passwordHash)).toBe(true);
  });

  it('refuses to invent an account without a password', async () => {
    await expect(
      ensureOwner(opts({ email: 'nobody-here@nexus.test' }))
    ).rejects.toThrow(/BOOTSTRAP_OWNER_PASSWORD/);
    expect(await prisma.user.count({ where: { email: 'nobody-here@nexus.test' } })).toBe(0);
  });

  it('writes no user on a dry run', async () => {
    await ensureOwner(opts({ email: 'dry-run@nexus.test', password: 'a-real-password', dryRun: true }));
    expect(await prisma.user.count({ where: { email: 'dry-run@nexus.test' } })).toBe(0);
  });
});
