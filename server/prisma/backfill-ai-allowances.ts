/**
 * One-off backfill: give the existing plans the Nexus IQ allowance their tier
 * advertises on the pricing page. New databases get these from the seed.
 * Safe to re-run.
 */
import { prisma } from '../src/prisma.js';

const ALLOWANCE: Record<string, number | null> = {
  starter: 1_000,
  growth: 10_000,
  pro: 100_000,
  enterprise: null, // unlimited
};

async function main() {
  for (const [code, aiTokensPerMonth] of Object.entries(ALLOWANCE)) {
    const result = await prisma.subscriptionPlan.updateMany({
      where: { code },
      data: { aiTokensPerMonth },
    });
    if (result.count > 0) {
      console.log(`${code}: ${aiTokensPerMonth === null ? 'unlimited' : aiTokensPerMonth}`);
    }
  }
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
