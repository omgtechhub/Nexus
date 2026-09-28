export interface InitializePaymentParams {
  amount: number; // in minor units (cents / kobo / pesewas) or standard units depending on provider
  currency: string;
  email: string;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
  customerName?: string;
}

export interface InitializePaymentResult {
  success: boolean;
  authorizationUrl: string;
  reference: string;
  accessCode?: string;
  providerData?: any;
}

export interface VerifyPaymentResult {
  success: boolean;
  reference: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED';
  gatewayResponse?: string;
  rawResponse?: any;
}

export interface RefundParams {
  transactionReference: string;
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundReference: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  rawResponse?: any;
}

export interface IPaymentProvider {
  readonly name: 'PAYSTACK' | 'FLUTTERWAVE';
  
  initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult>;
  verifyPayment(reference: string): Promise<VerifyPaymentResult>;
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean;
  processRefund(params: RefundParams): Promise<RefundResult>;
}
