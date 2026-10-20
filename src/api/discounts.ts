import { apiClient } from './client';
import { DiscountCode } from '../types';

export async function getDiscountsApi(): Promise<DiscountCode[]> {
  const res = await apiClient<{ success: boolean; data: DiscountCode[] }>('/discounts');
  return res.data;
}

export async function createDiscountApi(discount: Partial<DiscountCode>): Promise<DiscountCode> {
  const res = await apiClient<{ success: boolean; data: DiscountCode }>('/discounts', {
    method: 'POST',
    body: JSON.stringify(discount),
  });
  return res.data;
}

export async function deleteDiscountApi(id: string): Promise<void> {
  await apiClient(`/discounts/${id}`, { method: 'DELETE' });
}

export async function validateDiscountApi(code: string, subtotal: number, merchantRef?: string): Promise<{
  valid: boolean;
  code?: string;
  discountType?: string;
  discountValue?: string;
  discountAmount?: number;
  newTotal?: number;
  message?: string;
}> {
  const res = await apiClient<{
    success: boolean;
    valid: boolean;
    code?: string;
    discountType?: string;
    discountValue?: string;
    discountAmount?: number;
    newTotal?: number;
    message?: string;
  }>('/discounts/validate', {
    method: 'POST',
    body: JSON.stringify({ code, subtotal, merchantRef }),
  });
  return res;
}
