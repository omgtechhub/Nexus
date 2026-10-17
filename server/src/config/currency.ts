/**
 * The currency a new store trades in.
 *
 * Every store was created as `'USD — US Dollar'` and every payment defaulted
 * to `'USD'`, hardcoded in four places — on a platform that settles through
 * Paystack and Flutterwave and whose support number is Nigerian. That is not
 * merely untidy: **Paystack rejects a transaction in a currency the merchant
 * account has not enabled**, so on a Nigerian account every checkout failed at
 * `transaction/initialize` with "Currency not supported by merchant" and no
 * order could ever be paid.
 *
 * `DEFAULT_CURRENCY` is the one place to change it. It is a platform-level
 * deployment fact — which gateway account the money lands in — rather than a
 * per-merchant preference, which is why it is an environment variable and not
 * a store setting. Existing stores keep whatever they were created with.
 */

export interface CurrencyOption {
  code: string;
  label: string;
}

/** What the supported gateways can actually settle. */
export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'NGN', label: 'NGN — Nigerian Naira' },
  { code: 'GHS', label: 'GHS — Ghanaian Cedi' },
  { code: 'KES', label: 'KES — Kenyan Shilling' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'USD', label: 'USD — US Dollar' },
];

/**
 * The configured default, as an ISO code.
 *
 * Unset falls back to USD, which preserves the behaviour every existing store
 * was created with. A deployment trading in naira sets `DEFAULT_CURRENCY=NGN`.
 */
export function defaultCurrencyCode(): string {
  const raw = (process.env.DEFAULT_CURRENCY || '').trim().toUpperCase();
  if (!raw) return 'USD';

  const known = SUPPORTED_CURRENCIES.find(c => c.code === raw);
  // An unrecognised code is a misconfiguration, and guessing is worse than
  // falling back to the documented default.
  return known ? known.code : 'USD';
}

/**
 * The display string `StoreSettings.currency` and `Store.currency` hold.
 *
 * Those columns store a human label ("USD — US Dollar"), not a bare code,
 * which is why `quote.service.ts` has to split on the separator to recover
 * the code. Kept consistent here rather than reconstructed at each call site.
 */
export function defaultCurrencyLabel(): string {
  const code = defaultCurrencyCode();
  return SUPPORTED_CURRENCIES.find(c => c.code === code)?.label ?? 'USD — US Dollar';
}

/**
 * Recover the ISO code from whatever a store has in its currency column.
 *
 * Those columns hold a display label ("NGN — Nigerian Naira"), so the code is
 * the leading token. Tolerates a bare code too, since not every row was
 * written through the same path.
 */
export function currencyCodeOf(value: string | null | undefined): string {
  if (!value) return defaultCurrencyCode();
  const code = value.split(/[\s—-]/)[0].trim().toUpperCase();
  return code || defaultCurrencyCode();
}
