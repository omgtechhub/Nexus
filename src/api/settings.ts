import { apiClient } from './client';
import { MerchantSettings } from '../types';

export async function getMerchantSettingsApi(): Promise<MerchantSettings> {
  const res = await apiClient<{ success: boolean; data: MerchantSettings }>('/settings');
  return res.data;
}

export async function updateMerchantSettingsApi(settings: Partial<MerchantSettings>): Promise<MerchantSettings> {
  const res = await apiClient<{ success: boolean; data: MerchantSettings }>('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return res.data;
}
