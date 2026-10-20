import { Link } from 'react-router-dom';
import { Package, Truck, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useApp } from '../../../context/AppContext';
import { useAccountOrdersQuery } from '../../../hooks/useAccount';
import { OrderCard } from '../components/OrderCard';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { formatMoney } from '../orderProgress';
import { PLATFORM_CURRENCY } from '../../../utils/money';

export function CustomerDashboard() {
  const { user } = useApp();
  const { data: orders, isLoading, isError, error, refetch } = useAccountOrdersQuery();

  const firstName = user?.name?.split(' ')[0];

  if (isLoading) return <LoadingState label="Loading your account…" />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;

  const list = orders ?? [];
  const inProgress = list.filter(
    o => o.status !== 'FULFILLED' && o.status !== 'CANCELLED' && o.status !== 'REFUNDED'
  );

  // Totals only mean something within one currency, so a mixed history shows
  // the order count instead of a sum that silently adds dollars to naira.
  const currencies = new Set(list.map(o => o.currency || PLATFORM_CURRENCY));
  const singleCurrency = currencies.size === 1 ? [...currencies][0] : null;
  const lifetime = singleCurrency ? list.reduce((sum, o) => sum + o.total, 0) : null;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">
          {firstName ? `Welcome back, ${firstName}` : 'Your account'}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Every order you place on Nexus, from any merchant, in one place.
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Package size={20} aria-hidden="true" />}
          title="No orders yet"
          description="Once you buy from a merchant on Nexus, your orders and delivery updates will show up here."
          action={
            /* `/products`, the marketplace. `/storefront` needs a store slug
               and renders "No storefront specified" without one — so this
               empty state, the first thing a new customer ever sees, was a
               dead end. */
            <Link to="/products">
              <Button variant="primary" size="md">Start shopping</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            <Stat label="Orders" value={String(list.length)} />
            <Stat label="In progress" value={String(inProgress.length)} />
            <Stat
              label={lifetime !== null ? 'Total spent' : 'Currencies'}
              value={
                lifetime !== null
                  ? formatMoney(lifetime, singleCurrency!)
                  : [...currencies].join(', ')
              }
            />
          </div>

          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-primary">Recent orders</h2>
              <Link
                to="/account/orders"
                className="inline-flex items-center gap-1 rounded text-xs text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27C93F]"
              >
                View all <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
            <div className="space-y-3">
              {list.slice(0, 4).map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <QuickLink
          to="/track"
          icon={<Truck size={16} aria-hidden="true" />}
          title="Track an order"
          description="Look up any order with its number and email — no sign-in needed."
        />
        <QuickLink
          to="/account/addresses"
          icon={<MapPin size={16} aria-hidden="true" />}
          title="Delivery addresses"
          description="Manage where your orders get sent."
        />
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}

function QuickLink({
  to, icon, title, description,
}: { to: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-4 transition-colors hover:border-[var(--ink)]/20 hover:bg-[var(--ink)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27C93F]"
    >
      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--ink)]/5 text-[var(--brand-green-ink)]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-primary">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
      </span>
    </Link>
  );
}
