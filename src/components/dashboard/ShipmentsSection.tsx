import { useState, useMemo } from 'react';
import { Truck, Search, AlertTriangle, RotateCw, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useShipmentsQuery, useUpdateShipmentStatusMutation } from '../../hooks/useShipping';
import { cn } from '../../utils/cn';

type ShipmentStatus = 'LABEL_CREATED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION';

const STATUS: Record<ShipmentStatus, { label: string; variant: 'default' | 'info' | 'success' | 'error' }> = {
  LABEL_CREATED: { label: 'Label created', variant: 'default' },
  IN_TRANSIT: { label: 'In transit', variant: 'info' },
  DELIVERED: { label: 'Delivered', variant: 'success' },
  EXCEPTION: { label: 'Exception', variant: 'error' },
};

const STATUS_EVENT_TEXT: Record<ShipmentStatus, string> = {
  LABEL_CREATED: 'Shipping label created',
  IN_TRANSIT: 'Package handed to the carrier and in transit',
  DELIVERED: 'Package delivered',
  EXCEPTION: 'Delivery exception reported — the carrier could not complete delivery',
};

const ORDERED_STATUSES: ShipmentStatus[] = ['LABEL_CREATED', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION'];

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ShipmentsSection() {
  const { data: shipments = [], isLoading, isError, error, refetch } = useShipmentsQuery();
  const updateStatus = useUpdateShipmentStatusMutation();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | ShipmentStatus>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const counts = useMemo(() => {
    const tally: Record<string, number> = { all: shipments.length };
    for (const status of ORDERED_STATUSES) tally[status] = 0;
    for (const s of shipments) tally[s.status] = (tally[s.status] ?? 0) + 1;
    return tally;
  }, [shipments]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return shipments.filter(s => {
      if (filter !== 'all' && s.status !== filter) return false;
      if (!term) return true;
      return (
        s.trackingNumber.toLowerCase().includes(term) ||
        s.carrier.toLowerCase().includes(term) ||
        (s.order?.orderNumber || '').toLowerCase().includes(term) ||
        (s.order?.customerName || '').toLowerCase().includes(term)
      );
    });
  }, [shipments, search, filter]);

  const handleStatusChange = (id: string, status: ShipmentStatus) => {
    updateStatus.mutate(
      // Each change appends an event to the tracking history the buyer sees, so
      // it needs a sentence rather than a bare status code.
      { id, status, description: STATUS_EVENT_TEXT[status] },
      {
        onSuccess: () => toast.success(`Marked ${STATUS[status].label.toLowerCase()}`),
        onError: (err: any) => toast.error(err?.message || 'Could not update the shipment'),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-muted" role="status">
        <RotateCw size={18} className="animate-spin" aria-hidden="true" />
        <span className="text-sm">Loading shipments…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-[#FF5F56]/30 bg-[#FF5F56]/5 p-6 text-center" role="alert">
        <AlertTriangle size={20} className="mx-auto mb-3 text-[#FF5F56]" aria-hidden="true" />
        <p className="text-sm text-strong">{(error as Error)?.message || 'Could not load shipments.'}</p>
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tracking number, carrier or order"
            aria-label="Search shipments"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-muted focus:border-[#FFBD2E]/50 focus:outline-none"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Filter by shipment status">
          {(['all', ...ORDERED_STATUSES] as const).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key as 'all' | ShipmentStatus)}
              aria-pressed={filter === key}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                filter === key
                  ? 'bg-[#FFBD2E] text-slate-950 font-semibold'
                  : 'border border-white/10 bg-white/5 text-secondary hover:text-white'
              )}
            >
              {key === 'all' ? 'All' : STATUS[key as ShipmentStatus].label} ({counts[key] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-14 text-center">
          <Truck size={20} className="mx-auto mb-3 text-muted" aria-hidden="true" />
          <p className="text-sm text-secondary">
            {shipments.length === 0
              ? 'No shipments yet. Fulfilling an order from the Orders page creates one.'
              : 'No shipments match that search.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map(shipment => {
            const status = STATUS[shipment.status as ShipmentStatus] ?? STATUS.LABEL_CREATED;
            const isOpen = expanded === shipment.id;
            const events = shipment.trackingEvents ?? [];

            return (
              <li key={shipment.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-sm font-semibold text-[#FFBD2E]">
                        {shipment.order?.orderNumber || 'Order'}
                      </span>
                      <Badge variant={status.variant} size="sm">{status.label}</Badge>
                    </div>
                    <p className="mt-1.5 text-sm text-body">
                      {shipment.carrier}
                      <span className="mx-2 text-muted" aria-hidden="true">·</span>
                      <span className="font-mono text-strong">{shipment.trackingNumber}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {shipment.order?.customerName}
                      {formatDate(shipment.shippedAt) && ` · Shipped ${formatDate(shipment.shippedAt)}`}
                      {formatDate(shipment.deliveredAt) && ` · Delivered ${formatDate(shipment.deliveredAt)}`}
                    </p>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2">
                    <label htmlFor={`status-${shipment.id}`} className="sr-only">
                      Status for {shipment.order?.orderNumber || 'shipment'}
                    </label>
                    <select
                      id={`status-${shipment.id}`}
                      value={shipment.status}
                      onChange={e => handleStatusChange(shipment.id, e.target.value as ShipmentStatus)}
                      disabled={updateStatus.isPending}
                      className="rounded-lg border border-white/10 bg-[#121528] px-3 py-2 text-xs text-white focus:border-[#FFBD2E]/50 focus:outline-none"
                    >
                      {ORDERED_STATUSES.map(s => (
                        <option key={s} value={s}>{STATUS[s].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {events.length > 0 && (
                  <div className="mt-3 border-t border-white/5 pt-3">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : shipment.id)}
                      aria-expanded={isOpen}
                      className="text-xs font-medium text-muted transition-colors hover:text-white"
                    >
                      {isOpen ? 'Hide' : 'Show'} tracking history ({events.length})
                    </button>

                    {isOpen && (
                      <ol className="mt-3 space-y-2.5">
                        {events.map(event => (
                          <li key={event.id} className="flex gap-3 text-xs">
                            <PackageCheck size={13} className="mt-0.5 flex-shrink-0 text-muted" aria-hidden="true" />
                            <div>
                              <p className="text-strong">{event.description}</p>
                              <p className="mt-0.5 text-muted">
                                {event.location && `${event.location} · `}
                                {new Date(event.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
