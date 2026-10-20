import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Loader2, Minus, Plus, ShoppingBag, Store as MerchantIcon, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCartValidation, lineProblem } from '../useCartValidation';
import { formatPrice } from '../productHelpers';
import { getAssetUrl } from '../../utils/assetPath';

/**
 * The bag. Public: a guest can review and change it without an account, and it
 * is only the step after this one that asks who they are.
 *
 * Lines are grouped by store because an order belongs to one merchant — the
 * server creates, prices, stocks and fulfils it per store — so each group is
 * checked out and paid for separately. The grouping is the data model made
 * visible rather than a limitation invented here.
 */
export function CartPage() {
  const navigate = useNavigate();
  const { items, groups, itemCount, subtotal, updateQuantity, removeFromCart, clearCart } = useCart();
  const { validations, isValidating } = useCartValidation(groups);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <ShoppingBag size={32} className="mx-auto text-decorative" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-extrabold text-primary">Your bag is empty</h1>
        <p className="mt-2 text-sm text-secondary">
          Browse the Nexus catalogue and add something you like — no account needed.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] px-6 text-sm font-bold text-white transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]"
        >
          Start shopping
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">Your bag</h1>
          <p className="mt-1 text-sm text-secondary">
            {itemCount} item{itemCount === 1 ? '' : 's'} from {groups.length} merchant
            {groups.length === 1 ? '' : 's'}
            {isValidating && (
              <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-muted">
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                Checking prices and stock…
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="rounded-xl border border-[var(--ink)]/10 px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-[#FF5F56]/40 hover:text-[var(--brand-red-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
        >
          Empty bag
        </button>
      </header>

      {groups.length > 1 && (
        <p className="rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] px-4 py-3 text-xs text-secondary">
          Your bag holds items from more than one merchant. Each merchant prices its own delivery
          and takes its own payment, so you check out once per merchant.
        </p>
      )}

      <div className="space-y-6">
        {groups.map(group => {
          const validation = validations.find(v => v.merchantId === group.merchantId);
          const serverTotals = validation?.result;
          const groupBlocked = serverTotals?.isValid === false;

          return (
            <section
              key={group.merchantId}
              aria-labelledby={`merchant-${group.merchantId}`}
              className="overflow-hidden rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ink)]/10 px-4 py-3 sm:px-5">
                <h2
                  id={`merchant-${group.merchantId}`}
                  className="flex items-center gap-2 text-sm font-bold text-primary"
                >
                  <MerchantIcon size={14} className="text-[var(--brand-yellow-ink)]" aria-hidden="true" />
                  {group.displayName}
                </h2>
                <span className="text-xs text-muted">
                  {group.itemCount} item{group.itemCount === 1 ? '' : 's'}
                </span>
              </div>

              <ul className="divide-y divide-[var(--ink)]/5">
                {group.items.map(item => {
                  const problem = lineProblem(validation, item.variantId);
                  const maxQuantity = item.maxStock > 0 ? item.maxStock : 99;

                  return (
                    <li key={item.variantId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5">
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.04]">
                        {item.image ? (
                          <img src={getAssetUrl(item.image)} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xl font-black text-decorative">
                            {item.title.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="text-sm font-semibold text-strong">
                          {item.merchantId && item.productSlug ? (
                            <Link
                              to={`/products/${encodeURIComponent(item.productSlug)}`}
                              className="rounded transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
                            >
                              {item.title}
                            </Link>
                          ) : (
                            item.title
                          )}
                        </h3>
                        {item.variantTitle && (
                          <p className="text-xs text-muted">{item.variantTitle}</p>
                        )}
                        <p className="text-xs text-muted">{formatPrice(item.price)} each</p>

                        {problem && (
                          <p className="flex items-start gap-1.5 pt-1 text-xs font-medium text-[var(--brand-yellow-ink)]">
                            <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                            {problem}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <div className="flex items-center gap-1 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 p-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            aria-label={`Decrease quantity of ${item.title}`}
                            className="rounded-lg p-1.5 text-body transition-colors hover:bg-[var(--ink)]/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
                          >
                            <Minus size={13} aria-hidden="true" />
                          </button>
                          <label className="sr-only" htmlFor={`qty-${item.variantId}`}>
                            Quantity for {item.title}
                          </label>
                          <input
                            id={`qty-${item.variantId}`}
                            type="number"
                            min={1}
                            max={maxQuantity}
                            inputMode="numeric"
                            value={item.quantity}
                            onChange={e => updateQuantity(item.variantId, parseInt(e.target.value, 10) || 0)}
                            className="h-8 w-12 bg-transparent text-center text-sm font-bold text-primary focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            disabled={item.quantity >= maxQuantity}
                            aria-label={`Increase quantity of ${item.title}`}
                            className="rounded-lg p-1.5 text-body transition-colors hover:bg-[var(--ink)]/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] disabled:opacity-40"
                          >
                            <Plus size={13} aria-hidden="true" />
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-primary">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.variantId)}
                            aria-label={`Remove ${item.title} from your bag`}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-[#FF5F56]/10 hover:text-[var(--brand-red-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="space-y-3 border-t border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] px-4 py-4 sm:px-5">
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-secondary">Subtotal</dt>
                    <dd className="font-semibold text-primary">
                      {formatPrice(serverTotals?.subtotal ?? group.subtotal)}
                    </dd>
                  </div>
                  {serverTotals && (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-secondary">Estimated tax</dt>
                        <dd className="text-strong">{formatPrice(serverTotals.taxEstimate)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-secondary">Estimated delivery</dt>
                        <dd className="text-strong">
                          {serverTotals.shippingEstimate === 0
                            ? 'Free'
                            : formatPrice(serverTotals.shippingEstimate)}
                        </dd>
                      </div>
                      <div className="flex justify-between border-t border-[var(--ink)]/10 pt-1.5 text-base">
                        <dt className="font-bold text-primary">Estimated total</dt>
                        <dd className="font-bold text-primary">{formatPrice(serverTotals.totalEstimate)}</dd>
                      </div>
                    </>
                  )}
                </dl>

                {!serverTotals && !isValidating && (
                  <p className="text-xs text-muted">
                    Tax and delivery are confirmed by {group.displayName} at checkout.
                  </p>
                )}

                {groupBlocked && (
                  <p role="alert" className="flex items-start gap-1.5 text-xs font-semibold text-[var(--brand-red-ink)]">
                    <AlertTriangle size={13} className="mt-px flex-shrink-0" aria-hidden="true" />
                    Adjust the flagged lines above before checking out with this seller.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => navigate(`/checkout?merchant=${encodeURIComponent(group.merchantId)}`)}
                  disabled={groupBlocked || isValidating}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-sm font-bold text-white shadow-lg shadow-red-900/30 transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  Check out with {group.displayName}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] px-5 py-4">
        <div>
          <p className="text-xs text-muted">Bag subtotal, all sellers</p>
          <p className="text-xl font-extrabold text-primary">{formatPrice(subtotal)}</p>
        </div>
        <Link
          to="/products"
          className="rounded-xl border border-[var(--ink)]/15 bg-[var(--ink)]/5 px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-[var(--ink)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
        >
          Keep shopping
        </Link>
      </div>
    </div>
  );
}
