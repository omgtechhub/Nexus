import crypto from 'crypto';
import {
  IPaymentProvider,
  InitializePaymentParams,
  InitializePaymentResult,
  VerifyPaymentResult,
  RefundParams,
  RefundResult,
} from './payment.interface.js';
import { PaymentGatewayError, PaymentNotConfiguredError, isUsableSecretKey } from './errors.js';
import { defaultCurrencyCode } from '../../config/currency.js';

/**
 * Flutterwave.
 *
 * Same contract as the Paystack provider: report what the gateway said, or
 * throw. See `paystack.provider.ts` for the three simulated-success paths both
 * of these used to have, and why a failed API call must not become a payment.
 *
 * `verifyWebhookSignature` previously also accepted the literal strings
 * `test_flutterwave_signature` and `valid_flutterwave_signature`, which the
 * webhook handler treats as authority to mark an order PAID.
 */
export class FlutterwaveProvider implements IPaymentProvider {
  readonly name = 'FLUTTERWAVE' as const;
  readonly isLive: boolean;
  private secretKey: string;
  private webhookSecret: string;

  constructor(secretKey?: string, webhookSecret?: string) {
    this.secretKey = (secretKey || process.env.FLUTTERWAVE_SECRET_KEY || '').trim();
    this.webhookSecret = (
      webhookSecret ||
      process.env.FLUTTERWAVE_WEBHOOK_SECRET ||
      ''
    ).trim();
    this.isLive = isUsableSecretKey(this.secretKey);
  }

  private requireKey() {
    if (!this.isLive) throw new PaymentNotConfiguredError(this.name);
  }

  private async call(url: string, init?: RequestInit): Promise<any> {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
          ...(init?.headers as Record<string, string>),
        },
      });
    } catch (err) {
      throw new PaymentGatewayError(this.name, `request failed: ${(err as Error).message}`);
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      throw new PaymentGatewayError(this.name, `HTTP ${response.status} with an unreadable body`);
    }

    if (!response.ok || data?.status !== 'success' || !data?.data) {
      throw new PaymentGatewayError(this.name, data?.message || `HTTP ${response.status}`);
    }

    return data.data;
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    this.requireKey();

    const data = await this.call('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      body: JSON.stringify({
        tx_ref: params.reference,
        amount: params.amount,
        currency: params.currency || defaultCurrencyCode(),
        redirect_url: params.callbackUrl,
        customer: { email: params.email, name: params.customerName },
        meta: params.metadata,
      }),
    });

    if (!data.link) {
      throw new PaymentGatewayError(this.name, 'initialize returned no payment link');
    }

    return {
      success: true,
      authorizationUrl: data.link,
      reference: params.reference,
      providerData: data,
      simulated: false,
    };
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    this.requireKey();

    const data = await this.call(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`
    );

    const gatewayStatus = String(data.status || '').toLowerCase();
    const status: VerifyPaymentResult['status'] =
      gatewayStatus === 'successful'
        ? 'SUCCESS'
        : gatewayStatus === 'failed'
          ? 'FAILED'
          : gatewayStatus === 'cancelled'
            ? 'CANCELLED'
            : 'PENDING';

    return {
      success: status === 'SUCCESS',
      reference: data.tx_ref || reference,
      amount: typeof data.amount === 'number' ? data.amount : 0,
      currency: data.currency || defaultCurrencyCode(),
      status,
      gatewayResponse: data.processor_response,
      rawResponse: data,
      simulated: false,
    };
  }

  /**
   * Flutterwave sends the configured verif-hash verbatim rather than an HMAC,
   * so the comparison is against the secret itself — but in constant time, and
   * only when a secret is actually configured.
   */
  verifyWebhookSignature(_rawBody: string | Buffer, signature: string): boolean {
    if (!this.isLive || !signature || !this.webhookSecret) return false;

    const given = Buffer.from(signature, 'utf8');
    const want = Buffer.from(this.webhookSecret, 'utf8');
    if (given.length !== want.length) return false;
    return crypto.timingSafeEqual(given, want);
  }

  async processRefund(params: RefundParams): Promise<RefundResult> {
    this.requireKey();

    const data = await this.call(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(params.transactionReference)}/refund`,
      { method: 'POST', body: JSON.stringify({ amount: params.amount }) }
    );

    return {
      success: true,
      refundReference: String(data.id || params.transactionReference),
      amount: typeof data.amount_refunded === 'number' ? data.amount_refunded : params.amount || 0,
      currency: data.currency || defaultCurrencyCode(),
      status: 'SUCCESS',
      rawResponse: data,
    };
  }
}
