import { apiClient } from './client';

export interface StorePageData {
  id: string;
  storeId: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getPagesApi(): Promise<StorePageData[]> {
  const res = await apiClient<{ success: boolean; data: StorePageData[] }>('/pages');
  return res.data;
}

export async function createPageApi(page: { title: string; slug?: string; content?: string; isPublished?: boolean; metaTitle?: string; metaDescription?: string }): Promise<StorePageData> {
  const res = await apiClient<{ success: boolean; data: StorePageData }>('/pages', {
    method: 'POST',
    body: JSON.stringify(page),
  });
  return res.data;
}

export async function updatePageApi(id: string, page: Partial<StorePageData>): Promise<StorePageData> {
  const res = await apiClient<{ success: boolean; data: StorePageData }>(`/pages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(page),
  });
  return res.data;
}

export async function deletePageApi(id: string): Promise<void> {
  await apiClient(`/pages/${id}`, {
    method: 'DELETE',
  });
}
