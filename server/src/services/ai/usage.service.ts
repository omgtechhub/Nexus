import { prisma } from '../../prisma.js';
import { AiUsageKind } from '@prisma/client';

/**
 * Usage metering for Nexus IQ.
 *
 * Metering, not rationing. Nexus IQ is not capped on the seller side, which
 * matches the shopping assistant and the platform console — neither of those
 * counts a turn against an allowance either, and a merchant hitting a wall
 * mid-question while a shopper on the same install asks freely was never
 * defensible.
 *
 * What stays is the ledger: every turn still records what it spent, so the
 * dashboard can show a merchant what their assistant is costing and the
 * platform can bill or price against real numbers later. Nothing here refuses
 * work.
 */

export interface UsageWindow {
  periodStart: Date;
  periodEnd: Date;
  tokensUsed: number;
  /** The plan the store is on, for display. It no longer gates anything. */
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

  return {
    periodStart: start,
    periodEnd: end,
    tokensUsed: (aggregate._sum.tokensIn ?? 0) + (aggregate._sum.tokensOut ?? 0),
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
