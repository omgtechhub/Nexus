import { useState } from 'react';
import { Search, Filter, Download, Eye, Package, CheckCircle, Truck, XCircle, Clock, Ban, Plus, Trash2, ShoppingBag, AlertTriangle, RotateCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCancelOrderMutation, useOrdersQuery } from '../../hooks/useQueries';
import { useRefundOrderMutation } from '../../hooks/usePayments';
import { useFulfillOrderMutation } from '../../hooks/useShipping';
import { Order, OrderStatus } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';
const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

const statusConfig: Record<OrderStatus, { variant: 'success' | 'info' | 'warning' | 'error' | 'default'; icon: React.ReactNode; label: string }> = {
  PENDING: { variant: 'default', icon: <Clock size={12} />, label: 'Pending' },
  CONFIRMED: { variant: 'info', icon: <CheckCircle size={12} />, label: 'Confirmed' },
  PROCESSING: { variant: 'warning', icon: <Truck size={12} />, label: 'Processing' },
  FULFILLED: { variant: 'success', icon: <Package size={12} />, label: 'Fulfilled' },
  CANCELLED: { variant: 'error', icon: <XCircle size={12} />, label: 'Cancelled' },
  REFUNDED: { variant: 'error', icon: <XCircle size={12} />, label: 'Refunded' },
};

const filters: Array<'All' | OrderStatus> = [
  'All', 'PENDING', 'CONFIRMED', 'PROCESSING', 'FULFILLED', 'CANCELLED', 'REFUNDED',
];

export function Orders() {
  const { orders: ordersList, products, customers: customersList, addOrder, updateOrder, addActivity } = useApp();
  const { isError, error, refetch } = useOrdersQuery();
  const cancelOrderMut = useCancelOrderMutation();
  const refundMut = useRefundOrderMutation();
  const fulfillOrderMut = useFulfillOrderMutation();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | OrderStatus>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Create Manual Order Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Customer selection / inputs
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('custom');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Shipping address inputs
  const [shipFirstName, setShipFirstName] = useState('');
  const [shipLastName, setShipLastName] = useState('');
  const [shipAddress1, setShipAddress1] = useState('');
  const [shipCity, setShipCity] = useState('');
  const [shipState, setShipState] = useState('');
  const [shipZip, setShipZip] = useState('');
  const [shipCountry, setShipCountry] = useState('US');

  // Line items
  const [lineItems, setLineItems] = useState<Array<{ productId: string; title: string; price: string; quantity: number }>>([
    { productId: products[0]?.id || '', title: products[0]?.title || 'Custom Item', price: (products[0]?.price || 25).toString(), quantity: 1 }
  ]);

  useDismissOnEscape(Boolean(selectedOrder), () => setSelectedOrder(null));
  useDismissOnEscape(showCreateModal, () => setShowCreateModal(false));

  const resetCreateOrderForm = () => {
    setSelectedCustomerId('custom');
    setCustomerName('');
    setCustomerEmail('');
    setShipFirstName('');
    setShipLastName('');
    setShipAddress1('');
    setShipCity('');
    setShipState('');
    setShipZip('');
    setShipCountry('US');
    setLineItems([{ productId: products[0]?.id || '', title: products[0]?.title || 'Custom Item', price: (products[0]?.price || 25).toString(), quantity: 1 }]);
  };

  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id);
    if (id === 'custom') {
      setCustomerName('');
      setCustomerEmail('');
    } else {
      const found = customersList.find(c => c.id === id);
      if (found) {
        setCustomerName(found.name);
        setCustomerEmail(found.email);
        const nameParts = found.name.split(' ');
        setShipFirstName(nameParts[0] || '');
        setShipLastName(nameParts.slice(1).join(' ') || '');
      }
    }
  };

  const handleAddLineItem = () => {
    const defaultProd = products[0];
    setLineItems(prev => [
      ...prev,
      {
        productId: defaultProd?.id || '',
        title: defaultProd?.title || 'Custom Item',
        price: (defaultProd?.price || 25).toString(),
        quantity: 1,
      }
    ]);
  };

  const handleUpdateLineItem = (index: number, field: string, value: any) => {
    setLineItems(prev => {
      const updated = [...prev];
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          updated[index] = {
            ...updated[index],
            productId: prod.id,
            title: prod.title,
            price: prod.price.toString(),
          };
        } else {
          updated[index] = { ...updated[index], productId: value };
        }
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const computedSubtotal = lineItems.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1),
    0
  );
  const computedTotal = computedSubtotal;

  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim()) {
      toast.error('Please enter customer name and email');
      return;
    }

    if (lineItems.length === 0 || lineItems.some(i => !i.title.trim() || (parseFloat(i.price) || 0) <= 0)) {
      toast.error('Please provide valid product details and price for all line items');
      return;
    }

    if (!shipFirstName.trim() || !shipAddress1.trim() || !shipCity.trim() || !shipState.trim() || !shipZip.trim()) {
      toast.error('Please complete the shipping address fields');
      return;
    }

    setIsSubmittingOrder(true);

    addOrder(
      {
        customer: {
          id: selectedCustomerId !== 'custom' ? selectedCustomerId : `c_${Date.now()}`,
          name: customerName.trim(),
          email: customerEmail.trim(),
          totalOrders: 1,
          totalSpent: computedTotal,
          createdAt: new Date(),
        },
        items: lineItems.map(item => ({
          productId: item.productId || products[0]?.id || 'p_default',
          title: item.title.trim(),
          price: parseFloat(item.price) || 0,
          quantity: Number(item.quantity) || 1,
        })),
        subtotal: computedSubtotal,
        total: computedTotal,
        tax: 0,
        shipping: 0,
        discount: 0,
        paymentStatus: 'PAID',
        fulfillmentStatus: 'UNFULFILLED',
        status: 'CONFIRMED',
        shippingAddress: {
          firstName: shipFirstName.trim(),
          lastName: shipLastName.trim(),
          address1: shipAddress1.trim(),
          city: shipCity.trim(),
          state: shipState.trim(),
          zip: shipZip.trim(),
          country: shipCountry.trim() || 'US',
        },
      },
      {
        onSuccess: () => {
          setIsSubmittingOrder(false);
          setShowCreateModal(false);
          resetCreateOrderForm();
          toast.success('Manual order created successfully!', { icon: '🛍️' });
        },
        onError: (err: any) => {
          setIsSubmittingOrder(false);
          toast.error(err.message || 'Failed to create manual order');
        },
      }
    );
  };

  const filtered = ordersList.filter(order => {
    const matchSearch = !search ||
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.customerName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === 'All' || order.status === activeFilter;
    return matchSearch && matchFilter;
  });

  const handleExportCSV = () => {
    const headers = ['Order Number', 'Customer', 'Email', 'Items', 'Status', 'Total', 'Payment Status', 'Date'];
    const rows = filtered.map(o => [
      o.orderNumber,
      `"${o.customerName}"`,
      o.customerEmail,
      o.items.length,
      o.status,
      o.total,
      o.paymentStatus,
      new Date(o.createdAt).toLocaleDateString()
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nexus_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported orders CSV successfully!', { icon: '📊' });
  };

  const handleBatchFulfill = () => {
    ordersList.forEach(o => {
      if (o.status === 'PENDING' || o.status === 'CONFIRMED') {
        updateOrder(o.id, { status: 'PROCESSING' });
      }
    });
    addActivity('Moved all new orders into processing', 'order', '📦');
    toast.success('All new orders moved to processing!', { icon: '📦' });
  };

  const handleCancelOrder = (orderId: string) => {
    cancelOrderMut.mutate({ id: orderId, reason: 'Cancelled by merchant from dashboard' }, {
      onSuccess: () => {
        toast.success('Order cancelled & stock restored to inventory!', { icon: '🔄' });
        setSelectedOrder(null);
      },
      onError: (err: any) => {
        toast.error(err.message || 'Failed to cancel order');
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-muted text-sm">{ordersList.length} total orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={handleExportCSV}>Export CSV</Button>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowCreateModal(true)}>Create order</Button>
          <Button variant="ghost" size="sm" icon={<Package size={14} />} onClick={handleBatchFulfill}>Fulfill orders</Button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input aria-label="Search orders"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders…"
            className="form-input pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
                activeFilter === filter
                  ? 'bg-gradient-to-r from-[#FF5F56] to-[#FFBD2E] text-white font-semibold shadow-md'
                  : 'bg-white/5 border border-white/10 text-muted hover:text-white hover:border-white/20'
              )}
            >
              {filter === 'All' ? 'All' : statusConfig[filter].label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setActiveFilter('All'); setSearch(''); }}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-muted hover:text-white text-xs hover:border-white/20 transition-colors cursor-pointer"
        >
          <Filter size={13} />
          Reset Filters
        </button>
      </div>

      {/* Orders table */}
      {isError ? (
        <div className="stat-card p-6 border border-[#FF5F56]/30 bg-[#FF5F56]/5 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#FF5F56]/10 border border-[#FF5F56]/20 flex items-center justify-center mx-auto text-[#FF5F56]">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Couldn't load orders</h4>
            <p className="text-xs text-[#FF5F56] mt-1">{(error as Error)?.message || 'An error occurred while fetching orders.'}</p>
          </div>
          <Button variant="ghost" size="sm" icon={<RotateCw size={13} />} onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="stat-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-xs font-semibold text-muted uppercase tracking-wider">Order</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted uppercase tracking-wider">Customer</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted uppercase tracking-wider hidden md:table-cell">Items</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted uppercase tracking-wider">Total</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => {
                  const status = statusConfig[order.status] || statusConfig.PENDING;
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
                          <p className="text-sm font-medium text-white">{order.customerName}</p>
                          <p className="text-xs text-muted">{order.customerEmail}</p>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <span className="text-sm text-muted">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
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
                            order.paymentStatus === 'PAID' || order.paymentStatus === 'SUCCESS' ? 'text-[#27C93F]' :
                            order.paymentStatus === 'REFUNDED' || order.paymentStatus === 'PARTIALLY_REFUNDED' ? 'text-[#FF5F56]' :
                            order.paymentStatus === 'FAILED' ? 'text-[#FF5F56]' : 'text-[#FFBD2E]'
                          )}>
                            {order.paymentStatus.replace(/_/g, ' ').toLowerCase()}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <span className="text-xs text-muted">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <button aria-label="View"
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title="View order details"
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
              <div className="p-12 text-center text-muted">
                <Package size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No orders found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} aria-hidden="true" />
          <div className="relative bg-[#121528] border border-white/20 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedOrder.orderNumber}</h2>
                <p className="text-xs text-muted">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Customer */}
              <div>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Customer</h4>
                <div className="glass rounded-xl p-3 border border-white/5">
                  <p className="text-sm font-semibold text-white">{selectedOrder.customer?.name}</p>
                  <p className="text-xs text-muted">{selectedOrder.customer?.email}</p>
                </div>
              </div>
              {/* Items */}
              <div>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 glass rounded-xl border border-white/5">
                      <div>
                        <p className="text-sm text-white">{item.title}</p>
                        <p className="text-xs text-muted">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold text-white">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Totals */}
              <div className="glass rounded-xl p-4 border border-white/5 space-y-2">
                <div className="flex justify-between text-sm text-muted">
                  <span>Subtotal</span><span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted">
                  <span>Shipping</span><span>{selectedOrder.shipping === 0 ? 'Free' : formatCurrency(selectedOrder.shipping)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted">
                  <span>Tax</span><span>{formatCurrency(selectedOrder.tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white border-t border-white/10 pt-2 mt-2">
                  <span>Total</span><span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>
              {/* Fulfill & Refund Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    disabled={selectedOrder.fulfillmentStatus === 'FULFILLED' || selectedOrder.status === 'CANCELLED'}
                    onClick={() => {
                      const carrier = prompt('Enter Carrier Name (e.g. DHL, FedEx, UPS):', 'DHL Express');
                      if (!carrier) return;
                      const trackingNumber = prompt('Enter Tracking Number:', `TRK${Math.floor(100000 + Math.random() * 900000)}`);
                      if (!trackingNumber) return;

                      fulfillOrderMut.mutate({
                        orderId: selectedOrder.id,
                        data: { carrier, trackingNumber, notes: 'Fulfilled via merchant dashboard' },
                      }, {
                        onSuccess: () => {
                          toast.success(`Order ${selectedOrder.orderNumber} marked as FULFILLED!`, { icon: '📦' });
                          setSelectedOrder(null);
                        },
                        onError: (err: any) => {
                          toast.error(err.message || 'Fulfillment failed');
                        }
                      });
                    }}
                  >
                    {selectedOrder.fulfillmentStatus === 'FULFILLED' ? '✓ Fulfilled' : 'Fulfill Order'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    disabled={selectedOrder.paymentStatus !== 'PAID' && selectedOrder.paymentStatus !== 'SUCCESS'}
                    onClick={() => {
                      const reason = prompt('Enter Refund Reason:', 'Customer request');
                      if (!reason) return;

                      refundMut.mutate({
                        orderId: selectedOrder.id,
                        data: { reason },
                      }, {
                        onSuccess: () => {
                          toast.success(`Refund issued for ${selectedOrder.orderNumber}!`, { icon: '💰' });
                          setSelectedOrder(null);
                        },
                        onError: (err: any) => {
                          toast.error(err.message || 'Refund failed');
                        }
                      });
                    }}
                  >
                    Issue Refund
                  </Button>
                </div>
                {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'REFUNDED' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    icon={<Ban size={14} />}
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                  >
                    Cancel Order
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Manual Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-2xl bg-[#121528] border border-white/20 p-6 rounded-2xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="text-[#FFBD2E]" size={20} /> Create Manual Order
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-5 text-xs">
              {/* Customer Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">Customer Details</h4>
                <div>
                  <label htmlFor="orders-select-existing-customer-optiona-2" className="block text-muted mb-1">Select Existing Customer (Optional)</label>
                  <select id="orders-select-existing-customer-optiona-2"
                    value={selectedCustomerId}
                    onChange={e => handleCustomerSelect(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#15182b] border border-white/10 text-white focus:outline-none focus:border-[#FFBD2E]"
                  >
                    <option value="custom">-- Walk-in / New Customer --</option>
                    {customersList.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="orders-customer-full-name-3" className="block text-body font-semibold mb-1">Customer Full Name *</label>
                    <input id="orders-customer-full-name-3"
                      type="text"
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="e.g. Sarah Connor"
                      className="form-input bg-[#121528] text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="orders-customer-email-4" className="block text-body font-semibold mb-1">Customer Email *</label>
                    <input id="orders-customer-email-4"
                      type="email"
                      required
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      placeholder="sarah@example.com"
                      className="form-input bg-[#121528] text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">Line Items</h4>
                  <Button type="button" variant="ghost" size="sm" icon={<Plus size={13} />} onClick={handleAddLineItem}>
                    Add Item
                  </Button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
                      {products.length > 0 && (
                        <select
                          aria-label={`Product for line item ${idx + 1}`}
                          value={item.productId}
                          onChange={e => handleUpdateLineItem(idx, 'productId', e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#15182b] border border-white/10 text-white text-xs"
                        >
                          <option value="">-- Select Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.title} (${p.price})</option>
                          ))}
                        </select>
                      )}
                      <input aria-label="Product Name"
                        type="text"
                        required
                        placeholder="Product Name"
                        value={item.title}
                        onChange={e => handleUpdateLineItem(idx, 'title', e.target.value)}
                        className="form-input bg-[#121528] text-white flex-1 min-w-[120px]"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <input aria-label="Price ($)"
                            type="number"
                            required
                            step="0.01"
                            placeholder="Price ($)"
                            value={item.price}
                            onChange={e => handleUpdateLineItem(idx, 'price', e.target.value)}
                            className="form-input bg-[#121528] text-white"
                          />
                        </div>
                        <div className="w-16">
                          <input aria-label="Qty"
                            type="number"
                            required
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={e => handleUpdateLineItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                            className="form-input bg-[#121528] text-white"
                          />
                        </div>
                        {lineItems.length > 1 && (
                          <button aria-label="Delete"
                            type="button"
                            onClick={() => handleRemoveLineItem(idx)}
                            className="p-2 text-muted hover:text-[#FF5F56] transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">Shipping Address</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="orders-first-name-6" className="block text-secondary mb-1">First Name *</label>
                    <input id="orders-first-name-6"
                      type="text"
                      required
                      value={shipFirstName}
                      onChange={e => setShipFirstName(e.target.value)}
                      className="form-input bg-[#121528] text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="orders-last-name-7" className="block text-secondary mb-1">Last Name</label>
                    <input id="orders-last-name-7"
                      type="text"
                      value={shipLastName}
                      onChange={e => setShipLastName(e.target.value)}
                      className="form-input bg-[#121528] text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-secondary mb-1">Street Address *</label>
                  <input aria-label="123 Main St, Suite 100"
                    type="text"
                    required
                    placeholder="123 Main St, Suite 100"
                    value={shipAddress1}
                    onChange={e => setShipAddress1(e.target.value)}
                    className="form-input bg-[#121528] text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="orders-city-8" className="block text-secondary mb-1">City *</label>
                    <input id="orders-city-8"
                      type="text"
                      required
                      value={shipCity}
                      onChange={e => setShipCity(e.target.value)}
                      className="form-input bg-[#121528] text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="orders-state-prov-9" className="block text-secondary mb-1">State / Prov *</label>
                    <input id="orders-state-prov-9"
                      type="text"
                      required
                      value={shipState}
                      onChange={e => setShipState(e.target.value)}
                      className="form-input bg-[#121528] text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="orders-zip-postal-10" className="block text-secondary mb-1">ZIP / Postal *</label>
                    <input id="orders-zip-postal-10"
                      type="text"
                      required
                      value={shipZip}
                      onChange={e => setShipZip(e.target.value)}
                      className="form-input bg-[#121528] text-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="orders-country-11" className="block text-secondary mb-1">Country *</label>
                  <input id="orders-country-11"
                    type="text"
                    required
                    value={shipCountry}
                    onChange={e => setShipCountry(e.target.value)}
                    className="form-input bg-[#121528] text-white"
                  />
                </div>
              </div>

              {/* Order Totals Summary */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                <div className="flex justify-between text-secondary text-xs">
                  <span>Subtotal ({lineItems.length} item{lineItems.length !== 1 ? 's' : ''})</span>
                  <span className="font-mono">${computedSubtotal.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-white font-bold text-sm border-t border-white/10 pt-2">
                  <span>Order Total</span>
                  <span className="font-mono text-[#27C93F]">${computedTotal.toFixed(2)} USD</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" size="md" fullWidth disabled={isSubmittingOrder}>
                  {isSubmittingOrder ? 'Creating order…' : 'Create Order'}
                </Button>
                <Button type="button" variant="ghost" size="md" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
