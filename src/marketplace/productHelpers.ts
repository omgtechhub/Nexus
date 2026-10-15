import type { MarketplaceProduct } from '../api/marketplace';
import type { StorefrontProductVariant } from '../api/storefront';
import type { CartItem } from '../context/CartContext';

/**
 * Shared product helpers for the marketplace surfaces. Kept out of the
 * components so the cart line built by a card and by the product page is
 * provably the same object.
 */

export function formatPrice(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

/** `(storeId, slug)` is the product's unique key, so it is also its URL. */
export function productPath(product: MarketplaceProduct) {
  const storeId = product.store?.id;
  return storeId
    ? `/products/${encodeURIComponent(storeId)}/${encodeURIComponent(product.slug)}`
    : '/products';
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
export function stockFor(product: MarketplaceProduct, variant?: StorefrontProductVariant | null) {
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
  variant?: StorefrontProductVariant | null,
  quantity = 1
): CartItem | null {
  if (!product.store?.id) return null;

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
    storeId: product.store.id,
    storeName: product.store.name,
    productSlug: product.slug,
  };
}
