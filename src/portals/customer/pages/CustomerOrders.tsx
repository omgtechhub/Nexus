import { Package, ArrowLeft, Store } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { useAccountOrdersQuery, useAccountOrderQuery } from '../../../hooks/useAccount';
import { OrderCard } from '../components/OrderCard';
import { OrderProgress } from '../components/OrderProgress';
import { LoadingState, ErrorState, EmptyState, PageHeading } from '../components/States';
import { deriveOrderProgress, formatMoney, statusLabel, statusVariant } from '../orderProgress';

export function CustomerOrders() {
  const { id } = useParams<{ id?: string }>();
  return id ? <OrderDetail id={id} /> : <OrderList />;
}

function OrderList() {
  const { data: orders, isLoading, isError, error, refetch } = useAccountOrdersQuery();

  if (isLoading) return <LoadingState label="Loading your orders…" />;
  if (isError) {
    return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;
  }

  if (!orders || orders.length === 0) {
    return (
      <>
        <PageHeading title="Your orders" />
        <EmptyState
          icon={<Package size={20} aria-hidden="true" />}
          title="No orders yet"
          description="Orders you place at any store on Nexus will appear here, wherever you bought them."
          action={
            /* See CustomerDashboard: `/storefront` without a slug renders
               "No storefront specified", not a shop. */
            <Link to="/products">
              <Button variant="primary" size="md">Start shopping</Button>
            </Link>
          }
        />
      </>
    );
  }

  // One identity across every store, so the history is grouped by nothing but time.
  const storeCount = new Set(orders.map(o => o.store?.id).filter(Boolean)).size;

  return (
    <>
      <PageHeading
        title="Your orders"
        subtitle={
          storeCount > 1
            ? `${orders.length} orders across ${storeCount} stores`
            : `${orders.length} order${orders.length === 1 ? '' : 's'}`
        }
      />
      <div className="space-y-3">
        {orders.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </>
  );
}

function OrderDetail({ id }: { id: string }) {
  const { data: order, isLoading, isError, error, refetch } = useAccountOrderQuery(id);

  if (isLoading) return <LoadingState label="Loading order…" />;
  if (isError) {
    return (
      <>
        <BackLink />
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      </>
    );
  }
  if (!order) {
    return (
      <>
        <BackLink />
        <ErrorState message="That order could not be found." />
      </>
    );
  }

  const shipping = order.addresses.find(a => a.type === 'SHIPPING') ?? order.addresses[0] ?? null;
  // The account endpoint carries no shipment record, so progress stops at
  // "preparing" here; the tracking page is what surfaces carrier details.
  const steps = deriveOrderProgress(order);

  return (
    <>
      <BackLink />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold text-[var(--brand-yellow-ink)] sm:text-2xl">
            {order.orderNumber}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {order.store && (
              <span className="inline-flex items-center gap-1.5">
                <Store size={13} aria-hidden="true" />
                {order.store.name}
              </span>
            )}
            <span aria-hidden="true">·</span>
            <time dateTime={order.createdAt}>
              {new Date(order.createdAt).toLocaleDateString(undefined, {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </time>
          </div>
        </div>
        <Badge variant={statusVariant(order.status)} size="sm">
          {statusLabel(order.status)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-5">
            <h2 className="mb-4 text-sm font-semibold text-primary">Items</h2>
            <ul className="divide-y divide-[var(--ink)]/5">
              {order.items.map(item => (
                <li key={item.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">{item.productTitle}</p>
                    {item.variantTitle && (
                      <p className="mt-0.5 text-xs text-muted">{item.variantTitle}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted">Qty {item.quantity}</p>
                  </div>
                  <span className="flex-shrink-0 font-mono text-sm text-strong">
                    {formatMoney(item.price * item.quantity, order.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-[var(--ink)]/10 pt-4 text-sm">
              <Row label="Subtotal" value={formatMoney(order.subtotal, order.currency)} />
              {order.discount > 0 && (
                <Row label="Discount" value={`−${formatMoney(order.discount, order.currency)}`} />
              )}
              <Row label="Shipping" value={order.shipping === 0 ? 'Free' : formatMoney(order.shipping, order.currency)} />
              <Row label="Tax" value={formatMoney(order.tax, order.currency)} />
              <div className="flex items-center justify-between border-t border-[var(--ink)]/10 pt-3 text-base font-bold text-primary">
                <dt>Total</dt>
                <dd className="font-mono">{formatMoney(order.total, order.currency)}</dd>
              </div>
            </dl>
          </section>

          {shipping && (
            <section className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-5">
              <h2 className="mb-3 text-sm font-semibold text-primary">Delivery address</h2>
              <address className="text-sm not-italic leading-relaxed text-secondary">
                {shipping.firstName} {shipping.lastName}<br />
                {shipping.address1}<br />
                {shipping.address2 && <>{shipping.address2}<br /></>}
                {shipping.city}{shipping.state ? `, ${shipping.state}` : ''} {shipping.zip}<br />
                {shipping.country}
              </address>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-5">
            <h2 className="mb-4 text-sm font-semibold text-primary">Progress</h2>
            <OrderProgress steps={steps} />
          </section>

          <section className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-5">
            <h2 className="mb-2 text-sm font-semibold text-primary">Payment</h2>
            <p className="text-sm text-secondary">{statusLabel(order.paymentStatus)}</p>
          </section>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted">
      <dt>{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/account/orders"
      className="mb-5 inline-flex items-center gap-1.5 rounded text-sm text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27C93F]"
    >
      <ArrowLeft size={14} aria-hidden="true" />
      All orders
    </Link>
  );
}
