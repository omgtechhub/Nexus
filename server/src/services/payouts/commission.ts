/**
 * The platform's cut of a merchant's sale.
 *
 * **Defaults to zero.** A commission is a commercial term between the platform
 * and its merchants; inventing one would mean quietly withholding money from
 * people who never agreed to it. Set `PLATFORM_COMMISSION_PERCENT` to switch
 * it on — until then merchants are owed the full amount of every settled
 * payment and the platform's revenue comes from subscriptions alone.
 *
 * The rate is read at the moment a payment settles and stored on that payment
 * (`commissionRate`, `platformFeeAmount`, `merchantNetAmount`), so changing it
 * later affects new sales only. Money already taken is never re-valued.
 */

/** Percentage, e.g. 2.5 for 2.5%. */
export function commissionRate(): number {
  const raw = (process.env.PLATFORM_COMMISSION_PERCENT || '').trim();
  if (!raw) return 0;

  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;

  // A rate above 100 would make the merchant's net negative. Treat it as the
  // misconfiguration it is rather than acting on it.
  if (parsed > 100) return 0;

  return parsed;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface CommissionSplit {
  commissionRate: number;
  platformFeeAmount: number;
  merchantNetAmount: number;
}

/**
 * Split a settled payment between the platform and the merchant.
 *
 * The merchant's net is derived by subtraction rather than computed
 * independently, so the two parts always add back to exactly the amount taken
 * and rounding cannot create or destroy a penny.
 */
export function splitPayment(amount: number): CommissionSplit {
  const rate = commissionRate();
  const fee = round2((amount * rate) / 100);

  return {
    commissionRate: rate,
    platformFeeAmount: fee,
    merchantNetAmount: round2(amount - fee),
  };
}
