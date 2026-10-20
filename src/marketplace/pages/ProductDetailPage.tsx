import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Minus, Plus, ShieldCheck, ShoppingBag, Store as MerchantIcon, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMarketplaceProductQuery } from '../../hooks/useMarketplace';
import { useCart } from '../../context/CartContext';
import type { ShopProductVariant } from '../../api/shop';
import { ProductGrid, ProductThumb } from '../components/ProductCard';
import { ProductReviews } from '../components/ProductReviews';
import { StarRating } from '../components/StarRating';
import { buildCartItem, discountPercent, formatPrice, stockFor } from '../productHelpers';
import { getAssetUrl } from '../../utils/assetPath';

/** Public product page. No account needed to read it or to add to the bag. */
export function ProductDetailPage() {
  const { productSlug } = useParams<{ productSlug: string }>();
  const { data, isLoading, isError, error } = useMarketplaceProductQuery(productSlug);
  const { addToCart } = useCart();

  const product = data?.product;
  const [variant, setVariant] = useState<ShopProductVariant | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Reset the selection whenever a different product loads, including when the
  // shopper arrives from a related-product link on this same page.
  useEffect(() => {
    setVariant(product?.variants?.length ? product.variants[0] : null);
    setImageIndex(0);
    setQuantity(1);
  }, [product?.id, product?.variants]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-busy="true">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-3xl bg-[var(--ink)]/[0.04]" />
          <div className="space-y-4">
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--ink)]/[0.06]" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-[var(--ink)]/[0.06]" />
            <div className="h-6 w-28 animate-pulse rounded bg-[var(--ink)]/[0.06]" />
            <div className="h-24 w-full animate-pulse rounded bg-[var(--ink)]/[0.04]" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-[var(--ink)]/[0.04]" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-primary">This product is not available.</h1>
        <p className="mt-2 text-sm text-secondary">
          {(error as Error)?.message ||
            'It may have been removed, or the merchant is no longer selling it.'}
        </p>
        <Link
          to="/products/browse"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-[var(--ink)]/10 px-5 text-sm font-bold text-primary transition-colors hover:bg-[var(--ink)]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
        >
          Browse all products
        </Link>
      </div>
    );
  }

  const price = variant ? variant.price : product.price;
  const compare = variant ? variant.comparePrice : product.comparePrice;
  const off = discountPercent({ price, comparePrice: compare ?? undefined });
  const stock = stockFor(product, variant);
  const purchasable = product.inStock && (stock > 0 || product.availableStock > 0);
  const images = product.images?.length ? product.images : [];
  // `maxStock` of 0 on an in-stock product means the store does not track a
  // count, so the quantity is capped at a sane number rather than at zero.
  const maxQuantity = stock > 0 ? stock : 99;

  const handleAdd = () => {
    const item = buildCartItem(product, variant, Math.min(quantity, maxQuantity));
    if (!item) {
      toast.error('This item cannot be added right now.');
      return;
    }
    addToCart(item);
    toast.success(`${product.title} added to your bag`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <Link to="/products" className="rounded hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]">
          Shop
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
        <Link
          to={`/products/browse?category=${encodeURIComponent(product.category)}`}
          className="rounded hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
        >
          {product.category}
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
        <span className="text-strong">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-3xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03]">
            {images[imageIndex] ? (
              <img
                src={getAssetUrl(images[imageIndex])}
                alt={product.title}
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <ProductThumb product={product} className="h-full w-full" />
            )}
          </div>

          {images.length > 1 && (
            <ul className="flex gap-2.5 overflow-x-auto pb-1">
              {images.map((url, index) => (
                <li key={url}>
                  <button
                    type="button"
                    onClick={() => setImageIndex(index)}
                    aria-label={`Show image ${index + 1} of ${images.length}`}
                    aria-current={index === imageIndex ? 'true' : undefined}
                    className={`h-16 w-16 overflow-hidden rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] ${
                      index === imageIndex ? 'border-[#FFBD2E]' : 'border-[var(--ink)]/10 hover:border-[var(--ink)]/30'
                    }`}
                  >
                    <img src={getAssetUrl(url)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            {product.merchant && (
              <Link
                to={`/products/browse?merchantId=${encodeURIComponent(product.merchant.id)}`}
                className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
              >
                <MerchantIcon size={12} aria-hidden="true" />
                Sold by {product.merchant.name}
              </Link>
            )}
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-primary sm:text-4xl">
              {product.title}
            </h1>

            {/* Jumps to the reviews rather than repeating them here. A product
                with no reviews says so instead of showing an empty star run,
                which reads as a one-star product. */}
            {product.rating && product.rating.count > 0 ? (
              <a
                href="#reviews-heading"
                className="inline-flex w-fit items-center gap-2 rounded text-xs text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
              >
                <StarRating
                  value={product.rating.average}
                  size="sm"
                  label={`Rated ${product.rating.average.toFixed(1)} out of 5`}
                />
                <span className="font-semibold text-secondary">
                  {product.rating.average.toFixed(1)}
                </span>
                <span className="underline">
                  {product.rating.count} review{product.rating.count === 1 ? '' : 's'}
                </span>
              </a>
            ) : (
              <p className="text-xs text-muted">No reviews yet</p>
            )}

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-bold text-primary sm:text-3xl">{formatPrice(price)}</span>
              {off !== null && (
                <>
                  <span className="text-base text-muted line-through">{formatPrice(compare!)}</span>
                  <span className="rounded-full bg-[#FF5F56] px-2.5 py-1 text-[11px] font-bold text-white">
                    Save {off}%
                  </span>
                </>
              )}
            </div>

            <p className="text-xs font-semibold" aria-live="polite">
              {purchasable ? (
                stock > 0 ? (
                  <span className="text-[var(--brand-green-ink)]">In stock · {stock} available</span>
                ) : (
                  <span className="text-[var(--brand-green-ink)]">In stock</span>
                )
              ) : (
                <span className="text-[var(--brand-red-ink)]">Currently sold out</span>
              )}
            </p>
          </div>

          {product.variants.length > 1 && (
            <fieldset className="space-y-2.5">
              <legend className="text-xs font-bold uppercase tracking-wider text-primary">Options</legend>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(option => {
                  const selected = variant?.id === option.id;
                  const unavailable = option.inventoryQuantity <= 0 && product.availableStock <= 0;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setVariant(option)}
                      aria-pressed={selected}
                      className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] ${
                        selected
                          ? 'border-[#FFBD2E] bg-[#FFBD2E]/10 text-primary'
                          : 'border-[var(--ink)]/10 bg-[var(--ink)]/5 text-body hover:border-[var(--ink)]/25 hover:text-primary'
                      } ${unavailable ? 'opacity-50' : ''}`}
                    >
                      {option.title}
                      <span className="ml-2 text-muted">{formatPrice(option.price)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 p-1">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="rounded-lg p-2 text-body transition-colors hover:bg-[var(--ink)]/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] disabled:opacity-40"
              >
                <Minus size={14} aria-hidden="true" />
              </button>
              <label className="sr-only" htmlFor="quantity">
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                max={maxQuantity}
                inputMode="numeric"
                value={quantity}
                onChange={e => {
                  const next = parseInt(e.target.value, 10);
                  setQuantity(Number.isNaN(next) ? 1 : Math.min(Math.max(1, next), maxQuantity));
                }}
                className="h-9 w-14 bg-transparent text-center text-sm font-bold text-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity(q => Math.min(maxQuantity, q + 1))}
                disabled={quantity >= maxQuantity}
                aria-label="Increase quantity"
                className="rounded-lg p-2 text-body transition-colors hover:bg-[var(--ink)]/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] disabled:opacity-40"
              >
                <Plus size={14} aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!purchasable}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] px-6 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              <ShoppingBag size={16} aria-hidden="true" />
              {purchasable ? 'Add to bag' : 'Sold out'}
            </button>
          </div>

          {/* Only facts the platform can stand behind: no invented delivery
              windows, and no returns policy unless a merchant has configured one. */}
          <ul className="space-y-2.5 rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] p-4">
            <li className="flex items-start gap-2.5 text-xs text-secondary">
              <ShieldCheck size={14} className="mt-px flex-shrink-0 text-[var(--brand-green-ink)]" aria-hidden="true" />
              Price and stock are re-checked against the merchant&apos;s own records before your
              order is created.
            </li>
            <li className="flex items-start gap-2.5 text-xs text-secondary">
              <Truck size={14} className="mt-px flex-shrink-0 text-[var(--brand-yellow-ink)]" aria-hidden="true" />
              Delivery is arranged by {product.merchant?.name || 'the merchant'} and quoted at checkout.
            </li>
          </ul>

          {/* The section is unconditional: a missing description is itself
              information a shopper needs, and silently dropping the heading
              made two otherwise identical products look differently detailed
              for no stated reason. */}
          <section aria-labelledby="description" className="space-y-2">
            <h2 id="description" className="text-sm font-bold text-primary">
              Description
            </h2>
            {product.description?.trim() ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-secondary">
                {product.description}
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-muted">
                {product.merchant?.name || 'The seller'} has not added a description for this product
                yet.
              </p>
            )}
          </section>

          <dl className="grid grid-cols-2 gap-3 border-t border-[var(--ink)]/10 pt-4 text-xs">
            <div>
              <dt className="text-muted">SKU</dt>
              <dd className="mt-0.5 font-medium text-strong">{variant?.sku || product.sku || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Category</dt>
              <dd className="mt-0.5 font-medium text-strong">{product.category}</dd>
            </div>
          </dl>
        </div>
      </div>

      <ProductReviews productId={product.id} />

      {data?.related?.length ? (
        <section aria-labelledby="related" className="space-y-5">
          <h2 id="related" className="text-xl font-bold text-primary">
            More in {product.category}
          </h2>
          <ProductGrid products={data.related} />
        </section>
      ) : null}
    </div>
  );
}
