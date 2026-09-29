import { useState, useMemo } from 'react';
import { Package, Search, AlertTriangle, Plus, Minus, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { useInventoryQuery, useAdjustInventoryMutation } from '../../hooks/useQueries';
import type { InventoryItemResponse } from '../../api/inventory';
import { cn } from '../../utils/cn';

type StockState = 'out' | 'low' | 'ok';

function stockState(item: InventoryItemResponse): StockState {
  if (item.availableStock <= 0) return 'out';
  if (item.availableStock <= item.lowStockThreshold) return 'low';
  return 'ok';
}

const STOCK_BADGE: Record<StockState, { variant: 'error' | 'warning' | 'success'; label: string }> = {
  out: { variant: 'error', label: 'Out of stock' },
  low: { variant: 'warning', label: 'Low stock' },
  ok: { variant: 'success', label: 'In stock' },
};

export function InventorySection() {
  const { data: items = [], isLoading, isError, error, refetch } = useInventoryQuery();
  const adjustStock = useAdjustInventoryMutation();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | StockState>('all');
  const [adjusting, setAdjusting] = useState<InventoryItemResponse | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');

  const counts = useMemo(() => {
    const tally = { all: items.length, out: 0, low: 0, ok: 0 };
    for (const item of items) tally[stockState(item)] += 1;
    return tally;
  }, [items]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter(item => {
      if (filter !== 'all' && stockState(item) !== filter) return false;
      if (!term) return true;
      return (
        (item.product?.title || '').toLowerCase().includes(term) ||
        (item.sku || '').toLowerCase().includes(term) ||
        (item.variant?.title || '').toLowerCase().includes(term)
      );
    });
  }, [items, search, filter]);

  const openAdjust = (item: InventoryItemResponse) => {
    setAdjusting(item);
    setDelta('');
    setReason('');
  };

  const submitAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjusting) return;
    const change = parseInt(delta, 10);
    if (!Number.isFinite(change) || change === 0) {
      toast.error('Enter how much to add or remove');
      return;
    }
    if (adjusting.stock + change < 0) {
      toast.error(`Cannot remove ${Math.abs(change)} — only ${adjusting.stock} in stock`);
      return;
    }

    adjustStock.mutate(
      {
        productId: adjusting.productId,
        changeQuantity: change,
        reason: reason.trim() || undefined,
        variantId: adjusting.variantId,
      },
      {
        onSuccess: () => {
          toast.success(
            `${change > 0 ? 'Added' : 'Removed'} ${Math.abs(change)} · ${adjusting.product?.title ?? 'item'}`
          );
          setAdjusting(null);
        },
        onError: (err: any) => toast.error(err?.message || 'Could not adjust stock'),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-white/50" role="status">
        <RotateCw size={18} className="animate-spin" aria-hidden="true" />
        <span className="text-sm">Loading inventory…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-[#FF5F56]/30 bg-[#FF5F56]/5 p-6 text-center" role="alert">
        <AlertTriangle size={20} className="mx-auto mb-3 text-[#FF5F56]" aria-hidden="true" />
        <p className="text-sm text-white/80">{(error as Error)?.message || 'Could not load inventory.'}</p>
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Tracked items" value={counts.all} />
        <Stat label="Low stock" value={counts.low} tone={counts.low > 0 ? 'warning' : undefined} />
        <Stat label="Out of stock" value={counts.out} tone={counts.out > 0 ? 'error' : undefined} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by product or SKU"
            aria-label="Search inventory"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/30 focus:border-[#FFBD2E]/50 focus:outline-none"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Filter by stock level">
          {(['all', 'low', 'out', 'ok'] as const).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                filter === key
                  ? 'bg-[#FFBD2E] text-slate-950 font-semibold'
                  : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
              )}
            >
              {key === 'all' ? 'All' : STOCK_BADGE[key].label} ({counts[key]})
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-14 text-center">
          <Package size={20} className="mx-auto mb-3 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/60">
            {items.length === 0
              ? 'No inventory is being tracked yet. Stock is created with each product.'
              : 'No items match that search.'}
          </p>
        </div>
      ) : (
        // The card clips its corners; the inner wrapper is what scrolls, so a
        // wide table cannot push the whole page sideways on a phone.
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {/* `relative` matters: the sr-only caption and header below are
              position:absolute, and without a positioned ancestor they anchor at
              their static position inside the 640px-wide table, which extends the
              document's scroll area and gives the whole page a horizontal
              scrollbar on a phone. */}
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
            <caption className="sr-only">Inventory levels by product</caption>
            <thead className="bg-white/5">
              <tr>
                <th scope="col" className="p-4 text-xs font-semibold uppercase tracking-wider text-white/40">Product</th>
                <th scope="col" className="p-4 text-xs font-semibold uppercase tracking-wider text-white/40">SKU</th>
                <th scope="col" className="p-4 text-right text-xs font-semibold uppercase tracking-wider text-white/40">On hand</th>
                <th scope="col" className="p-4 text-right text-xs font-semibold uppercase tracking-wider text-white/40">Reserved</th>
                <th scope="col" className="p-4 text-right text-xs font-semibold uppercase tracking-wider text-white/40">Available</th>
                <th scope="col" className="p-4 text-xs font-semibold uppercase tracking-wider text-white/40">Status</th>
                <th scope="col" className="p-4"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(item => {
                const state = stockState(item);
                const badge = STOCK_BADGE[state];
                return (
                  <tr key={item.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <td className="p-4">
                      <p className="text-sm font-medium text-white">{item.product?.title || 'Untitled product'}</p>
                      {item.variant?.title && (
                        <p className="mt-0.5 text-xs text-white/40">{item.variant.title}</p>
                      )}
                    </td>
                    <td className="p-4 font-mono text-xs text-white/50">{item.sku || '—'}</td>
                    <td className="p-4 text-right font-mono text-sm text-white/80">{item.stock}</td>
                    <td className="p-4 text-right font-mono text-sm text-white/40">{item.reservedStock}</td>
                    <td className="p-4 text-right font-mono text-sm font-semibold text-white">{item.availableStock}</td>
                    <td className="p-4">
                      <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="secondary" size="sm" onClick={() => openAdjust(item)}>
                        Adjust
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {adjusting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="adjust-stock-title"
        >
          <form
            onSubmit={submitAdjust}
            className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0D0F1F] p-6"
          >
            <h2 id="adjust-stock-title" className="text-base font-semibold text-white">
              Adjust stock
            </h2>
            <p className="mt-1 text-sm text-white/50">
              {adjusting.product?.title}
              {adjusting.variant?.title ? ` · ${adjusting.variant.title}` : ''}
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <div className="flex items-center justify-between text-white/50">
                <span>On hand now</span>
                <span className="font-mono text-white">{adjusting.stock}</span>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="stock-delta" className="mb-1.5 block text-sm font-medium text-white/70">
                  Change
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDelta(String((parseInt(delta, 10) || 0) - 1))}
                    aria-label="Decrease by one"
                    className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white"
                  >
                    <Minus size={16} aria-hidden="true" />
                  </button>
                  <input
                    id="stock-delta"
                    type="number"
                    inputMode="numeric"
                    value={delta}
                    onChange={e => setDelta(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-center font-mono text-white focus:border-[#FFBD2E]/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setDelta(String((parseInt(delta, 10) || 0) + 1))}
                    aria-label="Increase by one"
                    className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white"
                  >
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-white/40">
                  Use a negative number to remove stock. New total:{' '}
                  <span className="font-mono text-white/70">
                    {adjusting.stock + (parseInt(delta, 10) || 0)}
                  </span>
                </p>
              </div>

              <Input
                label="Reason (optional)"
                id="stock-reason"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Restock, damaged, recount…"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <Button type="submit" variant="primary" size="md" fullWidth loading={adjustStock.isPending}>
                Save adjustment
              </Button>
              <Button type="button" variant="ghost" size="md" onClick={() => setAdjusting(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warning' | 'error' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-white/40">{label}</p>
      <p
        className={cn(
          'mt-1.5 text-2xl font-bold',
          tone === 'error' ? 'text-[#FF5F56]' : tone === 'warning' ? 'text-[#FFBD2E]' : 'text-white'
        )}
      >
        {value}
      </p>
    </div>
  );
}
