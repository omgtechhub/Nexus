import { Link } from 'react-router-dom';
import { ShoppingBag, Store as MerchantIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import type { MarketplaceProduct } from '../../api/marketplace';
import { useCart } from '../../context/CartContext';
import { cn } from '../../utils/cn';
import { formatPrice, productPath, discountPercent, buildCartItem } from '../productHelpers';
import { StarRating } from './StarRating';
import { getAssetUrl } from '../../utils/assetPath';

/**
 * No product image is a real state in this data — a merchant can publish
 * before uploading one — so the card degrades to the product's initial rather
 * than a broken image frame or an invented stock photo.
 */
export function ProductThumb({
  product,
  className,
  sizes,
}: {
  product: MarketplaceProduct;
  className?: string;
  sizes?: string;
}) {
  // Catalogue photos are app-relative files; a merchant's upload is an
  // absolute URL on the API origin. getAssetUrl passes the latter through.
  const raw = product.primaryImage || product.images?.[0];
  const src = raw ? getAssetUrl(raw) : undefined;

  if (!src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-[var(--ink)]/[0.06] to-[var(--ink)]/[0.02]',
          className
        )}
        aria-hidden="true"
      >
        <span className="text-3xl font-black text-decorative">
          {product.title.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={product.title}
      loading="lazy"
      decoding="async"
      sizes={sizes}
      className={cn('object-cover', className)}
    />
  );
}

export function ProductCard({ product }: { product: MarketplaceProduct }) {
  const { addToCart } = useCart();

  const off = discountPercent(product);
  const soldOut = !product.inStock;

  const handleAdd = () => {
    const item = buildCartItem(product);
    if (!item) {
      toast.error('This item is not available right now.');
      return;
    }
    addToCart(item);
    toast.success(`${product.title} added to your bag`);
  };

  return (
    // `w-full` matters: the <li> wrapper is a flex container, so without it the
    // card is sized to its own content and a short-titled card renders narrower
    // than its neighbours.
    // The surface is the opaque `--surface-1` token — the one the theme
    // documents as "a card" — not a translucent wash.
    //
    // `bg-[var(--ink)]/[0.03]` resolved to white at 3% over a near-black
    // page, a difference of about 7/255 per channel. Chromium composites
    // that flat, but a phone rasterises a scrolling page in tiles and
    // rounds each one independently, so the body was banding into
    // horizontal steps that broke at an element edge and changed between
    // frames. An opaque fill has no alpha to round, so it cannot band.
    <article className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] transition-colors hover:border-[var(--ink)]/20">
      <Link
        to={productPath(product)}
        className="relative block aspect-square overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FFBD2E]"
      >
        <ProductThumb
          product={product}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        {off !== null && (
          <span className="absolute left-3 top-3 rounded-full bg-[#FF5F56] px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
            {off}% off
          </span>
        )}
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-slate-950/80 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-primary">
            Sold out
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Every row below has a height that does not depend on its content, so
            a card with a long title, no merchant name or no discount still lines
            its price and button up with every other card in the grid. */}
        <span className="flex h-4 items-center gap-1.5 text-[11px] font-medium text-muted">
          {product.merchant ? (
            <>
              <MerchantIcon size={11} className="flex-shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">{product.merchant.name}</span>
            </>
          ) : (
            // Keep the row, so the card is not a line shorter than its
            // neighbours when the seller is unknown.
            <span aria-hidden="true" />
          )}
        </span>

        {/* Exactly two lines, always: clamped so a long title cannot grow the
            card, and a min-height so a one-line title cannot shrink it. */}
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-strong break-words">
          <Link
            to={productPath(product)}
            className="rounded transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
          >
            {product.title}
          </Link>
        </h3>

        {/* Fixed height whether or not the product has been reviewed, for the
            same reason the title is clamped: an unreviewed card must not sit
            4px shorter than the one beside it. */}
        <div className="flex h-4 items-center">
          {product.rating && product.rating.count > 0 ? (
            <span className="flex items-center gap-1.5">
              <StarRating
                value={product.rating.average}
                size="sm"
                label={`Rated ${product.rating.average.toFixed(1)} out of 5 from ${product.rating.count} ${
                  product.rating.count === 1 ? 'review' : 'reviews'
                }`}
              />
              <span className="text-[11px] tabular-nums text-muted">({product.rating.count})</span>
            </span>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>

        <div className="mt-auto flex h-6 items-baseline gap-2">
          <span className="text-base font-bold text-primary">{formatPrice(product.price)}</span>
          {off !== null && (
            <span className="text-xs text-muted line-through">{formatPrice(product.comparePrice!)}</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={soldOut}
          className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 text-xs font-bold text-primary transition-colors hover:border-[#FFBD2E]/50 hover:bg-[#FFBD2E]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingBag size={14} aria-hidden="true" />
          {soldOut ? 'Unavailable' : 'Add to bag'}
        </button>
      </div>
    </article>
  );
}

/** A responsive grid of cards, with the empty state the caller wants. */
export function ProductGrid({
  products,
  empty,
}: {
  products: MarketplaceProduct[];
  empty?: React.ReactNode;
}) {
  if (!products.length) return <>{empty ?? null}</>;

  return (
    // `auto-rows-fr` is what makes every *row* the same height, not just the
    // cards within one row: equal flex factors on an auto-height grid resolve
    // all the tracks to the tallest one. Grid columns are already equal, so
    // with this the whole grid is one uniform size.
    <ul className="grid auto-rows-fr grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
      {products.map(product => (
        <li key={`${product.merchant?.id ?? 'x'}-${product.id}`} className="flex">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Matches the card's shape so a loading grid does not shift the layout. The
 * placeholder rows mirror the card's fixed heights exactly — 4 / 10 / 6 / 10 —
 * so the swap from skeleton to card moves nothing.
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-1)]">
      <div className="aspect-square animate-pulse bg-[var(--ink)]/[0.04]" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--ink)]/[0.06]" />
        <div className="h-10 w-5/6 animate-pulse rounded bg-[var(--ink)]/[0.06]" />
        <div className="mt-auto h-6 w-1/3 animate-pulse rounded bg-[var(--ink)]/[0.06]" />
        <div className="mt-1 h-10 w-full animate-pulse rounded-xl bg-[var(--ink)]/[0.04]" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid auto-rows-fr grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
