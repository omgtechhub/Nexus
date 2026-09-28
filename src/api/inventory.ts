import { apiClient } from './client';

export interface InventoryItemResponse {
  id: string;
  storeId: string;
  productId: string;
  variantId?: string;
  sku: string;
  stock: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  product?: {
    id: string;
    title: string;
    name: string;
    sku: string;
    category: string;
    images?: string[];
  };
  variant?: {
    id: string;
    title: string;
    sku: string;
  };
  updatedAt: string;
}

export async function getInventoryApi(): Promise<InventoryItemResponse[]> {
  const res = await apiClient<{ success: boolean; data: InventoryItemResponse[] }>('/inventory');
  return res.data;
}

export async function getProductInventoryApi(productId: string): Promise<InventoryItemResponse[]> {
  const res = await apiClient<{ success: boolean; data: InventoryItemResponse[] }>(`/inventory/${productId}`);
  return res.data;
}

export async function adjustStockApi(
  productId: string,
  changeQuantity: number,
  reason?: string,
  variantId?: string
): Promise<{ item: InventoryItemResponse; movement: any }> {
  const res = await apiClient<{ success: boolean; data: { item: InventoryItemResponse; movement: any } }>(
    `/inventory/${productId}/adjust`,
    {
      method: 'POST',
      body: JSON.stringify({ changeQuantity, reason, variantId }),
    }
  );
  return res.data;
}
