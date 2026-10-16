import { prisma } from '../../prisma.js';
import type { SubscriptionPlan } from '@prisma/client';

/**
 * The tier a store is on before it has paid for anything.
 *
 * One resolution, shared by `saasBilling.service.ts` (which starts a store's
 * trial) and `entitlement.service.ts` (which decides what a store may do).
 * Those two resolved it independently and disagreed: billing auto-created an
 * indefinitely ACTIVE subscription to `growth`, while entitlements fell back
 * to `growth` and then to a hardcoded 500-product grant that outranked the
 * plans table.
 *
 * **Resolved by explicit code, not by price.** The first fix for the free-plan
 * hole picked "the cheapest active plan", which is correct in spirit and
 * fragile in practice: *any* zero-priced plan in the table silently becomes
 * every new store's entitlement. That is not hypothetical — the Nexus IQ test
 * suite creates a 0/0 plan to give its usage summary a plan name, and it
 * promptly became the default for every store created afterwards, quietly
 * changing what new merchants were allowed to do and what they were charged
 * to change tier.
 *
 * A promotional tier, an internal plan or a decommissioned one priced at zero
 * would do the same thing in production.
 */

/**
 * The entry tier's code. Change this to repoint the platform's default — for
 * instance to a dedicated free tier, if one is added.
 */
export const DEFAULT_PLAN_CODE = 'starter';

/**
 * The entry tier, or the cheapest active plan if that code is missing.
 *
 * The price fallback is kept only so a deployment whose plans are named
 * differently still resolves *something* rather than failing; it is the last
 * resort, not the rule.
 */
export async function resolveDefaultPlan(): Promise<SubscriptionPlan | null> {
  const named = await prisma.subscriptionPlan.findFirst({
    where: { code: DEFAULT_PLAN_CODE, isActive: true },
  });
  if (named) return named;

  return prisma.subscriptionPlan.findFirst({
    where: { isActive: true },
    // `displayOrder` is the merchant-facing ordering of the pricing table, so
    // its first entry is the intended entry tier. Price only breaks a tie.
    orderBy: [{ displayOrder: 'asc' }, { monthlyPrice: 'asc' }],
  });
}
