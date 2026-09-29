import { Link } from 'react-router-dom';
import { ChevronRight, Store } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import type { AccountOrder } from '../../../api/account';
import { formatMoney, statusLabel, statusVariant } from '../orderProgress';

/**
 * A customer identity spans every store on Nexus, so each order has to say which
 * store it came from — without that the combined history is unreadable.
 */
export function OrderCard({ order }: { order: AccountOrder }) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const placed = new Date(order.createdAt);

  return (
    <Link
      to={`/account/orders/${order.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27C93F] sm:p-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-sm font-semibold text-[#FFBD2E]">
            {order.orderNumber}
          </span>
          <Badge variant={statusVariant(order.status)} size="sm">
            {statusLabel(order.status)}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/50">
          {order.store && (
            <span className="inline-flex items-center gap-1.5">
              <Store size={12} aria-hidden="true" />
              {order.store.name}
            </span>
          )}
          <span aria-hidden="true">·</span>
          <span>
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </span>
          <span aria-hidden="true">·</span>
          <time dateTime={order.createdAt}>
            {placed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </time>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
        <span className="font-mono text-sm font-bold text-white">
          {formatMoney(order.total, order.currency)}
        </span>
        <ChevronRight
          size={16}
          className="text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
