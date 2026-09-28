import { IPaymentProvider } from './payment.interface.js';
import { PaystackProvider } from './paystack.provider.js';
import { FlutterwaveProvider } from './flutterwave.provider.js';

export function getPaymentProvider(
  providerName?: string,
  customKeys?: { secretKey?: string; webhookSecret?: string }
): IPaymentProvider {
  const normalized = (providerName || 'PAYSTACK').toUpperCase().trim();

  if (normalized === 'FLUTTERWAVE') {
    return new FlutterwaveProvider(customKeys?.secretKey, customKeys?.webhookSecret);
  }

  return new PaystackProvider(customKeys?.secretKey, customKeys?.webhookSecret);
}
