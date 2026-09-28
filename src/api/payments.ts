import { apiClient } from './client';

export interface InitializePaymentParams {
  orderId: string;
  provider?: 'PAYSTACK' | 'FLUTTERWAVE';
  callbackUrl?: string;
}

export interface InitializePaymentResponse {
  success: boolean;
  data: {
    paymentId: string;
    reference: string;
    authorizationUrl: string;
    accessCode?: string;
    amount: number;
    currency: string;
  };
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  data: {
    paymentStatus: string;
    orderStatus: string;
    orderNumber: string;
  };
}

export interface RefundParams {
  amount?: number;
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  message: string;
  refund: {
    amount: number;
    currency: string;
    status: string;
  };
}

export interface PaymentRecord {
  id: string;
  storeId: string;
  orderId: string;
  provider: 'PAYSTACK' | 'FLUTTERWAVE';
  providerReference: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  order?: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
  };
  transactions?: any[];
  refunds?: any[];
}

export async function initializePaymentApi(data: InitializePaymentParams): Promise<InitializePaymentResponse> {
  return apiClient<InitializePaymentResponse>('/payments/initialize', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function verifyPaymentApi(reference: string): Promise<VerifyPaymentResponse> {
  return apiClient<VerifyPaymentResponse>(`/payments/${reference}/verify`);
}

export async function refundOrderApi(orderId: string, data: RefundParams): Promise<RefundResponse> {
  return apiClient<RefundResponse>(`/payments/orders/${orderId}/refund`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPaymentsApi(): Promise<PaymentRecord[]> {
  const res = await apiClient<{ success: boolean; data: PaymentRecord[] }>('/payments');
  return res.data;
}
