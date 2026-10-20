import { apiClient } from './client';
import type { OrderStatus, PaymentStatus, FulfillmentStatus } from '../types';

/**
 * The customer-facing half of the API. Every endpoint here is scoped to the
 * signed-in user server-side — an order that is not theirs does not match the
 * query, so there is no client-side ownership check to get wrong.
 */

export interface AccountProfile {
  id: string;
  name: string;
  email: string;
  plan: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountOrderItem {
  id: string;
  productId: string | null;
  productTitle: string;
  variantTitle?: string | null;
  quantity: number;
  price: number;
  product?: { id: string; title: string; images: string[] } | null;
}

export interface AccountOrderAddress {
  id: string;
  type: 'SHIPPING' | 'BILLING';
  firstName: string;
  lastName: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface AccountOrderStatusEvent {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
}

/**
 * One order from any store on Nexus. A customer identity spans every store, so
 * `store` says which one this order belongs to.
 */
export interface AccountOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  createdAt: string;
  items: AccountOrderItem[];
  addresses: AccountOrderAddress[];
  statusHistory: AccountOrderStatusEvent[];
  merchant: { id: string; name: string; domain: string } | null;
}

export interface AccountAddress {
  id: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault: boolean;
}

export type NewAccountAddress = Omit<AccountAddress, 'id'>;

export async function getAccountProfileApi(): Promise<AccountProfile> {
  const res = await apiClient<{ success: boolean; data: AccountProfile }>('/account/profile');
  return res.data;
}

export async function updateAccountProfileApi(
  updates: { name?: string; phone?: string }
): Promise<AccountProfile> {
  const res = await apiClient<{ success: boolean; data: AccountProfile }>('/account/profile', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return res.data;
}

export async function getAccountOrdersApi(): Promise<AccountOrder[]> {
  const res = await apiClient<{ success: boolean; data: AccountOrder[] }>('/account/orders');
  return res.data;
}

export async function getAccountOrderApi(id: string): Promise<AccountOrder> {
  const res = await apiClient<{ success: boolean; data: AccountOrder }>(`/account/orders/${id}`);
  return res.data;
}

export async function getAccountAddressesApi(): Promise<AccountAddress[]> {
  const res = await apiClient<{ success: boolean; data: AccountAddress[] }>('/account/addresses');
  return res.data;
}

export async function createAccountAddressApi(address: NewAccountAddress): Promise<AccountAddress> {
  const res = await apiClient<{ success: boolean; data: AccountAddress }>('/account/addresses', {
    method: 'POST',
    body: JSON.stringify(address),
  });
  return res.data;
}

export async function deleteAccountAddressApi(id: string): Promise<void> {
  await apiClient(`/account/addresses/${id}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ */
/* Public order tracking — no session required.                        */
/* ------------------------------------------------------------------ */

/** What the carrier reported. Absent until the order actually ships. */
export interface TrackedShipment {
  trackingNumber: string | null;
  carrier: string | null;
  status: string;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface TrackedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  items: AccountOrderItem[];
  shippingAddress: AccountOrderAddress | null;
  statusHistory: AccountOrderStatusEvent[];
  tracking: TrackedShipment | null;
  createdAt: string;
  displayName: string;
}

/**
 * Both values are required: the order number alone is guessable, so the email
 * is what proves the caller is entitled to see the order. The server answers
 * identically whether the order is missing or the email is wrong.
 */
export async function trackOrderApi(orderNumber: string, email: string): Promise<TrackedOrder> {
  const params = new URLSearchParams({ orderNumber: orderNumber.replace(/^#/, ''), email });
  const res = await apiClient<{ success: boolean; data: TrackedOrder }>(
    `/shop/track/search?${params.toString()}`
  );
  return res.data;
}
