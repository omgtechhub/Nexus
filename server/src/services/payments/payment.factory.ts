import { IPaymentProvider } from './payment.interface.js';
import { PaystackProvider } from './paystack.provider.js';
import { FlutterwaveProvider } from './flutterwave.provider.js';
import { SandboxPaymentProvider } from './sandbox.provider.js';
import { isUsableSecretKey } from './errors.js';

/**
 * Choose a payment provider.
 *
 * Order matters:
 *
 *  1. An explicitly-enabled sandbox, which is refused outright in production.
 *  2. The real provider, which throws rather than inventing a result when it
 *     has no usable key or the gateway errors.
 *
 * There is no third case. The old factory always returned a real provider, and
 * the real provider silently simulated a success whenever it could not reach
 * the gateway — so "no credentials" and "payment completed" were the same
 * thing from the caller's point of view.
 */
export function sandboxEnabled(): boolean {
  const flag = (process.env.PAYMENTS_SANDBOX || '').trim().toLowerCase();
  const on = flag === 'true' || flag === '1' || flag === 'yes';
  if (!on) return false;

  // A deployment must not be able to turn simulated payments on by setting an
  // environment variable.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'PAYMENTS_SANDBOX is set in production. Simulated payments cannot be enabled on a live deployment.'
    );
  }
  return true;
}

export function getPaymentProvider(
  providerName?: string,
  customKeys?: { secretKey?: string; webhookSecret?: string }
): IPaymentProvider {
  const normalized = (providerName || 'PAYSTACK').toUpperCase().trim();
  const name: 'PAYSTACK' | 'FLUTTERWAVE' =
    normalized === 'FLUTTERWAVE' ? 'FLUTTERWAVE' : 'PAYSTACK';

  if (sandboxEnabled()) {
    return new SandboxPaymentProvider(name, customKeys?.webhookSecret);
  }

  if (name === 'FLUTTERWAVE') {
    return new FlutterwaveProvider(customKeys?.secretKey, customKeys?.webhookSecret);
  }
  return new PaystackProvider(customKeys?.secretKey, customKeys?.webhookSecret);
}

/** Whether real payments can be taken right now, for a readiness check. */
export function paymentsConfigured(): boolean {
  return (
    isUsableSecretKey(process.env.PAYSTACK_SECRET_KEY) ||
    isUsableSecretKey(process.env.FLUTTERWAVE_SECRET_KEY)
  );
}
