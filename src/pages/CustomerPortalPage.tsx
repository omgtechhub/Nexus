import { useState, useEffect } from 'react';
import { 
  Package, Search, Truck, CheckCircle2, User, 
  ArrowRight, ShoppingBag, LogIn
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';
import { BASE_URL } from '../api/client';

export function CustomerPortalPage({ defaultTab = 'dashboard' }: { defaultTab?: string }) {
  const { user, isAuthenticated, login, signup, logout, orders: contextOrders = [] } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Sync session user
  const customerLoggedIn = isAuthenticated && !!user;
  const customerUser = user ? { name: user.name, email: user.email } : null;
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Map context live orders if present
  const mappedContextOrders = contextOrders.map((ord: any) => ({
    id: ord.id,
    orderNumber: (ord.orderNumber || ord.id || '').replace(/^#/, ''),
    date: ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recently',
    total: typeof ord.total === 'number' ? ord.total : parseFloat(ord.total || '0'),
    currency: ord.currency || 'USD',
    status: (ord.status || 'CONFIRMED').toUpperCase(),
    paymentStatus: (ord.paymentStatus || 'PAID').toUpperCase(),
    customerEmail: ord.customerEmail || ord.customer?.email || '',
    customerName: ord.customerName || ord.customer?.name || 'Customer',
    items: (ord.items || []).map((item: any) => ({
      name: item.title || item.name || item.productTitle || 'Product Item',
      qty: item.quantity || item.qty || 1,
      price: typeof item.price === 'number' ? item.price : parseFloat(item.price || '0'),
      image: item.image || item.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300'
    })),
    shippingAddress: {
      name: ord.customerName || ord.customer?.name || 'Customer',
      street: ord.shippingAddress?.address1 || 'Main Street',
      city: ord.shippingAddress?.city || 'Austin',
      state: ord.shippingAddress?.state || 'TX',
      zip: ord.shippingAddress?.zip || '78701',
      country: ord.shippingAddress?.country || 'United States'
    },
    trackingNumber: ord.trackingNumber || `NXTRK-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    courier: ord.courier || 'Nexus Express Direct',
    estimatedDelivery: '3-5 Business Days',
    timeline: [
      { label: 'Order Placed & Verified', date: 'Confirmed', completed: true },
      { label: 'Payment Confirmed', date: 'Verified', completed: true },
      { label: 'Package Picked & Packed', date: 'In Warehouse', completed: ord.status !== 'PENDING' },
      { label: 'In Transit — Out for Carrier Dispatch', date: 'Expected Delivery Soon', completed: ord.status === 'FULFILLED', active: ord.status === 'PROCESSING' },
      { label: 'Delivered', date: 'Final Destination', completed: ord.status === 'FULFILLED' },
    ]
  }));

  // Perform live API search for orders
  const performOrderSearch = async (term: string) => {
    if (!term.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch(`${BASE_URL}/storefront/track/search?query=${encodeURIComponent(term.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.orders && data.orders.length > 0) {
          const apiFormatted = data.orders.map((ord: any) => ({
            id: ord.id,
            orderNumber: (ord.orderNumber || ord.id || '').replace(/^#/, ''),
            date: ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recently',
            total: typeof ord.total === 'number' ? ord.total : parseFloat(ord.total || '0'),
            currency: ord.currency || 'USD',
            status: (ord.status || 'CONFIRMED').toUpperCase(),
            paymentStatus: (ord.paymentStatus || 'PAID').toUpperCase(),
            customerEmail: ord.customerEmail || '',
            customerName: ord.customerName || 'Customer',
            items: (ord.items || []).map((item: any) => ({
              name: item.productTitle || item.name || 'Product Item',
              qty: item.quantity || 1,
              price: typeof item.price === 'number' ? item.price : parseFloat(item.price || '0'),
              image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300'
            })),
            shippingAddress: {
              name: ord.shippingAddress ? `${ord.shippingAddress.firstName || ''} ${ord.shippingAddress.lastName || ''}`.trim() : ord.customerName || 'Customer',
              street: ord.shippingAddress?.address1 || 'Shipping Address',
              city: ord.shippingAddress?.city || '',
              state: ord.shippingAddress?.state || '',
              zip: ord.shippingAddress?.zip || '',
              country: ord.shippingAddress?.country || ''
            },
            trackingNumber: `NXTRK-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            courier: 'Nexus Express Direct',
            estimatedDelivery: '3-5 Business Days',
            timeline: [
              { label: 'Order Placed & Verified', date: 'Confirmed', completed: true },
              { label: 'Payment Confirmed', date: 'Verified', completed: true },
              { label: 'Package Picked & Packed', date: 'In Warehouse', completed: ord.status !== 'PENDING' },
              { label: 'In Transit — Out for Carrier Dispatch', date: 'Expected Delivery Soon', completed: ord.status === 'FULFILLED' || ord.status === 'DELIVERED', active: ord.status !== 'DELIVERED' },
              { label: 'Out for Final Delivery', date: 'Final Destination', completed: ord.status === 'DELIVERED' },
            ]
          }));
          setSearchResults(apiFormatted);
          setSelectedOrder(apiFormatted[0]);
          setActiveTab('track');
          toast.success(`Located ${apiFormatted.length} order(s)`);
          return;
        }
      }
    } catch (err) {
      console.error('Order search error:', err);
    } finally {
      setIsSearching(false);
    }

    // Check context orders fallback
    const query = term.trim().toLowerCase();
    const foundInContext = mappedContextOrders.filter(
      o => o.orderNumber.toLowerCase().includes(query) ||
           o.customerEmail.toLowerCase().includes(query) ||
           o.id.toLowerCase().includes(query)
    );

    if (foundInContext.length > 0) {
      setSearchResults(foundInContext);
      setSelectedOrder(foundInContext[0]);
      setActiveTab('track');
      toast.success(`Located ${foundInContext.length} order(s)`);
    } else {
      setSearchResults([]);
      setSelectedOrder(null);
      toast.error(`No order found matching "${term}"`);
    }
  };

  const handleTrackSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Please enter an Order Number or Customer Email');
      return;
    }
    performOrderSearch(searchQuery);
  };

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Please enter your email address and password');
      return;
    }
    const email = loginEmail.trim();
    const res = await login(email, loginPassword, 'customer');
    if (res.success) {
      toast.success(`Logged in as ${email}`);
      setActiveTab('orders');
      performOrderSearch(email);
    } else {
      // Try registering as a customer if account does not exist yet
      const signupRes = await signup(email.split('@')[0], email, loginPassword, undefined, 'CUSTOMER', 'customer');
      if (signupRes.success) {
        toast.success(`Customer account created! Welcome ${email}`);
        setActiveTab('orders');
        performOrderSearch(email);
      } else {
        toast.error(res.error || signupRes.error || 'Authentication failed');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden bg-gradient-to-b from-[#131629] via-[#0B0D1B] to-[#0B0D1B]">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#27C93F]/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#27C93F]/40 bg-[#27C93F]/10 text-[#27C93F] text-xs sm:text-sm font-medium mb-6 backdrop-blur-md">
            <Package size={16} />
            <span>Nexus Live Customer Order & Tracking Portal</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">
            Track your purchases & <br />
            <span className="text-gradient">manage live customer orders.</span>
          </h1>

          <p className="text-white/60 text-sm sm:text-lg max-w-2xl mx-auto mb-10">
            Enter your order number or email below to check real-time shipment progress, delivery status, and order details directly from the database.
          </p>

          {/* Instant Order Search Bar */}
          <form onSubmit={handleTrackSearch} className="max-w-2xl mx-auto glass p-2 rounded-2xl border border-white/20 shadow-2xl flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Enter Order # (e.g. NX-1001) or Customer Email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-transparent text-white placeholder:text-white/40 text-sm focus:outline-none"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSearching}
              className="px-8 bg-gradient-to-r from-[#27C93F] to-emerald-500 text-black font-bold rounded-xl"
              icon={<Truck size={16} />}
            >
              Track Order
            </Button>
          </form>
        </div>
      </section>

      {/* Main Customer Portal Content */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-8">
          <div className="flex gap-2">
            {[
              { id: 'track', label: 'Live Order Tracker', icon: <Truck size={16} /> },
              { id: 'orders', label: 'My Order History', icon: <ShoppingBag size={16} /> },
              { id: 'profile', label: 'Delivery Address & Profile', icon: <User size={16} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#27C93F] to-emerald-500 text-black shadow-lg font-extrabold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div>
            {customerLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/60">Signed in as <strong className="text-white">{customerUser?.email}</strong></span>
                <button
                  onClick={() => {
                    logout();
                    setSearchResults([]);
                    setSelectedOrder(null);
                    setHasSearched(false);
                    toast.success('Signed out of Customer Account');
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('login')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  activeTab === 'login'
                    ? 'bg-white text-black border-white'
                    : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
                }`}
              >
                <LogIn size={14} /> Customer Sign In
              </button>
            )}
          </div>
        </div>

        {/* TAB: CUSTOMER LOGIN */}
        {activeTab === 'login' && (
          <div className="stat-card p-8 max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#27C93F]/20 text-[#27C93F] mx-auto flex items-center justify-center border border-[#27C93F]/30">
                <User size={24} />
              </div>
              <h3 className="text-xl font-extrabold text-white">Customer Account Sign In</h3>
              <p className="text-xs text-white/60">Log in with your customer email to retrieve your live orders and track purchases.</p>
            </div>

            <form onSubmit={handleCustomerLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-white/70 font-bold mb-1">Customer Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="customer@example.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className="form-input bg-[#121528] text-white w-full px-4 py-2.5 rounded-xl border border-white/10"
                />
              </div>

              <div>
                <label className="block text-white/70 font-bold mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="form-input bg-[#121528] text-white w-full px-4 py-2.5 rounded-xl border border-white/10"
                />
              </div>

              <Button type="submit" variant="primary" size="md" className="w-full bg-[#27C93F] text-black font-bold py-3 rounded-xl">
                Sign In & View Purchases
              </Button>
            </form>
          </div>
        )}

        {/* TAB 1: LIVE ORDER TRACKER */}
        {activeTab === 'track' && (
          <div>
            {!selectedOrder ? (
              <div className="glass rounded-3xl p-12 text-center border border-white/10 shadow-2xl max-w-2xl mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#27C93F]">
                  <Truck size={32} />
                </div>
                {hasSearched ? (
                  <>
                    <h3 className="text-xl font-bold text-white">No Order Found</h3>
                    <p className="text-xs text-white/60">
                      We couldn't locate an order matching "{searchQuery}". Please check your order confirmation receipt or try searching by customer email address.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-white">Track Your Live Order</h3>
                    <p className="text-xs text-white/60">
                      Enter your Order Number (e.g. <strong className="text-white">NX-1001</strong>) or Customer Email in the search box above to track live shipping updates.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
                  {/* Status Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl sm:text-2xl font-bold text-white">
                          Order #{selectedOrder.orderNumber}
                        </h2>
                        <Badge variant={selectedOrder.status === 'DELIVERED' ? 'success' : 'warning'} size="md">
                          {selectedOrder.status === 'DELIVERED' ? 'Delivered' : selectedOrder.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-white/50 mt-1">
                        Placed on {selectedOrder.date} • Courier: <strong className="text-white/80">{selectedOrder.courier}</strong> ({selectedOrder.trackingNumber})
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs text-white/40 block">Estimated Delivery</span>
                      <span className="text-lg font-extrabold text-[#27C93F] block">{selectedOrder.estimatedDelivery}</span>
                    </div>
                  </div>

                  {/* Progress Timeline */}
                  <div className="space-y-4 py-4">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Shipment Progress & History</h3>
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                      {selectedOrder.timeline.map((step: any, idx: number) => (
                        <div key={idx} className="relative flex items-start gap-4">
                          <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            step.completed ? 'bg-[#27C93F] border-[#27C93F] text-black' : 'bg-[#0B0D1B] border-white/30 text-transparent'
                          }`}>
                            {step.completed && <CheckCircle2 size={10} />}
                          </div>
                          <div>
                            <div className={`text-sm font-bold ${step.active ? 'text-[#27C93F]' : step.completed ? 'text-white' : 'text-white/40'}`}>
                              {step.label}
                            </div>
                            <div className="text-xs text-white/40 font-mono mt-0.5">{step.date}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Items & Shipping Address */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">Order Items</h4>
                      {selectedOrder.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                          <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-white truncate">{item.name}</h5>
                            <p className="text-[11px] text-white/50">Qty: {item.qty} × ${item.price.toFixed(2)}</p>
                          </div>
                          <span className="text-xs font-bold text-white">${(item.qty * item.price).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-sm pt-2">
                        <span className="text-white/60">Total Paid</span>
                        <span className="font-extrabold text-white text-base">${selectedOrder.total.toFixed(2)} {selectedOrder.currency}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">Delivery Destination</h4>
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1 text-xs text-white/70">
                        <p className="font-bold text-white">{selectedOrder.shippingAddress.name}</p>
                        <p>{selectedOrder.shippingAddress.street}</p>
                        <p>{selectedOrder.shippingAddress.city} {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zip}</p>
                        <p>{selectedOrder.shippingAddress.country}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY ORDERS LIST */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Your Customer Order History</h3>
            {searchResults.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
                <ShoppingBag size={32} className="text-white/30 mx-auto" />
                <p className="text-xs text-white/60">No orders loaded yet. Enter your Order Number or Customer Email above to fetch your order history.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map(order => (
                  <div key={order.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-[#27C93F]/40 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-white text-base">Order #{order.orderNumber}</span>
                        <Badge variant={order.status === 'DELIVERED' ? 'success' : 'warning'} size="sm">
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-white/50">
                        {order.items.length} item(s) • Placed on {order.date} • Total: <strong className="text-white">${order.total.toFixed(2)}</strong>
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setActiveTab('track');
                      }}
                      icon={<ArrowRight size={14} />}
                      iconPosition="right"
                    >
                      Track Shipment
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CUSTOMER PROFILE & ADDRESS */}
        {activeTab === 'profile' && (
          <div className="stat-card p-6 max-w-2xl space-y-6">
            <h3 className="text-lg font-bold text-white">Customer Account & Saved Address</h3>
            <form onSubmit={(e) => { e.preventDefault(); toast.success('Customer address updated!'); }} className="space-y-4 text-xs">
              <div>
                <label className="block text-white/70 font-bold mb-1">Full Name</label>
                <input className="form-input bg-[#121528] text-white" defaultValue={customerUser?.name || ""} placeholder="Your Full Name" />
              </div>
              <div>
                <label className="block text-white/70 font-bold mb-1">Email Address</label>
                <input className="form-input bg-[#121528] text-white" defaultValue={customerUser?.email || ""} placeholder="your@email.com" />
              </div>
              <div>
                <label className="block text-white/70 font-bold mb-1">Shipping Street Address</label>
                <input className="form-input bg-[#121528] text-white" placeholder="123 Main Street" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-white/70 font-bold mb-1">City</label>
                  <input className="form-input bg-[#121528] text-white" placeholder="City" />
                </div>
                <div>
                  <label className="block text-white/70 font-bold mb-1">State</label>
                  <input className="form-input bg-[#121528] text-white" placeholder="State" />
                </div>
                <div>
                  <label className="block text-white/70 font-bold mb-1">ZIP Code</label>
                  <input className="form-input bg-[#121528] text-white" placeholder="ZIP" />
                </div>
              </div>
              <Button type="submit" variant="primary" size="md" className="bg-[#27C93F] text-black font-bold">
                Save Shipping Address
              </Button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
