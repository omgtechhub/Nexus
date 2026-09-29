import { useState } from 'react';
import { 
  Store, Smartphone, Monitor, Globe, ArrowRight, CheckCircle2, ShoppingBag, Eye, Layout, Truck, BarChart3, Package, ArrowUpRight, X, Plus, Minus, Trash2
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';

export function OnlineStorePage() {
  const { navigate, products: uploadedProducts = [] } = useApp();
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTheme, setActiveTheme] = useState<'boutique' | 'tech' | 'lifestyle'>('boutique');
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'JPY'>('USD');
  const [activeTab, setActiveTab] = useState<'builder' | 'inventory' | 'checkout' | 'social'>('builder');

  // Live Cart State
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const currencySymbols = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
  const currencyRates = { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 155 };

  const formatPrice = (usdAmount: number) => {
    const rate = currencyRates[selectedCurrency];
    const symbol = currencySymbols[selectedCurrency];
    const val = (usdAmount * rate).toFixed(selectedCurrency === 'JPY' ? 0 : 2);
    return `${symbol}${val}`;
  };

  const handleAddToCart = (product: any) => {
    setCartItems(prev => {
      const idx = prev.findIndex(i => i.id === product.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setCartOpen(true);
    toast.success(`Added "${product.title}" to your shopping bag!`, { icon: '🛍️' });
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      setCartItems(prev => prev.filter(i => i.id !== id));
      return;
    }
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const activeProducts = uploadedProducts.length > 0
    ? uploadedProducts.map(p => ({
        id: p.id,
        title: p.title,
        price: p.price,
        category: p.category || 'Uploaded Item',
        tag: 'Uploaded Product',
        stock: p.inventory,
        image: p.images && p.images.length > 0 ? p.images[0] : null,
      }))
    : [
        { id: 'p1', title: 'Artisan Ceramic Vase', price: 85, category: 'Home Decor', tag: 'Best Seller', stock: 42, image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400' },
        { id: 'p2', title: 'Organic Cotton Hoodie', price: 110, category: 'Apparel', tag: 'New Season', stock: 18, image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400' },
        { id: 'p3', title: 'Wireless Desk Lamp', price: 65, category: 'Lighting', tag: 'Trending', stock: 85, image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400' },
      ];

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);


  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#FF5F56]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-[#FFBD2E]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-60 left-1/4 w-80 h-80 bg-[#27C93F]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FF5F56]/40 bg-[#FF5F56]/10 text-[#FF5F56] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <Store size={16} />
            <span>Storefront E-Commerce Engine</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-white/60">Turn visitors into loyal buyers</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Build your online store, <br />
            <span className="text-gradient">sell to the world.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Create a high-converting, mobile-first e-commerce store with customizable themes, drag-and-drop merchandising, integrated inventory management, and multi-currency checkout.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button 
              variant="primary" 
              size="lg" 
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl"
              onClick={() => navigate('signup')}
              icon={<ArrowRight size={18} />}
              iconPosition="right"
            >
              Start Free Store Trial
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl border-white/20 hover:border-white/40"
              onClick={() => {
                document.getElementById('storefront-studio')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<Eye size={18} />}
            >
              Live Store Simulator
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">100+</div>
              <div className="text-xs text-white/50">E-Commerce Themes</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FFBD2E]">135+</div>
              <div className="text-xs text-white/50">Currencies Supported</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#27C93F]">+38%</div>
              <div className="text-xs text-white/50">Higher Mobile Conversion</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FF5F56]">0.8s</div>
              <div className="text-xs text-white/50">Avg Page Load Speed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Storefront Merchandising Studio */}
      <section id="storefront-studio" className="py-20 bg-[#0B0D1B]/80 relative border-t border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Interactive Storefront Merchandising Studio
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Test live theme layouts, switch international currencies, and preview how customers experience your store on desktop and mobile.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10">
              {/* Theme Presets */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider mr-2">Theme:</span>
                {[
                  { id: 'boutique', label: 'Boutique Elegance' },
                  { id: 'tech', label: 'Modern Tech' },
                  { id: 'lifestyle', label: 'Urban Lifestyle' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTheme(t.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTheme === t.id
                        ? 'bg-gradient-to-r from-[#FF5F56] to-[#FFBD2E] text-black font-bold shadow-md'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Currency Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider mr-1">Currency:</span>
                {(['USD', 'EUR', 'GBP', 'JPY'] as const).map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setSelectedCurrency(curr)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                      selectedCurrency === curr
                        ? 'bg-[#27C93F] text-black'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>

              {/* Viewport Selector */}
              <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setDeviceView('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    deviceView === 'desktop' ? 'bg-[#FF5F56]/20 text-[#FF5F56] border border-[#FF5F56]/40' : 'text-white/50 hover:text-white'
                  }`}
                >
                  <Monitor size={14} /> Desktop
                </button>
                <button
                  onClick={() => setDeviceView('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    deviceView === 'mobile' ? 'bg-[#FF5F56]/20 text-[#FF5F56] border border-[#FF5F56]/40' : 'text-white/50 hover:text-white'
                  }`}
                >
                  <Smartphone size={14} /> Mobile
                </button>
              </div>
            </div>

            {/* Live Storefront Render */}
            <div className="relative mx-auto transition-all duration-300 overflow-hidden rounded-2xl border border-white/15 bg-[#090b16] shadow-2xl">
              <div className="bg-[#131629] px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-black/40 text-xs text-white/50 border border-white/5 max-w-xs w-full justify-center">
                  <Globe size={12} className="text-[#27C93F]" />
                  <span className="truncate">https://www.yourstore.com</span>
                </div>
                <button 
                  onClick={() => setCartOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 text-[#FFBD2E] text-xs font-bold hover:bg-[#FFBD2E]/20 transition-all cursor-pointer"
                >
                  <ShoppingBag size={14} />
                  <span>Cart ({totalCartCount})</span>
                </button>
              </div>

              <div className={`transition-all duration-300 mx-auto ${
                deviceView === 'mobile' ? 'max-w-md my-4 border border-white/10 rounded-2xl shadow-xl overflow-hidden' : 'w-full'
              }`}>
                {/* Store Header */}
                <div className="p-6 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center font-extrabold text-black text-lg shadow-lg">
                      N
                    </div>
                    <div>
                      <div className="font-bold text-white text-base tracking-tight">NEXUS ATELIER</div>
                      <div className="text-[10px] text-white/40 uppercase">Uploaded Products Catalog</div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs font-medium text-white/70">
                    <span className="hover:text-white cursor-pointer">New Arrivals</span>
                    <button onClick={() => navigate('storefront')} className="text-[#FFBD2E] font-bold hover:underline flex items-center gap-1">
                      Full Storefront <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Hero Promotion Banner */}
                <div className="p-8 sm:p-12 text-center relative overflow-hidden bg-gradient-to-b from-white/[0.04] to-transparent">
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 bg-[#FFBD2E]/20 text-[#FFBD2E] border border-[#FFBD2E]/40">
                    Merchant Uploaded Inventory
                  </span>
                  <h3 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">
                    {activeTheme === 'boutique' && 'Timeless Craftsmanship'}
                    {activeTheme === 'tech' && 'Next-Gen Gear & Gadgets'}
                    {activeTheme === 'lifestyle' && 'Designed for Modern Living'}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/60 max-w-lg mx-auto mb-6">
                    Free express shipping on all orders over {formatPrice(100)}. 30-day effortless returns.
                  </p>
                  <button 
                    onClick={() => navigate('storefront')}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-black font-bold text-sm shadow-lg hover:opacity-90 transition-opacity"
                  >
                    Open Full Storefront
                  </button>
                </div>

                {/* Live Products Catalog */}
                <div className="p-6 sm:p-8 bg-black/20 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {activeProducts.map((prod) => (
                    <div key={prod.id} className="glass rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all group flex flex-col justify-between">
                      <div>
                        <div className="aspect-square rounded-lg bg-white/5 mb-3 flex items-center justify-center relative overflow-hidden">
                          {prod.image ? (
                            <img src={prod.image} alt={prod.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <ShoppingBag size={32} className="text-white/20 group-hover:scale-110 transition-transform" />
                          )}
                          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#27C93F] text-black">
                            {prod.tag}
                          </span>
                        </div>
                        <div className="text-[10px] text-white/40 uppercase mb-1">{prod.category}</div>
                        <div className="font-semibold text-white text-sm mb-1">{prod.title}</div>
                        <div className="text-[11px] text-[#27C93F] mb-3">In Stock ({prod.stock} left)</div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <span className="font-bold text-white text-base">{formatPrice(prod.price)}</span>
                        <button
                          onClick={() => handleAddToCart(prod)}
                          className="text-xs px-3.5 py-1.5 rounded-lg bg-[#27C93F] text-slate-950 font-bold hover:brightness-110 transition-all cursor-pointer"
                        >
                          Add to Bag
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Shopping Cart Drawer Modal */}
        {cartOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-md bg-[#0B0D1B] border-l border-white/10 h-full p-6 flex flex-col justify-between shadow-2xl">
              <div className="space-y-6 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                    <ShoppingBag size={20} className="text-[#FFBD2E]" /> Shopping Bag ({totalCartCount})
                  </h3>
                  <button onClick={() => setCartOpen(false)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white">
                    <X size={18} />
                  </button>
                </div>

                {cartItems.length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <ShoppingBag size={48} className="text-white/20 mx-auto" />
                    <p className="text-xs text-white/50">Your bag is currently empty. Add products from the catalog above!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag size={20} className="text-white/30" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-xs text-white truncate">{item.title}</h5>
                          <p className="text-xs font-bold text-[#27C93F] mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-white/10 rounded-lg bg-black/40">
                            <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} className="p-1 text-white/60 hover:text-white">
                              <Minus size={12} />
                            </button>
                            <span className="px-2 text-xs font-bold text-white">{item.quantity}</span>
                            <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} className="p-1 text-white/60 hover:text-white">
                              <Plus size={12} />
                            </button>
                          </div>
                          <button onClick={() => handleUpdateQuantity(item.id, 0)} className="p-1.5 text-white/40 hover:text-[#FF5F56]">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="border-t border-white/10 pt-4 space-y-4">
                  <div className="flex justify-between text-sm font-extrabold text-white">
                    <span>Subtotal</span>
                    <span className="font-mono text-[#27C93F]">${totalCartSubtotal.toFixed(2)} USD</span>
                  </div>
                  <button
                    onClick={() => {
                      setCartOpen(false);
                      navigate('storefront');
                    }}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-slate-950 font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 hover:opacity-95 transition-all cursor-pointer"
                  >
                    <span>Proceed to Express Checkout</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Core Merchant Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
              Everything required to run a high-volume store
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-base">
              Built on high-performance cloud infrastructure designed for maximum conversion and smooth buyer checkouts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass rounded-2xl p-8 border border-white/10 hover:border-[#FF5F56]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/20 flex items-center justify-center text-[#FF5F56] mb-6">
                <Layout size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Visual Theme Customizer</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                Drag and drop banners, product grids, testimonials, and promotional popups. Customize fonts, colors, and layouts without touching code.
              </p>
              <ul className="space-y-2 text-xs text-white/70">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>100+ responsive store sections</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>Mobile-first auto-layout optimization</span>
                </li>
              </ul>
            </div>

            <div className="glass rounded-2xl p-8 border border-white/10 hover:border-[#FFBD2E]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/20 flex items-center justify-center text-[#FFBD2E] mb-6">
                <Package size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Product Catalog & Inventory</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                Manage variants (sizes, colors, materials), track stock levels across multiple warehouses, and automate low-stock alerts.
              </p>
              <ul className="space-y-2 text-xs text-white/70">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>Bulk CSV import & export</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>Automated stock adjustment triggers</span>
                </li>
              </ul>
            </div>

            <div className="glass rounded-2xl p-8 border border-white/10 hover:border-[#27C93F]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/20 flex items-center justify-center text-[#27C93F] mb-6">
                <Globe size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Social & Marketplace Sales</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                Sync your product catalog directly to Instagram Shop, TikTok Shop, Google Shopping, and Meta Ads in one click.
              </p>
              <ul className="space-y-2 text-xs text-white/70">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>Automated multi-channel stock sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>Unified order processing dashboard</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Merchant Walkthrough Tabs */}
      <section className="py-20 bg-[#0B0D1B]/90 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              4 Steps to E-Commerce Success
            </h2>
            <p className="text-white/60 text-sm sm:text-base">
              From initial product upload to shipping your first 1,000 orders globally.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { id: 'builder', label: '1. Storefront Design', icon: <Layout size={16} /> },
              { id: 'inventory', label: '2. Product & Inventory', icon: <Package size={16} /> },
              { id: 'checkout', label: '3. Payments & Shipping', icon: <Truck size={16} /> },
              { id: 'social', label: '4. Growth & Social Selling', icon: <BarChart3 size={16} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-black shadow-lg font-bold'
                    : 'glass text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="glass rounded-3xl p-8 border border-white/10 max-w-4xl mx-auto text-center sm:text-left flex flex-col sm:flex-row items-center gap-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF5F56]/20 via-[#FFBD2E]/20 to-[#27C93F]/20 flex items-center justify-center text-white shrink-0 border border-white/10">
              <ShoppingBag size={36} className="text-[#FFBD2E]" />
            </div>
            <div>
              <h4 className="text-2xl font-bold text-white mb-2">
                {activeTab === 'builder' && 'Craft your brand identity with high-converting themes'}
                {activeTab === 'inventory' && 'Manage variants, SKUs, and multi-warehouse stock'}
                {activeTab === 'checkout' && 'Accept cards, Apple Pay, and offer automated shipping rates'}
                {activeTab === 'social' && 'Sync product feeds directly to TikTok Shop & Instagram'}
              </h4>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                {activeTab === 'builder' && 'Pick from over 100 merchant-tested themes designed for high conversion. Adjust typography, hero banners, and promotional countdown timers easily.'}
                {activeTab === 'inventory' && 'Upload CSV files, organize product collections, and set automated reorder thresholds so you never run out of inventory during peak sales.'}
                {activeTab === 'checkout' && 'Offer 1-click checkout with Apple Pay, Google Pay, and major credit cards while calculating real-time carrier shipping rates at checkout.'}
                {activeTab === 'social' && 'Expand your customer reach by listing products automatically across Instagram, TikTok, Google Shopping, and Meta Ads from one central inventory.'}
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-4 text-xs font-semibold text-[#27C93F]">
                <span className="flex items-center gap-1"><CheckCircle2 size={14} /> Zero Coding Required</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={14} /> Instant Global CDN</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#FF5F56]/15 via-[#FFBD2E]/10 to-[#27C93F]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Ready to build your online store?
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Join over 2.1 million merchants using Nexus to sell, manage inventory, and grow their brand globally.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Start Your 14-Day Free Trial
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
