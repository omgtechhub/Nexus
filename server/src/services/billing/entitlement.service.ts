import { prisma } from '../../prisma.js';
import { SubscriptionStatus } from '@prisma/client';

export interface EntitlementUsage {
  productCount: number;
  maxProducts: number;
  teamMemberCount: number;
  maxTeamMembers: number;
  customDomainAllowed: boolean;
  advancedAnalyticsAllowed: boolean;
  planName: string;
  planCode: string;
  subscriptionStatus: SubscriptionStatus;
}

export class EntitlementService {
  /**
   * Retrieves current store usage and active plan entitlements
   */
  async getStoreEntitlements(storeId: string): Promise<EntitlementUsage> {
    const [sub, productCount, teamMemberCount] = await Promise.all([
      prisma.subscription.findUnique({
        where: { storeId },
        include: { plan: true },
      }),
      prisma.product.count({ where: { storeId } }),
      prisma.storeMember.count({ where: { storeId } }),
    ]);

    let plan = sub?.plan;

    // Fallback if no subscription record exists: get default growth or starter plan
    if (!plan) {
      const defaultPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'growth' } })
        || await prisma.subscriptionPlan.findFirst({ where: { isActive: true } });
      
      plan = defaultPlan || {
        id: 'fallback',
        code: 'growth',
        name: 'Growth Plan',
        maxProducts: 500,
        maxTeamMembers: 5,
        customDomainAllowed: true,
        advancedAnalyticsAllowed: true,
      } as any;
    }

    const status = sub?.status || SubscriptionStatus.ACTIVE;

    return {
      productCount,
      maxProducts: plan!.maxProducts,
      teamMemberCount,
      maxTeamMembers: plan!.maxTeamMembers,
      customDomainAllowed: plan!.customDomainAllowed,
      advancedAnalyticsAllowed: plan!.advancedAnalyticsAllowed,
      planName: plan!.name,
      planCode: plan!.code,
      subscriptionStatus: status,
    };
  }

  /**
   * Asserts whether a store can add another product
   */
  async assertCanAddProduct(storeId: string): Promise<void> {
    const entitlements = await this.getStoreEntitlements(storeId);

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
  async assertCanAddTeamMember(storeId: string): Promise<void> {
    const entitlements = await this.getStoreEntitlements(storeId);

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
   * Asserts custom domain feature availability
   */
  async assertCustomDomainAllowed(storeId: string): Promise<void> {
    const entitlements = await this.getStoreEntitlements(storeId);

    if (!entitlements.customDomainAllowed) {
      const err: any = new Error(`Custom domains are not available on the ${entitlements.planName}. Please upgrade your subscription to connect custom domains.`);
      err.statusCode = 403;
      err.code = 'FEATURE_NOT_ALLOWED';
      throw err;
    }
  }

  /**
   * Asserts advanced analytics feature availability
   */
  async assertAdvancedAnalyticsAllowed(storeId: string): Promise<void> {
    const entitlements = await this.getStoreEntitlements(storeId);

    if (!entitlements.advancedAnalyticsAllowed) {
      const err: any = new Error(`Advanced analytics are not available on the ${entitlements.planName}. Please upgrade your subscription to access analytics.`);
      err.statusCode = 403;
      err.code = 'FEATURE_NOT_ALLOWED';
      throw err;
    }
  }
}

export const entitlementService = new EntitlementService();
