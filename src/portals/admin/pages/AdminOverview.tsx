import { Link } from 'react-router-dom';
import { Store, Users, Layers, ArrowRight } from 'lucide-react';
import { usePlatformMetricsQuery, usePlatformMerchantsQuery } from '../../../hooks/useBillingQueries';
import { LoadingState, ErrorState, PageHeading } from '../../customer/components/States';
import { money } from '../format';

export function AdminOverview() {
  const { data: metrics, isLoading, isError, error, refetch } = usePlatformMetricsQuery();
  const { data: merchants = [] } = usePlatformMerchantsQuery();

  if (isLoading) return <LoadingState label="Loading platform metrics…" />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;
  if (!metrics) return <ErrorState message="No metrics available." />;

  const recent = [...merchants]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <>
      <PageHeading
        title="Platform overview"
        subtitle="Recurring revenue and platform totals, computed from live subscription and transaction records."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Monthly recurring revenue" value={money(metrics.mrr)} tone="success" />
        <Metric label="Annual run rate" value={money(metrics.arr)} tone="accent" />
        <Metric label="Active subscriptions" value={String(metrics.activeSubscriptionsCount)} />
        <Metric label="Revenue collected" value={money(metrics.totalRevenue)} />
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Stores" value={String(metrics.totalStores)} small />
        <Metric label="Users" value={String(metrics.totalUsers)} small />
        <Metric label="Transactions" value={String(metrics.totalTransactionsCount)} small />
        <Metric label="Plans" value={String(metrics.plansCount)} small />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary">Newest merchants</h2>
          <Link
            to="/admin/merchants"
            className="inline-flex items-center gap-1 rounded text-xs text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
          >
            All merchants <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] px-6 py-10 text-center text-sm text-muted">
            No merchant stores yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map(m => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary">{m.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {m.owner?.email} · joined{' '}
                    {new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-4 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Layers size={12} aria-hidden="true" />
                    {m.subscription?.planName ?? 'No plan'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Store size={12} aria-hidden="true" />
                    {m.metrics.productCount} products
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={12} aria-hidden="true" />
                    {m.metrics.memberCount}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Metric({
  label, value, tone, small,
}: { label: string; value: string; tone?: 'success' | 'accent'; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p
        className={
          (small ? 'mt-1.5 text-xl font-bold ' : 'mt-1.5 text-2xl font-bold ') +
          (tone === 'success' ? 'text-[var(--brand-green-ink)]' : tone === 'accent' ? 'text-[var(--brand-yellow-ink)]' : 'text-primary')
        }
      >
        {value}
      </p>
    </div>
  );
}
