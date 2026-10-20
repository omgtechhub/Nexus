import { prisma } from '../../prisma.js';
import { SubscriptionStatus } from '@prisma/client';
import { resolveDefaultPlan } from './defaultPlan.js';

export interface EntitlementUsage {
  productCount: number;
  maxProducts: number;
  teamMemberCount: number;
  maxTeamMembers: number;
  advancedAnalyticsAllowed: boolean;
  planName: string;
  planCode: string;
  subscriptionStatus: SubscriptionStatus;
}

export class EntitlementService {
  /**
   * Retrieves current store usage and active plan entitlements
   */
  async getMerchantEntitlements(merchantId: string): Promise<EntitlementUsage> {
    const [sub, productCount, teamMemberCount] = await Promise.all([
      prisma.subscription.findUnique({
        where: { merchantId },
        include: { plan: true },
      }),
      prisma.product.count({ where: { merchantId } }),
      prisma.merchantMember.count({ where: { merchantId } }),
    ]);

    let plan = sub?.plan;

    /**
     * No subscription row yet: fall back to the **cheapest** active plan.
     *
     * This used to resolve `growth` — the $79/mo mid-tier — and, failing that,
     * a hardcoded object granting 500 products, 5 team members, custom domains
     * and advanced analytics. So a store that had simply never loaded its
     * billing page was entitled to the mid-tier for nothing, and the
     * hardcoded figures silently outranked whatever the plans table actually
     * said.
     *
     * The cheapest plan is the same one `saasBillingService` starts a trial
     * on, so entitlements and the subscription can no longer disagree about
     * what an unpaid store is allowed to do.
     */
    if (!plan) {
      plan = (await resolveDefaultPlan()) ?? undefined;
    }

    // No plans configured at all. Granting a generous default here is how the
    // limits became unenforceable; refusing is the safe direction.
    if (!plan) {
      const err: any = new Error(
        'No active subscription plan is configured on this platform, so entitlements cannot be resolved.'
      );
      err.statusCode = 503;
      throw err;
    }

    const status = sub?.status || SubscriptionStatus.ACTIVE;

    return {
      productCount,
      maxProducts: plan!.maxProducts,
      teamMemberCount,
      maxTeamMembers: plan!.maxTeamMembers,
      advancedAnalyticsAllowed: plan!.advancedAnalyticsAllowed,
      planName: plan!.name,
      planCode: plan!.code,
      subscriptionStatus: status,
    };
  }

  /**
   * Asserts whether a store can add another product
   */
  async assertCanAddProduct(merchantId: string): Promise<void> {
    const entitlements = await this.getMerchantEntitlements(merchantId);

    if (entitlements.subscriptionStatus === SubscriptionStatus.EXPIRED || entitlements.subscriptionStatus === SubscriptionStatus.SUSPENDED) {
      const err: any = new Error('Subscription is inactive or expired. Please resolve billing to create new products.');
      err.statusCode = 403;
      err.code = 'SUBSCRIPTION_INACTIVE';
      throw err;
    }

    if (entitlements.productCount >= entitlements.maxProducts) {
      const err: any = new Error(`Product limit reached for ${entitlements.planName} (${entitlements.productCount}/${entitlements.maxProducts}). Please upgrade your plan to add more products.`);
      err.statusCode = 403;
      err.code = 'LIMIT_EXCEEDED';
      err.details = { current: entitlements.productCount, limit: entitlements.maxProducts, resource: 'products' };
      throw err;
    }
  }

  /**
   * Asserts whether a store can invite another team member
   */
  async assertCanAddTeamMember(merchantId: string): Promise<void> {
    const entitlements = await this.getMerchantEntitlements(merchantId);

    if (entitlements.subscriptionStatus === SubscriptionStatus.EXPIRED || entitlements.subscriptionStatus === SubscriptionStatus.SUSPENDED) {
      const err: any = new Error('Subscription is inactive or expired. Please resolve billing to invite team members.');
      err.statusCode = 403;
      err.code = 'SUBSCRIPTION_INACTIVE';
      throw err;
    }

    if (entitlements.teamMemberCount >= entitlements.maxTeamMembers) {
      const err: any = new Error(`Team member limit reached for ${entitlements.planName} (${entitlements.teamMemberCount}/${entitlements.maxTeamMembers}). Please upgrade your plan to invite more team members.`);
      err.statusCode = 403;
      err.code = 'LIMIT_EXCEEDED';
      err.details = { current: entitlements.teamMemberCount, limit: entitlements.maxTeamMembers, resource: 'team_members' };
      throw err;
    }
  }

  /**
   * Asserts advanced analytics feature availability
   */
  async assertAdvancedAnalyticsAllowed(merchantId: string): Promise<void> {
    const entitlements = await this.getMerchantEntitlements(merchantId);

    if (!entitlements.advancedAnalyticsAllowed) {
      const err: any = new Error(`Advanced analytics are not available on the ${entitlements.planName}. Please upgrade your subscription to access analytics.`);
      err.statusCode = 403;
      err.code = 'FEATURE_NOT_ALLOWED';
      throw err;
    }
  }
}

export const entitlementService = new EntitlementService();
