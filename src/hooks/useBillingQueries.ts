import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPlansApi,
  getCurrentSubscriptionApi,
  subscribeToPlanApi,
  changePlanApi,
  changeIntervalApi,
  cancelSubscriptionApi,
  resumeSubscriptionApi,
  getInvoicesApi,
  SubscriptionPlanData,
} from '../api/billing';
import {
  getPlatformMetricsApi,
  getMerchantsAdminApi,
  getPlatformPlansAdminApi,
  createPlatformPlanAdminApi,
  updatePlatformPlanAdminApi,
  getPlatformInvoicesAdminApi,
} from '../api/platformAdmin';

export const billingQueryKeys = {
  plans: ['plans'] as const,
  currentSubscription: ['subscriptions', 'current'] as const,
  invoices: ['subscriptions', 'invoices'] as const,
  platformMetrics: ['admin', 'metrics'] as const,
  platformMerchants: ['admin', 'merchants'] as const,
  platformPlans: ['admin', 'plans'] as const,
  platformInvoices: ['admin', 'invoices'] as const,
};

// Merchant Billing Hooks
export function usePlansQuery(enabled = true) {
  return useQuery({
    queryKey: billingQueryKeys.plans,
    queryFn: getPlansApi,
    enabled,
  });
}

export function useCurrentSubscriptionQuery(enabled = true) {
  return useQuery({
    queryKey: billingQueryKeys.currentSubscription,
    queryFn: getCurrentSubscriptionApi,
    enabled,
  });
}

export function useInvoicesQuery(enabled = true) {
  return useQuery({
    queryKey: billingQueryKeys.invoices,
    queryFn: getInvoicesApi,
    enabled,
  });
}

export function useSubscribeToPlanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planCode, interval }: { planCode: string; interval?: 'MONTHLY' | 'ANNUAL' }) =>
      subscribeToPlanApi(planCode, interval),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.currentSubscription });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.invoices });
    },
  });
}

export function useChangePlanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planCode: string) => changePlanApi(planCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.currentSubscription });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.invoices });
    },
  });
}

export function useChangeIntervalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (interval: 'MONTHLY' | 'ANNUAL') => changeIntervalApi(interval),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.currentSubscription });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.invoices });
    },
  });
}

export function useCancelSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelSubscriptionApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.currentSubscription });
    },
  });
}

export function useResumeSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resumeSubscriptionApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.currentSubscription });
    },
  });
}

// Platform Admin Hooks
export function usePlatformMetricsQuery(enabled = true) {
  return useQuery({
    queryKey: billingQueryKeys.platformMetrics,
    queryFn: getPlatformMetricsApi,
    enabled,
  });
}

export function usePlatformMerchantsQuery(enabled = true) {
  return useQuery({
    queryKey: billingQueryKeys.platformMerchants,
    queryFn: getMerchantsAdminApi,
    enabled,
  });
}

export function usePlatformPlansQuery(enabled = true) {
  return useQuery({
    queryKey: billingQueryKeys.platformPlans,
    queryFn: getPlatformPlansAdminApi,
    enabled,
  });
}

export function useCreatePlatformPlanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: Partial<SubscriptionPlanData>) => createPlatformPlanAdminApi(plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.platformPlans });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.plans });
    },
  });
}

export function useUpdatePlatformPlanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SubscriptionPlanData> }) =>
      updatePlatformPlanAdminApi(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.platformPlans });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.plans });
    },
  });
}

export function usePlatformInvoicesQuery(enabled = true) {
  return useQuery({
    queryKey: billingQueryKeys.platformInvoices,
    queryFn: getPlatformInvoicesAdminApi,
    enabled,
  });
}
