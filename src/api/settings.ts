import { apiClient } from './client';
import { StoreSettings } from '../types';

export async function getStoreSettingsApi(): Promise<StoreSettings> {
  const res = await apiClient<{ success: boolean; data: StoreSettings }>('/settings');
  return res.data;
}

export async function updateStoreSettingsApi(settings: Partial<StoreSettings>): Promise<StoreSettings> {
  const res = await apiClient<{ success: boolean; data: StoreSettings }>('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return res.data;
}
