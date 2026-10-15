import crypto from 'crypto';
import {
  IPaymentProvider,
  InitializePaymentParams,
  InitializePaymentResult,
  VerifyPaymentResult,
  RefundParams,
  RefundResult,
} from './payment.interface.js';

/**
 * A simulated gateway, for the integration suite and for local development
 * without credentials.
 *
 * This is the *only* place in the payment layer that may report a success it
 * did not obtain from a gateway, and three things keep that honest:
 *
 *  1. It is opt-in. `PAYMENTS_SANDBOX=true` has to be set; without it an
 *     unconfigured provider refuses to take payments at all.
 *  2. The factory refuses to construct it when `NODE_ENV=production`, so it
 *     cannot be switched on by an environment variable on a live deployment.
 *  3. `isLive` is false and every result carries `simulated: true`, which the
 *     API passes to the client and the confirmation page renders as "simulated
 *     — no money has moved" rather than "payment confirmed".
 *
 * The outcome is derived from the reference so a test can ask for a failure:
 * a reference containing `fail` verifies as FAILED, `pending` as PENDING,
 * anything else as SUCCESS.
 */
export class SandboxPaymentProvider implements IPaymentProvider {
  readonly name: 'PAYSTACK' | 'FLUTTERWAVE';
  readonly isLive = false;
  private webhookSecret: string;

  constructor(name: 'PAYSTACK' | 'FLUTTERWAVE' = 'PAYSTACK', webhookSecret?: string) {
    this.name = name;
    this.webhookSecret = (webhookSecret || process.env.SANDBOX_WEBHOOK_SECRET || '').trim();
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    // A page we serve, which states plainly that nothing was charged. It is
    // not the real callback with `?status=success` glued on, which is what the
    // old simulation did — that made a skipped gateway indistinguishable from
    // a completed one.
    const base = params.callbackUrl || 'http://localhost:5173/checkout/complete';
    const joiner = base.includes('?') ? '&' : '?';
    const authorizationUrl =
      `${base}${joiner}reference=${encodeURIComponent(params.reference)}&simulated=1`;

    return {
      success: true,
      authorizationUrl,
      reference: params.reference,
      accessCode: `sandbox_${crypto.randomBytes(4).toString('hex')}`,
      providerData: { sandbox: true },
      simulated: true,
    };
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    const lower = reference.toLowerCase();
    const status: VerifyPaymentResult['status'] = lower.includes('fail')
      ? 'FAILED'
      : lower.includes('pending')
        ? 'PENDING'
        : 'SUCCESS';

    return {
      success: status === 'SUCCESS',
      reference,
      amount: 0,
      currency: 'USD',
      status,
      gatewayResponse: 'Simulated transaction — no gateway was contacted',
      rawResponse: { sandbox: true, reference, status },
      simulated: true,
    };
  }

  /**
   * Accepts an HMAC against a configured sandbox secret, and nothing else.
   *
   * Deliberately not a fixed magic string: the strings the real providers used
   * to accept (`test_paystack_signature`) were a remote "mark this order paid"
   * switch, because the webhook handler trusts a valid signature.
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (!this.webhookSecret || !signature || !rawBody) return false;

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
    return {
      success: true,
      refundReference: `sandbox_ref_${crypto.randomBytes(4).toString('hex')}`,
      amount: params.amount || 0,
      currency: 'USD',
      status: 'SUCCESS',
      rawResponse: { sandbox: true },
    };
  }
}
