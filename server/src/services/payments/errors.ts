/**
 * Payment failures that callers must distinguish.
 *
 * Previously there was no way to fail: both providers answered every question
 * with a fabricated success when they could not reach the gateway, so an
 * unconfigured key, a network blip and a declined card were indistinguishable
 * from a completed payment. These exist so "we do not know" can never be
 * reported as "paid".
 */

/** No usable credentials, so no payment can be taken at all. */
export class PaymentNotConfiguredError extends Error {
  readonly code = 'PAYMENTS_NOT_CONFIGURED';
  constructor(provider: string) {
    super(
      `${provider} is not configured. Set a real secret key before taking payments; ` +
        'set PAYMENTS_SANDBOX=true for a clearly-labelled simulated provider in development.'
    );
    this.name = 'PaymentNotConfiguredError';
  }
}

/** The gateway was reachable but refused, errored, or answered unusably. */
export class PaymentGatewayError extends Error {
  readonly code = 'PAYMENT_GATEWAY_ERROR';
  readonly provider: string;
  constructor(provider: string, message: string) {
    super(`${provider}: ${message}`);
    this.name = 'PaymentGatewayError';
    this.provider = provider;
  }
}

/**
 * Values that look like a key but are not one.
 *
 * `server/.env` shipped with `PAYSTACK_SECRET_KEY=sk_live_xxxx...`. It did not
 * contain the old code's `nexus_mock` marker, so the provider believed it was
 * live, called Paystack, got an error back — and then fell through to the
 * simulated success path. A placeholder has to be recognised as *absent*, not
 * as configured.
 */
const PLACEHOLDER_MARKERS = [
  'nexus_mock',
  'xxxx',
  'your_',
  'your-',
  'changeme',
  'change_me',
  'replace_me',
  'placeholder',
  'example',
  'todo',
];

export function isUsableSecretKey(key: string | undefined | null): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.length < 16) return false;
  const lower = trimmed.toLowerCase();
  return !PLACEHOLDER_MARKERS.some(marker => lower.includes(marker));
}
