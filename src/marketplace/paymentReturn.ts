/**
 * The payment return leg.
 *
 * A gateway sends the customer back to a URL we choose, with the transaction
 * reference on the query string. Nothing in that redirect proves the payment
 * succeeded — the reference has to be verified against the provider, which is
 * what `GET /api/payments/:reference/verify` does server-side before it will
 * mark an order paid.
 */

/** Where a stale reference is parked when the gateway does not echo one back. */
export const PAYMENT_REFERENCE_KEY = 'nexus_payment_reference';

/**
 * The absolute URL the gateway returns the customer to.
 *
 * Built from Vite's `BASE_URL` rather than `window.location.href`: the app can
 * be served from a sub-path, and sending the gateway the current URL meant the
 * customer landed back on the form they had just submitted.
 */
export function checkoutReturnUrl(): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${window.location.origin}${base}checkout/complete`;
}

/**
 * Pull the reference out of a gateway redirect.
 *
 * Paystack appends `reference` (and `trxref`); Flutterwave appends
 * `tx_ref`/`transaction_id`. The session copy is the last resort, for a
 * provider that returns with nothing attached.
 */
export function readPaymentReference(params: URLSearchParams): string | null {
  const fromQuery =
    params.get('reference') ||
    params.get('trxref') ||
    params.get('tx_ref') ||
    params.get('transaction_id');
  if (fromQuery) return fromQuery;

  try {
    return sessionStorage.getItem(PAYMENT_REFERENCE_KEY);
  } catch {
    return null;
  }
}

export function clearPaymentReference() {
  try {
    sessionStorage.removeItem(PAYMENT_REFERENCE_KEY);
  } catch {
    /* nothing to clean up */
  }
}
