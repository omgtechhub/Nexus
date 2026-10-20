import { apiClient } from './client';

export interface SubscriptionPlanData {
  id: string;
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  trialDays: number;
  isActive: boolean;
  displayOrder: number;
  maxProducts: number;
  maxTeamMembers: number;
  maxMerchants: number;
  storageMb: number;
  customDomainAllowed: boolean;
  advancedAnalyticsAllowed: boolean;
  features: string[];
}

export interface EntitlementsData {
  productCount: number;
  maxProducts: number;
  teamMemberCount: number;
  maxTeamMembers: number;
  customDomainAllowed: boolean;
  advancedAnalyticsAllowed: boolean;
  planName: string;
  planCode: string;
  subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  merchantId: string;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE';
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  items: Array<{ id: string; description: string; amount: number; quantity: number }>;
}

export interface SubscriptionData {
  id: string;
  merchantId: string;
  planId: string;
  plan: SubscriptionPlanData;
  billingInterval: 'MONTHLY' | 'ANNUAL';
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  invoices: InvoiceData[];
}

export interface CurrentSubscriptionResponse {
  subscription: SubscriptionData | null;
  entitlements: EntitlementsData;
}

export async function getPlansApi(): Promise<SubscriptionPlanData[]> {
  const res = await apiClient<{ success: boolean; data: SubscriptionPlanData[] }>('/plans');
  return res.data;
}

export async function getCurrentSubscriptionApi(): Promise<CurrentSubscriptionResponse> {
  const res = await apiClient<{ success: boolean; data: CurrentSubscriptionResponse }>('/subscriptions/current');
  return res.data;
}

export async function subscribeToPlanApi(planCode: string, interval: 'MONTHLY' | 'ANNUAL' = 'MONTHLY'): Promise<{ subscription: SubscriptionData; authorizationUrl?: string }> {
  const res = await apiClient<{ success: boolean; data: { subscription: SubscriptionData; authorizationUrl?: string } }>('/subscriptions/subscribe', {
    method: 'POST',
    body: JSON.stringify({ planCode, interval }),
  });
  return res.data;
}

export async function changePlanApi(planCode: string): Promise<SubscriptionData> {
  const res = await apiClient<{ success: boolean; data: SubscriptionData }>('/subscriptions/change-plan', {
    method: 'POST',
    body: JSON.stringify({ planCode }),
  });
  return res.data;
}

export async function changeIntervalApi(interval: 'MONTHLY' | 'ANNUAL'): Promise<SubscriptionData> {
  const res = await apiClient<{ success: boolean; data: SubscriptionData }>('/subscriptions/change-interval', {
    method: 'POST',
    body: JSON.stringify({ interval }),
  });
  return res.data;
}

export async function cancelSubscriptionApi(): Promise<SubscriptionData> {
  const res = await apiClient<{ success: boolean; data: SubscriptionData }>('/subscriptions/cancel', {
    method: 'POST',
  });
  return res.data;
}

export async function resumeSubscriptionApi(): Promise<SubscriptionData> {
  const res = await apiClient<{ success: boolean; data: SubscriptionData }>('/subscriptions/resume', {
    method: 'POST',
  });
  return res.data;
}

export async function getInvoicesApi(): Promise<InvoiceData[]> {
  const res = await apiClient<{ success: boolean; data: InvoiceData[] }>('/subscriptions/invoices');
  return res.data;
}
