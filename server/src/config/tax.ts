/**
 * Sales tax, set for the platform.
 *
 * Tax used to be configured per store, on the assumption that each merchant
 * ran an independent shop with its own tax position. Nexus is a single
 * marketplace: merchants sell from a merchant account into one shopfront, and
 * it is Nexus that takes the money and issues the receipt. So the tax
 * treatment is one platform decision, not a column each merchant fills in.
 *
 * Defaults to **off**. A rate is a legal declaration about a specific business
 * in a specific place; inheriting someone else's is worse than charging
 * nothing, and the platform operator is the only one who can say what it
 * should be.
 */

/** Percentage, e.g. 7.5 for 7.5%. Zero or unset means no tax is charged. */
export function platformTaxRate(): number {
  const raw = (process.env.PLATFORM_TAX_PERCENT || '').trim();
  if (!raw) return 0;

  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;

  // Above 100 is a typo (750 for 7.5%), and charging it is worse than
  // ignoring it.
  if (parsed > 100) return 0;

  return parsed;
}

/** What the line is called on a receipt: "VAT", "Sales tax", "GST". */
export function platformTaxLabel(): string {
  return (process.env.PLATFORM_TAX_LABEL || 'Tax').trim() || 'Tax';
}

/** True when listed prices already include the tax. */
export function platformTaxInclusive(): boolean {
  const flag = (process.env.PLATFORM_TAX_INCLUSIVE || '').trim().toLowerCase();
  return flag === 'true' || flag === '1' || flag === 'yes';
}
