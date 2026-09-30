import { FileText, CreditCard } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { usePlatformInvoicesQuery, usePlatformTransactionsQuery } from '../../../hooks/useBillingQueries';
import { LoadingState, ErrorState, PageHeading } from '../../customer/components/States';
import { money, shortDate, statusTone, titleCase } from '../format';

export function AdminInvoices() {
  const { data: invoices = [], isLoading, isError, error, refetch } = usePlatformInvoicesQuery();

  if (isLoading) return <LoadingState label="Loading invoices…" />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;

  return (
    <>
      <PageHeading
        title="Invoices"
        subtitle={`The ${invoices.length} most recent platform invoices.`}
      />

      {invoices.length === 0 ? (
        <Empty icon={<FileText size={20} aria-hidden="true" />} text="No invoices have been issued yet." />
      ) : (
        <ul className="space-y-2">
          {invoices.map(inv => (
            <li
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-[#FFBD2E]">{inv.invoiceNumber}</span>
                  <Badge variant={statusTone(inv.status)} size="sm">{titleCase(inv.status)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {shortDate(inv.periodStart)} – {shortDate(inv.periodEnd)}
                  {inv.paidAt && ` · paid ${shortDate(inv.paidAt)}`}
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-white">
                {money(inv.total, inv.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function AdminTransactions() {
  const { data: transactions = [], isLoading, isError, error, refetch } = usePlatformTransactionsQuery();

  if (isLoading) return <LoadingState label="Loading transactions…" />;
  if (isError) return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;

  return (
    <>
      <PageHeading
        title="Transactions"
        subtitle={`The ${transactions.length} most recent billing transactions across all stores.`}
      />

      {transactions.length === 0 ? (
        <Empty icon={<CreditCard size={20} aria-hidden="true" />} text="No billing transactions recorded yet." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <caption className="sr-only">Billing transactions across all stores</caption>
              <thead className="bg-white/5">
                <tr>
                  <th scope="col" className="p-4 text-xs font-semibold uppercase tracking-wider text-muted">Store</th>
                  <th scope="col" className="p-4 text-xs font-semibold uppercase tracking-wider text-muted">Type</th>
                  <th scope="col" className="p-4 text-xs font-semibold uppercase tracking-wider text-muted">Provider</th>
                  <th scope="col" className="p-4 text-xs font-semibold uppercase tracking-wider text-muted">Reference</th>
                  <th scope="col" className="p-4 text-xs font-semibold uppercase tracking-wider text-muted">Status</th>
                  <th scope="col" className="p-4 text-right text-xs font-semibold uppercase tracking-wider text-muted">Amount</th>
                  <th scope="col" className="p-4 text-xs font-semibold uppercase tracking-wider text-muted">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <td className="p-4 text-sm text-strong">{tx.store?.name ?? '—'}</td>
                    <td className="p-4 text-xs text-secondary">{titleCase(tx.type)}</td>
                    <td className="p-4 text-xs text-secondary">{titleCase(tx.provider)}</td>
                    <td className="p-4 font-mono text-[11px] text-muted">{tx.providerReference}</td>
                    <td className="p-4">
                      <Badge variant={statusTone(tx.status)} size="sm">{titleCase(tx.status)}</Badge>
                    </td>
                    <td className="p-4 text-right font-mono text-sm text-white">
                      {money(tx.amount, tx.currency)}
                    </td>
                    <td className="p-4 text-xs text-muted">{shortDate(tx.createdAt)}</td>
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

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-14 text-center">
      <div className="mx-auto mb-3 text-muted">{icon}</div>
      <p className="text-sm text-secondary">{text}</p>
    </div>
  );
}
