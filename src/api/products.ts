import { apiClient } from './client';
import { Product } from '../types';

export interface GetProductsParams {
  q?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function getProductsApi(params?: GetProductsParams): Promise<Product[]> {
  const query = new URLSearchParams();
  if (params?.q) query.append('q', params.q);
  if (params?.category) query.append('category', params.category);
  if (params?.status) query.append('status', params.status);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const res = await apiClient<{ success: boolean; data: Product[] }>(`/products${queryString}`);
  return res.data;
}

export async function getProductByIdApi(id: string): Promise<Product> {
  const res = await apiClient<{ success: boolean; data: Product }>(`/products/${id}`);
  return res.data;
}

export async function createProductApi(product: Partial<Product>): Promise<Product> {
  const res = await apiClient<{ success: boolean; data: Product }>('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
  return res.data;
}

export async function updateProductApi(id: string, updates: Partial<Product>): Promise<Product> {
  const res = await apiClient<{ success: boolean; data: Product }>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return res.data;
}

export async function deleteProductApi(id: string): Promise<void> {
  await apiClient(`/products/${id}`, { method: 'DELETE' });
}
