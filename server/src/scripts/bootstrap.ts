/**
 * One-time provisioning for a fresh Nexus install.
 *
 * **Why this exists.** On an empty database the platform is deadlocked:
 *
 *  - `platformRole: 'PLATFORM_OWNER'` was set in exactly one place in the
 *    codebase — `prisma/seed.ts` — which DEPLOYMENT.md correctly forbids in
 *    production because it begins with `deleteMany` on every table. There is
 *    no signup path to the role, so **no administrator could ever exist**.
 *  - Creating subscription plans needs `POST /api/admin/plans`, which is
 *    behind `requirePlatformAdmin`. No admin, no plans.
 *  - `entitlement.service.ts` throws **503** on an empty plans table rather
 *    than granting a generous default (deliberately — a generous default is
 *    how the limits became unenforceable). Product count, team seats, custom
 *    domains and analytics all gate on it.
 *  - `saasBilling.service.ts` returns `null` when no plan resolves, so a new
 *    store gets no trial subscription at all, silently.
 *  - `GET /api/plans` returns nothing, so the public pricing page is empty.
 *
 * The only escape was hand-written SQL against production. This script is that
 * escape, made repeatable and safe.
 *
 * **It is not a seed.** It never deletes, never truncates and never
 * downgrades. Every step is a create-if-missing or a no-op, so running it
 * twice is harmless and running it against a populated database changes
 * nothing it was not asked to change.
 *
 * Usage, once, after `prisma migrate deploy`:
 *
 *   BOOTSTRAP_OWNER_EMAIL=you@example.com \
 *   BOOTSTRAP_OWNER_PASSWORD='<a real password>' \
 *     node dist/scripts/bootstrap.js
 *
 * Add `BOOTSTRAP_DRY_RUN=true` to print the plan without writing anything.
 */

import { PlatformRole, Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { hashPassword } from '../utils/password.js';

/**
 * How much more the monthly plan costs than the annual one.
 *
 * **The annual price is the anchor.** David quoted one figure per tier and it
 * is the annual price; the monthly plan is that figure plus a tenth, so
 * Starter is ₦50,000 annually against ₦55,000 monthly. Committing for the year
 * is the cheaper option, which is the whole point of offering it.
 *
 * Two earlier readings were wrong and are worth naming so neither returns:
 * taking the figures as monthly and multiplying up (Starter at ₦500,000 a
 * year, ten times the intent), and deriving monthly as annual/10 (₦5,000,
 * which made the monthly plan look an order of magnitude *cheaper* than the
 * annual one on the card).
 *
 * One constant, so the gap between the two plans is a single edit.
 *
 * `monthlyFrom` rounds, because binary floating point does not: `50_000 * 1.1`
 * is 55000.00000000001, and writing that into a price column surfaced on the
 * pricing card as "Saves ₦5,000.00" where a neighbouring tier said "₦8,000".
 * Money is rounded to whole naira at the point it is computed, never left for
 * a formatter to hide.
 */
export const MONTHLY_UPLIFT = 1.1;

/** The monthly price for a tier, from its annual price. */
export function monthlyFrom(annualPrice: number): number {
  return Math.round(annualPrice * MONTHLY_UPLIFT);
}

/**
 * The platform's tiers, priced in naira.
 *
 * Prices set by David on 2026-10-18, quoted **annually**: Starter ₦50,000,
 * Growth ₦80,000, Pro ₦150,000, Enterprise ₦450,000 per year. The monthly
 * plan is that figure plus `MONTHLY_UPLIFT`. The limits, features and token
 * allowances are the ones the pricing page already advertises; only the
 * currency and the figures changed.
 *
 * `code` is the stable identity — it is what `DEFAULT_PLAN_CODE` resolves
 * against and what an invoice refers back to — so it is matched on, never
 * written over.
 */
export const PLANS: Prisma.SubscriptionPlanCreateInput[] = [
  {
    code: 'starter',
    name: 'Starter Plan',
    description: 'Ideal for early stage stores and boutique merchants.',
    monthlyPrice: monthlyFrom(50_000),
    annualPrice: 50_000,
    currency: 'NGN',
    trialDays: 14,
    displayOrder: 1,
    maxProducts: 50,
    maxTeamMembers: 2,
    maxStores: 1,
    storageMb: 1000,
    customDomainAllowed: true,
    advancedAnalyticsAllowed: false,
    aiTokensPerMonth: 1000,
    features: [
      'Up to 50 active products',
      '2 team members',
      'Custom domain support',
      'Standard analytics',
      'Email support',
    ],
  },
  {
    code: 'growth',
    name: 'Growth Plan',
    description: 'Designed for scaling commerce brands with high order volume.',
    monthlyPrice: monthlyFrom(80_000),
    annualPrice: 80_000,
    currency: 'NGN',
    trialDays: 14,
    displayOrder: 2,
    maxProducts: 500,
    maxTeamMembers: 5,
    maxStores: 1,
    storageMb: 5000,
    customDomainAllowed: true,
    advancedAnalyticsAllowed: true,
    aiTokensPerMonth: 10000,
    features: [
      'Up to 500 active products',
      '5 team members',
      'Custom domain support',
      'Advanced analytics & export',
      'Priority support',
    ],
  },
  {
    code: 'pro',
    name: 'Pro Merchant Plan',
    description: 'Full commerce suite with high limits and dedicated resources.',
    monthlyPrice: monthlyFrom(150_000),
    annualPrice: 150_000,
    currency: 'NGN',
    trialDays: 14,
    displayOrder: 3,
    maxProducts: 2500,
    maxTeamMembers: 15,
    maxStores: 3,
    storageMb: 25000,
    customDomainAllowed: true,
    advancedAnalyticsAllowed: true,
    aiTokensPerMonth: 100000,
    features: [
      'Up to 2,500 active products',
      '15 team members',
      'Multi-store support',
      'Advanced analytics',
      'VIP 24/7 support',
    ],
  },
  {
    code: 'enterprise',
    name: 'Enterprise Plan',
    description: 'Custom infrastructure, unlimited scaling, and SLA guarantee.',
    monthlyPrice: monthlyFrom(450_000),
    annualPrice: 450_000,
    currency: 'NGN',
    trialDays: 14,
    displayOrder: 4,
    maxProducts: 10000,
    maxTeamMembers: 50,
    maxStores: 10,
    storageMb: 100000,
    customDomainAllowed: true,
    advancedAnalyticsAllowed: true,
    // Null is the unlimited allowance the pricing page promises this tier.
    aiTokensPerMonth: null,
    features: [
      'Up to 10,000 active products',
      '50 team members',
      'Dedicated account manager',
      'Custom integrations',
      '99.99% SLA',
    ],
  },
];

/**
 * The tier `DEFAULT_PLAN_CODE` resolves against. It must exist and be active,
 * or entitlements keep answering 503 and this script has not done its job.
 */
export const REQUIRED_DEFAULT_CODE = 'starter';

export interface BootstrapOptions {
  email: string;
  name: string;
  password?: string;
  updatePlans: boolean;
  dryRun: boolean;
}

export function readOptions(env: NodeJS.ProcessEnv = process.env): BootstrapOptions {
  const email = (env.BOOTSTRAP_OWNER_EMAIL || '').trim().toLowerCase();
  const password = env.BOOTSTRAP_OWNER_PASSWORD;

  if (!email) {
    throw new Error(
      'BOOTSTRAP_OWNER_EMAIL is required: the address that becomes the first platform owner.'
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error(`BOOTSTRAP_OWNER_EMAIL is not a valid address: ${email}`);
  }

  // Matches `auth.validator.ts`, so an account created here obeys the same
  // rules as one created through signup and can be changed the usual way.
  if (password !== undefined && password.length < 8) {
    throw new Error('BOOTSTRAP_OWNER_PASSWORD must be at least 8 characters.');
  }

  return {
    email,
    name: (env.BOOTSTRAP_OWNER_NAME || 'Platform Owner').trim(),
    password,
    updatePlans: env.BOOTSTRAP_UPDATE_PLANS === 'true',
    dryRun: env.BOOTSTRAP_DRY_RUN === 'true',
  };
}

/**
 * Create the tiers that are missing.
 *
 * An existing tier is **left alone** unless `BOOTSTRAP_UPDATE_PLANS=true`.
 * Prices are editable by an admin through `PATCH /api/admin/plans/:id`, and
 * silently restoring these figures on every run would make this script a
 * second pricing authority that quietly overrules the console.
 */
export async function ensurePlans(opts: BootstrapOptions): Promise<void> {
  console.log('\nPlans');

  for (const plan of PLANS) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { code: plan.code },
      select: { monthlyPrice: true, currency: true },
    });

    const price = `${plan.currency} ${Number(plan.monthlyPrice).toLocaleString()}/mo`;

    if (!existing) {
      if (opts.dryRun) {
        console.log(`  would create  ${plan.code.padEnd(11)} ${price}`);
        continue;
      }
      await prisma.subscriptionPlan.create({ data: plan });
      console.log(`  created       ${plan.code.padEnd(11)} ${price}`);
      continue;
    }

    if (!opts.updatePlans) {
      const current = `${existing.currency} ${existing.monthlyPrice.toLocaleString()}/mo`;
      // A tier priced in another currency is worth saying out loud: Paystack
      // rejects a currency the account has not enabled, so it would fail at
      // initialize rather than merely display oddly.
      const note =
        existing.currency === plan.currency ? '' : '   <- differs from this install';
      console.log(`  exists        ${plan.code.padEnd(11)} ${current}${note}`);
      continue;
    }

    if (opts.dryRun) {
      console.log(`  would update  ${plan.code.padEnd(11)} -> ${price}`);
      continue;
    }

    // `code` identifies the row, so it is deliberately not in the update.
    const { code, ...rest } = plan;
    await prisma.subscriptionPlan.update({ where: { code }, data: rest });
    console.log(`  updated       ${plan.code.padEnd(11)} -> ${price}`);
  }

  if (!opts.dryRun) {
    const active = await prisma.subscriptionPlan.findFirst({
      where: { code: REQUIRED_DEFAULT_CODE, isActive: true },
      select: { id: true },
    });
    if (!active) {
      throw new Error(
        `No active plan with code "${REQUIRED_DEFAULT_CODE}" exists after bootstrapping. ` +
          'DEFAULT_PLAN_CODE resolves against it, so entitlements would keep answering 503.'
      );
    }
  }
}

/**
 * Make sure one platform owner exists.
 *
 * Promotes the named account if it is already there, and creates it if it is
 * not — because on a genuinely empty database there is nobody to promote.
 *
 * An existing `platformRole` is never overwritten. Demoting a PLATFORM_OWNER,
 * or re-promoting an account somebody deliberately reduced, is not something a
 * provisioning script should do quietly.
 */
export async function ensureOwner(opts: BootstrapOptions): Promise<void> {
  console.log('\nPlatform owner');

  const existing = await prisma.user.findFirst({
    where: { email: { equals: opts.email, mode: 'insensitive' } },
    select: { id: true, email: true, platformRole: true },
  });

  if (existing?.platformRole) {
    console.log(`  unchanged     ${existing.email} is already ${existing.platformRole}`);
  } else if (existing) {
    if (opts.dryRun) {
      console.log(`  would promote ${existing.email} -> PLATFORM_OWNER`);
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: { platformRole: PlatformRole.PLATFORM_OWNER },
      });
      console.log(`  promoted      ${existing.email} -> PLATFORM_OWNER`);
    }
  } else {
    if (!opts.password) {
      throw new Error(
        `No user exists with ${opts.email}, so there is nobody to promote. Set ` +
          'BOOTSTRAP_OWNER_PASSWORD to create the account, or sign up with that ' +
          'address first and re-run.'
      );
    }

    if (opts.dryRun) {
      console.log(`  would create  ${opts.email} as PLATFORM_OWNER`);
    } else {
      await prisma.user.create({
        data: {
          email: opts.email,
          name: opts.name,
          passwordHash: await hashPassword(opts.password),
          // `AccountType` has no ADMIN member: the schema states ADMIN is
          // expressed by `platformRole`, which `accountTypeOf` reads ahead of
          // this column. SELLER is the schema default.
          accountType: 'SELLER',
          // Verified on creation. Email verification is a mail round-trip, and
          // this account must be usable before SMTP has been proven — it is
          // the account used to prove it.
          isVerified: true,
          emailVerifiedAt: new Date(),
          platformRole: PlatformRole.PLATFORM_OWNER,
        },
      });
      console.log(`  created       ${opts.email} as PLATFORM_OWNER`);
    }
  }

  // Deliberately never printed: the password. The pre-deploy audit found reset
  // tokens written to stdout in full, which turns a log aggregator into a
  // credential store. The operator supplied this value and already has it.
  const admins = await prisma.user.count({ where: { platformRole: { not: null } } });
  console.log(`  platform administrators on this install: ${admins}`);
}

export async function bootstrap(opts: BootstrapOptions): Promise<void> {
  console.log('Nexus bootstrap');
  console.log(`  mode: ${opts.dryRun ? 'DRY RUN (nothing will be written)' : 'applying'}`);
  if (opts.updatePlans && !opts.dryRun) {
    console.log('  BOOTSTRAP_UPDATE_PLANS=true: existing plan rows will be overwritten');
  }

  await ensurePlans(opts);
  await ensureOwner(opts);

  console.log(
    opts.dryRun
      ? '\nDry run complete. Nothing was written.'
      : '\nBootstrap complete. Sign in with that address and open /admin.'
  );
}

/**
 * Only run when executed directly, so the test suite can import the pieces
 * above without a bare import provisioning the database it is asserting on.
 */
const invokedDirectly = process.argv[1]
  ? process.argv[1].replace(/\\/g, '/').endsWith('/scripts/bootstrap.js') ||
    process.argv[1].replace(/\\/g, '/').endsWith('/scripts/bootstrap.ts')
  : false;

if (invokedDirectly) {
  bootstrap(readOptions())
    .catch(err => {
      console.error(`\nBootstrap failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
