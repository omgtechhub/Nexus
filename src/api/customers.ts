import { apiClient } from './client';
import { Customer } from '../types';

export interface GetCustomersParams {
  q?: string;
  page?: number;
  limit?: number;
}

export async function getCustomersApi(params?: GetCustomersParams): Promise<Customer[]> {
  const query = new URLSearchParams();
  if (params?.q) query.append('q', params.q);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const res = await apiClient<{ success: boolean; data: Customer[] }>(`/customers${queryString}`);
  return res.data;
}

export async function createCustomerApi(customer: Partial<Customer>): Promise<Customer> {
  const res = await apiClient<{ success: boolean; data: Customer }>('/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  });
  return res.data;
}

export async function updateCustomerApi(id: string, updates: Partial<Customer>): Promise<Customer> {
  const res = await apiClient<{ success: boolean; data: Customer }>(`/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return res.data;
}

export async function deleteCustomerApi(id: string): Promise<void> {
  await apiClient(`/customers/${id}`, { method: 'DELETE' });
}
