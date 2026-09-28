import { apiClient } from './client';

export interface NavigationItem {
  id: string;
  label: string;
  url: string;
  target?: string;
  order: number;
}

export interface NavigationMenuData {
  id: string;
  storeId: string;
  handle: string;
  title: string;
  items: NavigationItem[];
  createdAt: string;
  updatedAt: string;
}

export async function getNavigationMenusApi(): Promise<NavigationMenuData[]> {
  const res = await apiClient<{ success: boolean; data: NavigationMenuData[] }>('/navigation');
  return res.data;
}

export async function saveNavigationMenuApi(handle: string, title: string, items: NavigationItem[]): Promise<NavigationMenuData> {
  const res = await apiClient<{ success: boolean; data: NavigationMenuData }>(`/navigation/${handle}`, {
    method: 'PUT',
    body: JSON.stringify({ title, items }),
  });
  return res.data;
}

export async function deleteNavigationMenuApi(handle: string): Promise<void> {
  await apiClient(`/navigation/${handle}`, {
    method: 'DELETE',
  });
}
