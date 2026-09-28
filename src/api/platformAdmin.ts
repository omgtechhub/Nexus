import { apiClient } from './client';
import { SubscriptionPlanData, InvoiceData } from './billing';

export interface PlatformMetricsData {
  totalStores: number;
  totalUsers: number;
  activeSubscriptionsCount: number;
  mrr: number;
  arr: number;
  totalRevenue: number;
  totalTransactionsCount: number;
  plansCount: number;
}

export interface MerchantAdminData {
  id: string;
  name: string;
  domain: string;
  status: string;
  owner: { id: string; name: string; email: string; createdAt: string };
  subscription: {
    id: string;
    planName: string;
    planCode: string;
    status: string;
    interval: string;
    currentPeriodEnd: string;
  } | null;
  metrics: {
    productCount: number;
    memberCount: number;
    orderCount: number;
  };
  createdAt: string;
}

export async function getPlatformMetricsApi(): Promise<PlatformMetricsData> {
  const res = await apiClient<{ success: boolean; data: PlatformMetricsData }>('/admin/metrics');
  return res.data;
}

export async function getMerchantsAdminApi(): Promise<MerchantAdminData[]> {
  const res = await apiClient<{ success: boolean; data: MerchantAdminData[] }>('/admin/merchants');
  return res.data;
}

export async function getPlatformPlansAdminApi(): Promise<SubscriptionPlanData[]> {
  const res = await apiClient<{ success: boolean; data: SubscriptionPlanData[] }>('/admin/plans');
  return res.data;
}

export async function createPlatformPlanAdminApi(plan: Partial<SubscriptionPlanData>): Promise<SubscriptionPlanData> {
  const res = await apiClient<{ success: boolean; data: SubscriptionPlanData }>('/admin/plans', {
    method: 'POST',
    body: JSON.stringify(plan),
  });
  return res.data;
}

export async function updatePlatformPlanAdminApi(id: string, updates: Partial<SubscriptionPlanData>): Promise<SubscriptionPlanData> {
  const res = await apiClient<{ success: boolean; data: SubscriptionPlanData }>(`/admin/plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return res.data;
}

export async function getPlatformInvoicesAdminApi(): Promise<InvoiceData[]> {
  const res = await apiClient<{ success: boolean; data: InvoiceData[] }>('/admin/invoices');
  return res.data;
}
