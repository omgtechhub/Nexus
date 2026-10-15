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
  /** True when no real gateway was involved. Must reach the UI. */
  simulated?: boolean;
}

export interface VerifyPaymentResult {
  success: boolean;
  reference: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED';
  gatewayResponse?: string;
  rawResponse?: any;
  /**
   * True when this verdict came from a simulation rather than a gateway.
   *
   * The UI must never present a simulated result as a confirmed payment. This
   * mirrors `provider.isLive` in the Nexus IQ service, for the same reason:
   * stub output that reads as real output is worse than no output.
   */
  simulated?: boolean;
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
  /**
   * False when this provider cannot move money — an explicit sandbox.
   * Every response it produces carries `simulated: true`.
   */
  readonly isLive: boolean;
  
  initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult>;
  verifyPayment(reference: string): Promise<VerifyPaymentResult>;
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean;
  processRefund(params: RefundParams): Promise<RefundResult>;
}
