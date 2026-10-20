/**
 * Money formatting for every seller- and admin-facing figure.
 *
 * Five dashboard sections each carried their own
 * `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`. On a
 * naira platform that reported ₦42,000 of revenue as "$42,000" — a merchant
 * misreading their own earnings by the exchange rate. It is the same defect
 * the email templates had before `formatMoney` replaced their hardcoded `$`,
 * and the fix is the same: one formatter, told what the platform trades in.
 *
 * **The currency is a platform fact, not a per-merchant one.** One gateway
 * account takes every payment and Nexus issues the receipt, so there is a
 * single answer for the whole install — the same reasoning that made tax a
 * platform setting. It is therefore a build-time constant rather than
 * something each component resolves at runtime.
 *
 * `VITE_DEFAULT_CURRENCY` and the API's `DEFAULT_CURRENCY` are fed by **one
 * `.env` line** in docker-compose, so the browser and the server cannot
 * disagree about what a price means. Changing it needs a frontend rebuild,
 * because Vite inlines the value.
 */

/** The ISO code every figure in the app is denominated in. */
export const PLATFORM_CURRENCY = (import.meta.env.VITE_DEFAULT_CURRENCY || 'NGN')
  .trim()
  .toUpperCase();

/**
 * Locale is left to the browser deliberately.
 *
 * The currency is fixed, but digit grouping and symbol placement should read
 * naturally wherever the shopper is — and `productHelpers.formatPrice`, the
 * customer-facing formatter, already behaves this way. Pinning `en-US` here
 * would make the two surfaces disagree on the same number.
 */
function format(amount: number, maximumFractionDigits: number): string {
  /*
   * Kobo only when there are kobo.
   *
   * `Intl` defaults a currency to its own precision, which is 2 for NGN — so
   * every whole-naira figure rendered as "₦5,000.00", and a pricing headline
   * full of ".00" reads as machine output. Forcing a minimum of 0 instead
   * would break the other direction and print "₦19.5" for ₦19.50, so the
   * minimum follows the amount.
   */
  const minimumFractionDigits =
    maximumFractionDigits === 0 || Number.isInteger(amount) ? 0 : 2;

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: PLATFORM_CURRENCY,
      minimumFractionDigits,
      // `narrowSymbol`, not the default `symbol`. Under a non-NG locale the
      // default renders NGN as the literal text "NGN 42,000"; narrowSymbol
      // gives "₦42,000" in every locale tested, and still "$" for USD. On a
      // naira marketplace the symbol is what merchants expect to read.
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits,
    }).format(amount);
  } catch {
    // `Intl` throws on an unrecognised currency code, which is a
    // misconfiguration rather than a user-visible failure. Show the figure
    // with its code instead of crashing the section, and never fall back to a
    // `$` that would be wrong in exactly the case this guard catches.
    return `${amount.toFixed(maximumFractionDigits)} ${PLATFORM_CURRENCY}`;
  }
}

/** A precise figure: order totals, prices, customer lifetime value. */
export function formatCurrency(amount: number): string {
  return format(amount, 2);
}

/**
 * A rounded figure, for dashboard tiles and chart axes where the kobo/cent is
 * noise and the column width is the real constraint.
 */
export function formatCurrencyWhole(amount: number): string {
  return format(amount, 0);
}

/**
 * An abbreviated money figure for chart axes and tight tiles ("₦340K").
 *
 * Chart ticks previously used a hardcoded template — `$${v}` on the analytics
 * axis and `$${v/1000}k` on the dashboard — so a naira platform drew dollar
 * signs down the side of every revenue chart, and the "k" was hand-rolled
 * rather than localised.
 */
export function formatCurrencyCompact(amount: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: PLATFORM_CURRENCY,
      currencyDisplay: 'narrowSymbol',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return `${formatCompact(amount)} ${PLATFORM_CURRENCY}`;
  }
}

/** A bare count, abbreviated ("12.4K"). Not money, so it carries no symbol. */
export function formatCompact(amount: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(amount);
}
