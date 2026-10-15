import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';
import { formatPrice } from '../productHelpers';
import { getAssetUrl } from '../../utils/assetPath';

/**
 * Confirmation that an item landed in the bag, shown as a slide-over.
 *
 * It intentionally does no arithmetic beyond a line subtotal: tax, shipping and
 * the order total come from the server at checkout, and quoting a guess here
 * would be a number the shopper then sees change.
 */
export function MiniCart() {
  const { items, itemCount, subtotal, cartOpen, setCartOpen, updateQuantity, removeFromCart } = useCart();
  const panel = useRef<HTMLDivElement>(null);
  const close = () => setCartOpen(false);

  useDismissOnEscape(cartOpen, close);

  useEffect(() => {
    if (cartOpen) panel.current?.focus();
  }, [cartOpen]);

  if (!cartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close bag"
        onClick={close}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
      />

      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="minicart-title"
        className="relative flex h-full w-full max-w-sm flex-col border-l border-[var(--ink)]/10 bg-[var(--surface-base)] shadow-2xl focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-[var(--ink)]/10 px-5 py-4">
          <h2 id="minicart-title" className="flex items-center gap-2 text-sm font-bold text-primary">
            <ShoppingBag size={16} className="text-[var(--brand-yellow-ink)]" aria-hidden="true" />
            Your bag
            <span className="text-muted">({itemCount})</span>
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close bag"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-[var(--ink)]/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-secondary">Your bag is empty.</p>
            <Link
              to="/products"
              onClick={close}
              className="rounded-xl bg-[var(--ink)]/10 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-[var(--ink)]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-[var(--ink)]/5 overflow-y-auto px-5">
            {items.map(item => (
              <li key={item.variantId} className="flex gap-3 py-4">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.04]">
                  {item.image ? (
                    <img src={getAssetUrl(item.image)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-base font-black text-decorative">
                      {item.title.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-strong">{item.title}</p>
                  {item.variantTitle && (
                    <p className="truncate text-[11px] text-muted">{item.variantTitle}</p>
                  )}
                  {item.storeName && (
                    <p className="truncate text-[11px] text-decorative">{item.storeName}</p>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <label className="sr-only" htmlFor={`mini-qty-${item.variantId}`}>
                        Quantity for {item.title}
                      </label>
                      <input
                        id={`mini-qty-${item.variantId}`}
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={e => updateQuantity(item.variantId, parseInt(e.target.value, 10) || 0)}
                        className="h-8 w-14 rounded-lg border border-[var(--ink)]/10 bg-[var(--ink)]/5 px-2 text-xs text-primary focus:border-[#FFBD2E] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.variantId)}
                        aria-label={`Remove ${item.title}`}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-[#FF5F56]/10 hover:text-[var(--brand-red-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-primary">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <div className="space-y-3 border-t border-[var(--ink)]/10 px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Subtotal</span>
              <span className="font-bold text-primary">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-[11px] text-muted">
              Tax and delivery are calculated by each seller at checkout.
            </p>
            <Link
              to="/cart"
              onClick={close}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-sm font-bold text-white transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
            >
              View bag &amp; check out
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
