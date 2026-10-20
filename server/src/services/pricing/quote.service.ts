import { prisma } from '../../prisma.js';
import { ShippingRateType } from '@prisma/client';
import { currencyCodeOf } from '../../config/currency.js';
import { platformTaxRate, platformTaxLabel, platformTaxInclusive } from '../../config/tax.js';

/**
 * One authority for what an order costs.
 *
 * Tax and delivery were computed in four places from hardcoded constants:
 * `merchantShop.controller.ts` twice (`validateCart` at the quote stage and
 * `checkout` at the order stage) and the checkout page once on the client,
 * each applying `subtotal * 0.08` tax and `$15`, free over `$100`, delivery.
 *
 * That was wrong three ways at once:
 *
 *  - **Every store charged a US-shaped 8% sales tax** that nobody had
 *    configured, nobody had declared, and nobody remits — including stores
 *    trading in naira.
 *  - **The ShippingZone and ShippingMethod records merchants fill in were
 *    never read.** A merchant could configure zones and rates in the
 *    Fulfilment section and checkout would ignore all of it.
 *  - **Four copies drift.** The quote a shopper was shown and the total they
 *    were charged came from different code, so they could disagree.
 *
 * Everything below reads the store's own configuration. A store that has
 * configured nothing charges no tax and no delivery, which is the honest
 * default — inventing a rate is what produced the problem.
 */

export interface QuoteInput {
  merchantId: string;
  subtotal: number;
  /** After any discount, so tax and percentage logic apply to what is owed. */
  discountAmount?: number;
  /** ISO country code or full name; used to pick the shipping zone. */
  country?: string;
  /** A specific ShippingMethod the shopper chose. Cheapest applies otherwise. */
  shippingMethodId?: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  description: string | null;
  price: number;
  estimatedDays: string | null;
  isFree: boolean;
}

export interface Quote {
  subtotal: number;
  discountAmount: number;
  tax: number;
  taxLabel: string;
  taxRate: number;
  taxInclusive: boolean;
  shipping: number;
  shippingMethodId: string | null;
  shippingMethodName: string | null;
  total: number;
  currency: string;
  /** Every option for the resolved zone, so a client can offer a choice. */
  shippingOptions: ShippingOption[];
}

/** Two decimal places, without the float dust that `0.1 + 0.2` leaves. */
function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * ISO-2 code for a country name, for matching against a zone's `countries`.
 *
 * Checkout collects a display name ("Nigeria") while zones store codes
 * ("NG"), so a zone would never match what the form submits. Only the
 * countries the checkout form actually offers need to be here.
 */
const COUNTRY_CODES: Record<string, string> = {
  nigeria: 'NG',
  ghana: 'GH',
  kenya: 'KE',
  'south africa': 'ZA',
  egypt: 'EG',
  'united states': 'US',
  canada: 'CA',
  'united kingdom': 'GB',
  ireland: 'IE',
  germany: 'DE',
  france: 'FR',
  spain: 'ES',
  italy: 'IT',
  netherlands: 'NL',
  belgium: 'BE',
  sweden: 'SE',
  norway: 'NO',
  denmark: 'DK',
  poland: 'PL',
  portugal: 'PT',
  'united arab emirates': 'AE',
  'saudi arabia': 'SA',
  india: 'IN',
  singapore: 'SG',
  australia: 'AU',
  'new zealand': 'NZ',
  japan: 'JP',
  brazil: 'BR',
  mexico: 'MX',
};

export function countryCode(country?: string): string {
  if (!country) return '';
  const trimmed = country.trim();
  // Already a code.
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return COUNTRY_CODES[trimmed.toLowerCase()] || '';
}

/**
 * The delivery options for a destination, from the store's own zones.
 *
 * A zone matches on the destination's ISO code or on the `*` wildcard. When
 * nothing matches, the store's `defaultShippingFee` /
 * `freeShippingThreshold` apply — both default to zero, so a store that has
 * configured nothing ships free rather than being charged a figure it never
 * agreed to.
 */
export async function shippingOptionsFor(
  merchantId: string,
  subtotal: number,
  country?: string
): Promise<ShippingOption[]> {
  const code = countryCode(country);

  const zones = await prisma.shippingZone.findMany({
    where: { merchantId },
    include: { methods: { orderBy: { price: 'asc' } } },
  });

  const matching = zones.find(zone => {
    const countries = Array.isArray(zone.countries) ? (zone.countries as string[]) : [];
    return countries.some(entry => entry === '*' || entry.toUpperCase() === code);
  });

  const methods = matching?.methods ?? [];

  if (methods.length > 0) {
    return methods.map(method => {
      let price = method.rateType === ShippingRateType.FREE_SHIPPING ? 0 : method.price;

      if (method.freeThreshold !== null && subtotal >= method.freeThreshold) {
        price = 0;
      }

      return {
        id: method.id,
        name: method.name,
        description: method.description,
        price: money(price),
        estimatedDays: method.estimatedDays,
        isFree: price === 0,
      };
    });
  }

  // No zone covers this destination. Fall back to the store's own default.
  const settings = await prisma.merchantSettings.findUnique({
    where: { merchantId },
    select: { defaultShippingFee: true, freeShippingThreshold: true },
  });

  const fee = settings?.defaultShippingFee ?? 0;
  const threshold = settings?.freeShippingThreshold ?? null;
  const price = threshold !== null && subtotal >= threshold ? 0 : fee;

  if (price === 0 && fee === 0) {
    return [
      {
        id: 'merchant_default',
        name: 'Delivery',
        description: 'Arranged by the merchant',
        price: 0,
        estimatedDays: null,
        isFree: true,
      },
    ];
  }

  return [
    {
      id: 'merchant_default',
      name: 'Standard delivery',
      description: null,
      price: money(price),
      estimatedDays: null,
      isFree: price === 0,
    },
  ];
}

/**
 * Price an order from the store's configuration.
 *
 * The same function answers the quote shown in the cart and the figures
 * written onto the order, so the two cannot disagree.
 */
export async function quoteOrder(input: QuoteInput): Promise<Quote> {
  const subtotal = money(Math.max(0, input.subtotal));
  const discountAmount = money(Math.min(Math.max(0, input.discountAmount ?? 0), subtotal));
  const taxableBase = money(subtotal - discountAmount);

  const settings = await prisma.merchantSettings.findUnique({
    where: { merchantId: input.merchantId },
    select: { currency: true },
  });

  const shippingOptions = await shippingOptionsFor(input.merchantId, taxableBase, input.country);

  const chosen =
    (input.shippingMethodId
      ? shippingOptions.find(option => option.id === input.shippingMethodId)
      : undefined)
    // Cheapest by default, so nobody is silently upsold to express delivery.
    ?? shippingOptions.reduce<ShippingOption | undefined>(
      (cheapest, option) => (!cheapest || option.price < cheapest.price ? option : cheapest),
      undefined
    );

  const shipping = money(chosen?.price ?? 0);

  /**
   * Tax is the platform's, not the merchant's.
   *
   * These were per-store columns, which only made sense while each merchant
   * was modelled as running an independent shop. On a single marketplace
   * Nexus takes the money and issues the receipt, so one rate applies to
   * every sale. The columns remain on MerchantSettings, unread, rather than
   * being dropped in a migration that would destroy whatever a merchant had
   * already entered.
   */
  const taxRate = platformTaxRate();
  const taxEnabled = taxRate > 0;
  const taxInclusive = platformTaxInclusive();

  let tax = 0;
  let total = 0;

  if (!taxEnabled || taxRate === 0) {
    tax = 0;
    total = money(taxableBase + shipping);
  } else if (taxInclusive) {
    // Prices already contain the tax, so it is extracted for display rather
    // than added. Shipping is treated as taxed on the same basis.
    const grossBase = taxableBase + shipping;
    tax = money(grossBase - grossBase / (1 + taxRate / 100));
    total = money(grossBase);
  } else {
    tax = money((taxableBase + shipping) * (taxRate / 100));
    total = money(taxableBase + shipping + tax);
  }

  return {
    subtotal,
    discountAmount,
    tax,
    taxLabel: platformTaxLabel(),
    taxRate,
    taxInclusive,
    shipping,
    shippingMethodId: chosen?.id ?? null,
    shippingMethodName: chosen?.name ?? null,
    total,
    // MerchantSettings.currency is a display string ("NGN — Nigerian Naira");
    // one shared helper recovers the code so the parsing is not duplicated.
    currency: currencyCodeOf(settings?.currency),
    shippingOptions,
  };
}
