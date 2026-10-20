import type { MarketplaceProduct } from '../api/marketplace';
import type { ShopProductVariant } from '../api/shop';
import type { CartItem } from '../context/CartContext';
import { PLATFORM_CURRENCY } from '../utils/money';

/**
 * Shared product helpers for the marketplace surfaces. Kept out of the
 * components so the cart line built by a card and by the product page is
 * provably the same object.
 */

export function formatPrice(amount: number, currency = PLATFORM_CURRENCY) {
  // Kobo only when there are kobo; see utils/money.ts for why the minimum
  // follows the amount rather than being pinned at 0 or 2.
  const minimumFractionDigits = Number.isInteger(amount) ? 0 : 2;

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      // See utils/money.ts: the default display spells NGN out as "NGN" under
      // a non-NG locale, which is not what a shopper expects to see on a price.
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Never a `$` fallback: the only way to reach this branch is an
    // unrecognised code, and guessing dollars is wrong in precisely that case.
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * A listing's address.
 *
 * The slug is unique across the marketplace, so the path carries the product
 * and nothing else. It used to be `/products/<merchantId>/<slug>` because the
 * slug was only unique inside one seller's catalogue -- which is the shape a
 * per-seller shopfront needs, not a marketplace.
 */
export function productPath(product: MarketplaceProduct) {
  return product.slug ? `/products/${encodeURIComponent(product.slug)}` : '/products/browse';
}

/**
 * The saving a shopper actually gets, or null when there is none.
 *
 * `comparePrice` is merchant-entered and is not guaranteed to be higher than
 * the price, so a discount is only ever claimed when the arithmetic holds.
 */
export function discountPercent(product: Pick<MarketplaceProduct, 'price' | 'comparePrice'>) {
  const compare = product.comparePrice;
  if (typeof compare !== 'number' || compare <= product.price || compare <= 0) return null;
  return Math.round(((compare - product.price) / compare) * 100);
}

/** Stock for a specific choice: the variant's own count, or the product total. */
export function stockFor(product: MarketplaceProduct, variant?: ShopProductVariant | null) {
  return variant ? variant.inventoryQuantity : product.availableStock;
}

/**
 * Build the cart line for a product (and optional variant).
 *
 * `variantId` carries the variant when the product has one and the product id
 * otherwise, which is exactly what the server's cart validation and checkout
 * accept — they look a variant up first and fall back to a product id.
 *
 * Returns null when the product cannot be bought: with no selling store there
 * is nowhere to send the order.
 */
export function buildCartItem(
  product: MarketplaceProduct,
  variant?: ShopProductVariant | null,
  quantity = 1
): CartItem | null {
  if (!product.merchant?.id) return null;

  return {
    variantId: variant ? variant.id : product.id,
    productId: product.id,
    title: product.title,
    variantTitle: variant?.title,
    price: variant ? variant.price : product.price,
    sku: variant?.sku || product.sku,
    image: product.primaryImage || product.images?.[0] || '',
    quantity,
    maxStock: stockFor(product, variant),
    merchantId: product.merchant.id,
    displayName: product.merchant.name,
    productSlug: product.slug,
  };
}
