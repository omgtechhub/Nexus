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

/**
 * Paystack.
 *
 * Every method here either reports what Paystack actually said or throws.
 * There is deliberately no fallback path that invents a result.
 *
 * The version this replaced had three, and together they made the whole
 * payment flow a no-op that reported success:
 *
 *  1. `initializePayment` returned, as the "authorization URL", our own
 *     callback with `?status=success` appended — so the customer was bounced
 *     straight back to the confirmation page without a gateway, a card form or
 *     a charge.
 *  2. `verifyPayment` returned `status: 'SUCCESS'` unconditionally, so the
 *     server-side verification that is supposed to be the authority for
 *     marking an order paid always said yes.
 *  3. Both fell through to those paths **after a failed real API call**, so a
 *     wrong key, an expired key or a Paystack outage silently became a
 *     completed payment in production, not just in development.
 *
 * `verifyWebhookSignature` also accepted the literal strings
 * `test_paystack_signature` and `valid_paystack_signature`. The webhook
 * handler marks an order PAID on a valid signature, so those two constants
 * were a remote "mark any order as paid" endpoint for anyone who read the
 * source. They are gone; the HMAC is the only accepted proof.
 */
export class PaystackProvider implements IPaymentProvider {
  readonly name = 'PAYSTACK' as const;
  readonly isLive: boolean;
  private secretKey: string;
  private webhookSecret: string;

  constructor(secretKey?: string, webhookSecret?: string) {
    this.secretKey = (secretKey || process.env.PAYSTACK_SECRET_KEY || '').trim();
    this.webhookSecret = (
      webhookSecret ||
      process.env.PAYSTACK_WEBHOOK_SECRET ||
      this.secretKey
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
      // Unreachable gateway. Not knowing the outcome is not the same as a
      // successful payment, so it propagates.
      throw new PaymentGatewayError(this.name, `request failed: ${(err as Error).message}`);
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      throw new PaymentGatewayError(this.name, `HTTP ${response.status} with an unreadable body`);
    }

    if (!response.ok || data?.status !== true || !data?.data) {
      const detail = data?.message || `HTTP ${response.status}`;
      throw new PaymentGatewayError(this.name, detail);
    }

    return data.data;
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    this.requireKey();

    const data = await this.call('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        amount: Math.round(params.amount * 100), // kobo
        email: params.email,
        reference: params.reference,
        currency: params.currency || 'USD',
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });

    if (!data.authorization_url) {
      throw new PaymentGatewayError(this.name, 'initialize returned no authorization_url');
    }

    return {
      success: true,
      authorizationUrl: data.authorization_url,
      reference: data.reference || params.reference,
      accessCode: data.access_code,
      providerData: data,
      simulated: false,
    };
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    this.requireKey();

    const data = await this.call(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`
    );

    const gatewayStatus = String(data.status || '').toLowerCase();
    const status: VerifyPaymentResult['status'] =
      gatewayStatus === 'success'
        ? 'SUCCESS'
        : gatewayStatus === 'failed'
          ? 'FAILED'
          : gatewayStatus === 'abandoned' || gatewayStatus === 'reversed'
            ? 'CANCELLED'
            : 'PENDING';

    return {
      success: status === 'SUCCESS',
      reference: data.reference || reference,
      amount: typeof data.amount === 'number' ? data.amount / 100 : 0,
      currency: data.currency || 'USD',
      status,
      gatewayResponse: data.gateway_response,
      rawResponse: data,
      simulated: false,
    };
  }

  /**
   * HMAC-SHA512 of the raw body against the webhook secret, compared in
   * constant time. Nothing else is accepted.
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (!this.isLive || !signature || !rawBody) return false;

    const expected = crypto
      .createHmac('sha512', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    const given = Buffer.from(signature, 'utf8');
    const want = Buffer.from(expected, 'utf8');
    if (given.length !== want.length) return false;
    return crypto.timingSafeEqual(given, want);
  }

  async processRefund(params: RefundParams): Promise<RefundResult> {
    this.requireKey();

    const data = await this.call('https://api.paystack.co/refund', {
      method: 'POST',
      body: JSON.stringify({
        transaction: params.transactionReference,
        amount: params.amount ? Math.round(params.amount * 100) : undefined,
        merchant_note: params.reason,
      }),
    });

    return {
      success: true,
      refundReference: data.reference || String(data.id || ''),
      amount: typeof data.amount === 'number' ? data.amount / 100 : params.amount || 0,
      currency: data.currency || 'USD',
      status: 'SUCCESS',
      rawResponse: data,
    };
  }
}
