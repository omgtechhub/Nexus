import { apiClient } from './client';
import { Order } from '../types';

export interface GetOrdersParams {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function getOrdersApi(params?: GetOrdersParams): Promise<Order[]> {
  const query = new URLSearchParams();
  if (params?.q) query.append('q', params.q);
  if (params?.status) query.append('status', params.status);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const res = await apiClient<{ success: boolean; data: Order[] }>(`/orders${queryString}`);
  return res.data;
}

export async function createOrderApi(orderPayload: any): Promise<Order> {
  const res = await apiClient<{ success: boolean; data: Order }>('/orders', {
    method: 'POST',
    body: JSON.stringify(orderPayload),
  });
  return res.data;
}

export async function updateOrderApi(id: string, updates: Partial<Order>): Promise<Order> {
  const res = await apiClient<{ success: boolean; data: Order }>(`/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return res.data;
}

export async function cancelOrderApi(id: string, reason?: string): Promise<Order> {
  const res = await apiClient<{ success: boolean; data: Order }>(`/orders/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.data;
}
