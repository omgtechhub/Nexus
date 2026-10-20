import { useState } from 'react';
import { Search, Package, Store as MerchantIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useTrackOrderMutation } from '../hooks/useAccount';
import { OrderProgress, TrackingDetails } from '../portals/customer/components/OrderProgress';
import {
  deriveOrderProgress, formatMoney, statusLabel, statusVariant,
} from '../portals/customer/orderProgress';

/**
 * Public order tracking. A buyer who checked out as a guest has no account, so
 * this must work signed out — the order number plus the email used on the order
 * is what proves entitlement, and the server treats a wrong email and a missing
 * order identically.
 */
export function TrackOrderPage() {
  // A customer arriving from the checkout confirmation already has the order
  // number; only the email is left to type.
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [email, setEmail] = useState('');
  const track = useTrackOrderMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) return;
    track.mutate({ orderNumber: orderNumber.trim(), email: email.trim() });
  };

  const order = track.data;

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-primary">
      <Navbar />

      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Track your order</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            Enter your order number and the email address you used at checkout.
            You don&apos;t need an account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-8 max-w-xl rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-5 sm:p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Order number"
              id="track-order-number"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="NX-1001"
              autoComplete="off"
              required
            />
            <Input
              label="Email address"
              id="track-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="mt-5">
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              loading={track.isPending}
              icon={<Search size={16} aria-hidden="true" />}
            >
              Find my order
            </Button>
          </div>

          <div aria-live="polite" className="min-h-0">
            {track.isError && (
              <p className="mt-4 rounded-xl border border-[#FF5F56]/30 bg-[#FF5F56]/5 px-4 py-3 text-sm text-strong">
                {(track.error as Error)?.message ||
                  'No order matches that order number and email address.'}
              </p>
            )}
          </div>
        </form>

        {order && (
          <section className="mt-8 space-y-6" aria-label={`Order ${order.orderNumber}`}>
            <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-lg font-bold text-[var(--brand-yellow-ink)]">{order.orderNumber}</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted">
                    <MerchantIcon size={13} aria-hidden="true" />
                    {order.displayName}
                  </p>
                </div>
                <Badge variant={statusVariant(order.status)} size="sm">
                  {statusLabel(order.status)}
                </Badge>
              </div>

              <OrderProgress steps={deriveOrderProgress(order)} />

              {order.tracking && (
                <div className="mt-5">
                  <TrackingDetails
                    carrier={order.tracking.carrier}
                    trackingNumber={order.tracking.trackingNumber}
                  />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-5 sm:p-6">
              <h2 className="mb-4 text-sm font-semibold text-primary">Items</h2>
              <ul className="divide-y divide-[var(--ink)]/5">
                {order.items.map(item => (
                  <li key={item.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary">{item.productTitle}</p>
                      <p className="mt-0.5 text-xs text-muted">Qty {item.quantity}</p>
                    </div>
                    <span className="flex-shrink-0 font-mono text-sm text-strong">
                      {formatMoney(item.price * item.quantity, order.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--ink)]/10 pt-4 text-base font-bold text-primary">
                <span>Total</span>
                <span className="font-mono">{formatMoney(order.total, order.currency)}</span>
              </div>
            </div>

            {order.shippingAddress && (
              <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-5 sm:p-6">
                <h2 className="mb-3 text-sm font-semibold text-primary">Delivery address</h2>
                <address className="text-sm not-italic leading-relaxed text-secondary">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                  {order.shippingAddress.address1}<br />
                  {order.shippingAddress.address2 && <>{order.shippingAddress.address2}<br /></>}
                  {order.shippingAddress.city}
                  {order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''}{' '}
                  {order.shippingAddress.zip}<br />
                  {order.shippingAddress.country}
                </address>
              </div>
            )}
          </section>
        )}

        {!order && !track.isPending && (
          <p className="mt-10 text-center text-sm text-muted">
            <Package size={16} className="mx-auto mb-2 opacity-60" aria-hidden="true" />
            Have a Nexus account?{' '}
            <Link
              to="/account/orders"
              className="rounded text-body underline underline-offset-2 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27C93F]"
            >
              See all your orders
            </Link>
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}
