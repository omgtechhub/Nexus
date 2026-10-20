import { useState, useMemo } from 'react';
import { Search, Store as MerchantIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { usePlatformMerchantsQuery } from '../../../hooks/useBillingQueries';
import { LoadingState, ErrorState, PageHeading } from '../../customer/components/States';
import { shortDate, statusTone, titleCase } from '../format';

export function AdminMerchants() {
  const { data: merchants = [], isLoading, isError, error, refetch } = usePlatformMerchantsQuery();
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return merchants;
    return merchants.filter(m =>
      m.name.toLowerCase().includes(term) ||
      m.domain.toLowerCase().includes(term) ||
      (m.owner?.email || '').toLowerCase().includes(term) ||
      (m.owner?.name || '').toLowerCase().includes(term)
    );
  }, [merchants, search]);

  if (isLoading) return <LoadingState label="Loading merchants…" />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;

  return (
    <>
      <PageHeading
        title="Merchants"
        subtitle={`${merchants.length} merchant${merchants.length === 1 ? '' : 's'} on the platform.`}
      />

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by merchant, domain or owner"
          aria-label="Search merchants"
          className="w-full rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 py-2.5 pl-10 pr-3 text-sm text-primary placeholder:text-muted focus:border-[#FFBD2E]/50 focus:outline-none"
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] px-6 py-14 text-center">
          <MerchantIcon size={20} className="mx-auto mb-3 text-muted" aria-hidden="true" />
          <p className="text-sm text-secondary">
            {merchants.length === 0 ? 'No merchant merchants yet.' : 'No merchants match that search.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--ink)]/10">
          {/* `relative` contains the sr-only caption, which is position:absolute
              and would otherwise widen the document at phone sizes. */}
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <caption className="sr-only">Merchant merchants with owner, plan and activity</caption>
              <thead className="bg-[var(--ink)]/5">
                <tr>
                  <Th>Merchant</Th>
                  <Th>Owner</Th>
                  <Th>Plan</Th>
                  <Th>Status</Th>
                  <Th align="right">Products</Th>
                  <Th align="right">Orders</Th>
                  <Th align="right">Team</Th>
                  <Th>Joined</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map(m => (
                  <tr key={m.id} className="border-t border-[var(--ink)]/5 hover:bg-[var(--ink)]/[0.03]">
                    <td className="p-4">
                      <p className="text-sm font-medium text-primary">{m.name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted">{m.domain}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-strong">{m.owner?.name}</p>
                      <p className="mt-0.5 text-xs text-muted">{m.owner?.email}</p>
                    </td>
                    <td className="p-4">
                      {m.subscription ? (
                        <>
                          <p className="text-sm text-strong">{m.subscription.planName}</p>
                          <p className="mt-0.5 text-xs text-muted">{titleCase(m.subscription.interval)}</p>
                        </>
                      ) : (
                        <span className="text-xs text-muted">No subscription</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={statusTone(m.subscription?.status ?? m.status)} size="sm">
                        {titleCase(m.subscription?.status ?? m.status)}
                      </Badge>
                    </td>
                    <td className="p-4 text-right font-mono text-sm text-body">{m.metrics.productCount}</td>
                    <td className="p-4 text-right font-mono text-sm text-body">{m.metrics.orderCount}</td>
                    <td className="p-4 text-right font-mono text-sm text-body">{m.metrics.memberCount}</td>
                    <td className="p-4 text-xs text-muted">{shortDate(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th
      scope="col"
      className={
        'p-4 text-xs font-semibold uppercase tracking-wider text-muted' +
        (align === 'right' ? ' text-right' : '')
      }
    >
      {children}
    </th>
  );
}
