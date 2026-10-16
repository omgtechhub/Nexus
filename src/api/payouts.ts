import { apiClient } from './client';

/**
 * Merchant payouts.
 *
 * The Payments section previously invented all of this: a $14,820.50 balance
 * whenever there were no real payments, a hardcoded "2.1% + $0.30" processing
 * fee that matched no actual rate, four fabricated transactions with invented
 * customer names, and a "Request Instant Payout" button that was a
 * `setTimeout` followed by a toast claiming the money had been transferred to
 * the merchant's bank. No request was made; nothing moved.
 */

export interface MerchantBalance {
  currency: string;
  /** Merchant's share of every settled payment, lifetime. */
  grossEarned: number;
  /** Platform commission withheld, lifetime. */
  platformFees: number;
  refunded: number;
  paidOut: number;
  pendingPayouts: number;
  available: number;
  /** Percentage. 0 means the platform takes nothing. */
  commissionRate: number;
}

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REVERSED';

export interface Payout {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  method: 'MANUAL' | 'PROVIDER_TRANSFER';
  note: string | null;
  failureReason: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface PayoutAccount {
  accountName: string;
  bankName: string;
  bankCode: string;
  /** Only the last four digits are ever stored or returned. */
  accountNumberLast4: string;
  provider: string;
  verifiedAt: string | null;
  updatedAt: string;
}

export interface PayoutAccountInput {
  accountName: string;
  bankName: string;
  bankCode: string;
  /** Sent once; the server keeps only the last four digits. */
  accountNumber: string;
}

export async function fetchMerchantBalanceApi(): Promise<MerchantBalance> {
  const res = await apiClient<{ success: boolean; data: MerchantBalance }>('/payouts/balance');
  return res.data;
}

export async function fetchMyPayoutsApi(): Promise<Payout[]> {
  const res = await apiClient<{ success: boolean; data: Payout[] }>('/payouts');
  return res.data;
}

export async function fetchPayoutAccountApi(): Promise<PayoutAccount | null> {
  const res = await apiClient<{ success: boolean; data: PayoutAccount | null }>('/payouts/account');
  return res.data;
}

export async function savePayoutAccountApi(input: PayoutAccountInput): Promise<PayoutAccount> {
  const res = await apiClient<{ success: boolean; data: PayoutAccount }>('/payouts/account', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return res.data;
}
