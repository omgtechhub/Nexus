import { apiClient } from './client';

export interface InitializePaymentParams {
  orderId: string;
  provider?: 'PAYSTACK' | 'FLUTTERWAVE';
  callbackUrl?: string;
  /**
   * The address the order was placed with.
   *
   * Proves the caller is the person who placed it. The endpoint has to stay
   * open for guest checkout, but it used to accept a bare `orderId` from
   * anyone — so a guessed id returned a stranger's total and gateway URL.
   * Unnecessary when the buyer is signed in as that customer, and harmless
   * to send anyway.
   */
  customerEmail?: string;
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
    /** True when no real gateway is involved (an explicit sandbox). */
    simulated?: boolean;
  };
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  data: {
    paymentStatus: string;
    orderStatus: string;
    orderNumber: string;
    gatewayResponse?: string;
    /**
     * True when the verdict came from the sandbox provider rather than a
     * gateway. The confirmation page must say so instead of claiming a
     * payment was taken.
     */
    simulated?: boolean;
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
  merchantId: string;
  orderId: string;
  provider: 'PAYSTACK' | 'FLUTTERWAVE';
  providerReference: string;
  amount: number;
  currency: string;
  status: string;
  /**
   * The platform/merchant split, fixed when the payment settled.
   *
   * Null for a payment taken before payouts existed, and for one that has not
   * settled. The Payments section shows a dash in that case rather than the
   * client-side guess at a gateway fee it used to invent.
   */
  platformFeeAmount?: number | null;
  merchantNetAmount?: number | null;
  commissionRate?: number | null;
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
