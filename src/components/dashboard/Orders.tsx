import { useState } from 'react';
import { Search, Filter, Download, Eye, Package, CheckCircle, Truck, XCircle, Clock } from 'lucide-react';
import { mockOrders } from '../../data/mockData';
import { Order } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

const statusConfig: Record<string, { variant: 'success' | 'info' | 'warning' | 'error' | 'default'; icon: React.ReactNode; label: string }> = {
  pending: { variant: 'default', icon: <Clock size={12} />, label: 'Pending' },
  confirmed: { variant: 'info', icon: <CheckCircle size={12} />, label: 'Confirmed' },
  processing: { variant: 'warning', icon: <Package size={12} />, label: 'Processing' },
  shipped: { variant: 'success', icon: <Truck size={12} />, label: 'Shipped' },
  delivered: { variant: 'success', icon: <CheckCircle size={12} />, label: 'Delivered' },
  cancelled: { variant: 'error', icon: <XCircle size={12} />, label: 'Cancelled' },
  refunded: { variant: 'error', icon: <XCircle size={12} />, label: 'Refunded' },
};

const filters = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export function Orders() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = mockOrders.filter(order => {
    const matchSearch = !search ||
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === 'All' ||
      order.status.toLowerCase() === activeFilter.toLowerCase();
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-white/40 text-sm">{mockOrders.length} total orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Download size={14} />}>Export</Button>
          <Button variant="primary" size="sm" icon={<Package size={14} />}>Fulfill orders</Button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="form-input pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                activeFilter === filter
                  ? 'bg-gradient-to-r from-[#FF5F56] to-[#FFBD2E] text-white font-semibold shadow-md'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20'
              )}
            >
              {filter}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white text-xs hover:border-white/20 transition-all">
          <Filter size={13} />
          Filters
        </button>
      </div>

      {/* Orders table */}
      <div className="stat-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left p-4 text-xs font-semibold text-white/30 uppercase tracking-wider">Order</th>
                <th className="text-left p-4 text-xs font-semibold text-white/30 uppercase tracking-wider">Customer</th>
                <th className="text-left p-4 text-xs font-semibold text-white/30 uppercase tracking-wider hidden md:table-cell">Items</th>
                <th className="text-left p-4 text-xs font-semibold text-white/30 uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-xs font-semibold text-white/30 uppercase tracking-wider">Total</th>
                <th className="text-left p-4 text-xs font-semibold text-white/30 uppercase tracking-wider hidden sm:table-cell">Date</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const status = statusConfig[order.status] || statusConfig.pending;
                return (
                  <tr
                    key={order.id}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors"
                  >
                    <td className="p-4">
                      <span className="text-sm font-mono font-semibold text-[#FFBD2E]">{order.orderNumber}</span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm font-medium text-white">{order.customer.name}</p>
                        <p className="text-xs text-white/30">{order.customer.email}</p>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-sm text-white/50">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant={status.variant} size="sm" dot>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{formatCurrency(order.total)}</p>
                        <p className={cn(
                          'text-xs capitalize',
                          order.paymentStatus === 'paid' ? 'text-[#27C93F]' : 
                          order.paymentStatus === 'refunded' ? 'text-[#FF5F56]' : 'text-[#FFBD2E]'
                        )}>
                          {order.paymentStatus}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span className="text-xs text-white/40">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-white/30">
              <Package size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders found</p>
            </div>
          )}
        </div>
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="relative glass border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedOrder.orderNumber}</h2>
                <p className="text-xs text-white/40">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Customer */}
              <div>
                <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Customer</h4>
                <div className="glass rounded-xl p-3 border border-white/5">
                  <p className="text-sm font-semibold text-white">{selectedOrder.customer.name}</p>
                  <p className="text-xs text-white/40">{selectedOrder.customer.email}</p>
                </div>
              </div>
              {/* Items */}
              <div>
                <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 glass rounded-xl border border-white/5">
                      <div>
                        <p className="text-sm text-white">{item.title}</p>
                        <p className="text-xs text-white/40">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold text-white">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Totals */}
              <div className="glass rounded-xl p-4 border border-white/5 space-y-2">
                <div className="flex justify-between text-sm text-white/50">
                  <span>Subtotal</span><span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-white/50">
                  <span>Shipping</span><span>{selectedOrder.shipping === 0 ? 'Free' : formatCurrency(selectedOrder.shipping)}</span>
                </div>
                <div className="flex justify-between text-sm text-white/50">
                  <span>Tax</span><span>{formatCurrency(selectedOrder.tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white border-t border-white/10 pt-2 mt-2">
                  <span>Total</span><span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>
              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="primary" size="sm" fullWidth>Mark as fulfilled</Button>
                <Button variant="ghost" size="sm">Print label</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
