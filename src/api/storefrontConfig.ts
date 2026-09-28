import { apiClient } from './client';

export interface StorefrontSection {
  id: string;
  type: string;
  enabled: boolean;
  settings: Record<string, any>;
}

export interface StorefrontTheme {
  primaryColor: string;
  fontFamily: string;
  accentColor: string;
  bannerText: string;
}

export interface StorefrontConfigData {
  theme: StorefrontTheme;
  sections: StorefrontSection[];
}

export interface StorefrontConfigResponse {
  draftConfig: StorefrontConfigData;
  publishedConfig: StorefrontConfigData | null;
  isPublished: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

export async function getStorefrontConfigApi(): Promise<StorefrontConfigResponse> {
  const res = await apiClient<{ success: boolean; data: StorefrontConfigResponse }>('/storefront-config');
  return res.data;
}

export async function updateStorefrontDraftConfigApi(draftConfig: Partial<StorefrontConfigData>): Promise<StorefrontConfigResponse> {
  const res = await apiClient<{ success: boolean; data: StorefrontConfigResponse }>('/storefront-config', {
    method: 'PATCH',
    body: JSON.stringify({ draftConfig }),
  });
  return res.data;
}

export async function publishStorefrontConfigApi(): Promise<StorefrontConfigResponse> {
  const res = await apiClient<{ success: boolean; data: StorefrontConfigResponse }>('/storefront-config/publish', {
    method: 'POST',
  });
  return res.data;
}
