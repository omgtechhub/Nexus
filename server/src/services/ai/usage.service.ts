import { prisma } from '../../prisma.js';
import { AiUsageKind } from '@prisma/client';

/**
 * Usage metering for Nexus IQ.
 *
 * The allowance comes from the store's subscription plan, which the pricing page
 * already commits to per tier. A store with no subscription gets the free
 * allowance below rather than unlimited access.
 */

/** What a store without a subscription may use each month. */
const UNSUBSCRIBED_ALLOWANCE = 250;

export interface UsageWindow {
  periodStart: Date;
  periodEnd: Date;
  tokensUsed: number;
  /** Null means unlimited. */
  tokensAllowed: number | null;
  remaining: number | null;
  exceeded: boolean;
  planName: string | null;
}

/** Calendar month, so the window is something a merchant can reason about. */
export function currentPeriod(now = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export async function getUsage(storeId: string, now = new Date()): Promise<UsageWindow> {
  const { start, end } = currentPeriod(now);

  const [aggregate, subscription] = await Promise.all([
    prisma.aiUsageEvent.aggregate({
      where: { storeId, createdAt: { gte: start, lt: end } },
      _sum: { tokensIn: true, tokensOut: true },
    }),
    prisma.subscription.findUnique({
      where: { storeId },
      include: { plan: true },
    }),
  ]);

  const tokensUsed = (aggregate._sum.tokensIn ?? 0) + (aggregate._sum.tokensOut ?? 0);

  // An unsubscribed store is not an unlimited store.
  const tokensAllowed = subscription
    ? subscription.plan.aiTokensPerMonth
    : UNSUBSCRIBED_ALLOWANCE;

  return {
    periodStart: start,
    periodEnd: end,
    tokensUsed,
    tokensAllowed,
    remaining: tokensAllowed === null ? null : Math.max(0, tokensAllowed - tokensUsed),
    exceeded: tokensAllowed !== null && tokensUsed >= tokensAllowed,
    planName: subscription?.plan.name ?? null,
  };
}

export async function recordUsage(params: {
  storeId: string;
  kind: AiUsageKind;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}): Promise<void> {
  await prisma.aiUsageEvent.create({ data: params });
}

export class UsageExceededError extends Error {
  readonly usage: UsageWindow;
  constructor(usage: UsageWindow) {
    super(
      `This store has used its ${usage.tokensAllowed} Nexus IQ tokens for the month. ` +
        `The allowance resets on ${usage.periodEnd.toISOString().slice(0, 10)}.`
    );
    this.name = 'UsageExceededError';
    this.usage = usage;
  }
}

/** Throws when the store is already over its allowance. */
export async function assertWithinAllowance(storeId: string): Promise<UsageWindow> {
  const usage = await getUsage(storeId);
  if (usage.exceeded) throw new UsageExceededError(usage);
  return usage;
}
