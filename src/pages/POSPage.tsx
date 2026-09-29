import { useState } from 'react';
import { 
  CreditCard, Wifi, RefreshCw, CheckCircle2, 
  ArrowRight, Scan, Plus, Minus, Trash2, Printer, Smartphone, Store,
  Users
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export function POSPage() {
  const { navigate } = useApp();
  const [cart, setCart] = useState<CartItem[]>([
    { id: '1', name: 'Artisan Espresso Coffee', price: 4.50, qty: 2 },
    { id: '2', name: 'Vintage Leather Tote', price: 89.00, qty: 1 },
  ]);
  const [paymentMethod, setPaymentMethod] = useState<'nfc' | 'card' | 'qr'>('nfc');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const customerPhone = '(555) 234-5678';
  const [loyaltyPoints, setLoyaltyPoints] = useState(240);

  const availableProducts = [
    { id: '1', name: 'Artisan Espresso Coffee', price: 4.50, category: 'Drinks' },
    { id: '2', name: 'Vintage Leather Tote', price: 89.00, category: 'Apparel' },
    { id: '3', name: 'Raw Denim Jacket', price: 120.00, category: 'Apparel' },
    { id: '4', name: 'Wireless ANC Earbuds', price: 59.00, category: 'Electronics' },
    { id: '5', name: 'Organic Matcha Tea', price: 6.50, category: 'Drinks' },
    { id: '6', name: 'Ceramic Coffee Mug', price: 18.00, category: 'Home' },
  ];

  const addToCart = (product: typeof availableProducts[0]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccess(true);
      setLoyaltyPoints((prev) => prev + Math.floor(total));
    }, 1200);
  };

  const resetRegister = () => {
    setCart([
      { id: '1', name: 'Artisan Espresso Coffee', price: 4.50, qty: 2 },
      { id: '2', name: 'Vintage Leather Tote', price: 89.00, qty: 1 },
    ]);
    setPaymentSuccess(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-20 right-1/3 w-[500px] h-[350px] bg-[#27C93F]/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-80 h-80 bg-[#FFBD2E]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#27C93F]/40 bg-[#27C93F]/10 text-[#27C93F] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <CreditCard size={16} />
            <span>Nexus Omnichannel POS Register</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFBD2E]" />
            <span className="text-white/60">Retail & In-Person Selling</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            In-person retail sales, <br />
            <span className="text-gradient">instantly synced with online.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Turn iPads, Android tablets, smartphones, or dedicated registers into fast checkout terminals. Automatically sync inventory, customer rewards, and sales reporting between physical stores and online e-commerce.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl bg-gradient-to-r from-[#27C93F] via-[#FFBD2E] to-[#FF5F56] text-black font-bold"
              onClick={() => navigate('signup')}
              icon={<ArrowRight size={18} />}
              iconPosition="right"
            >
              Get POS Hardware & App
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl border-white/20 hover:border-white/40"
              onClick={() => {
                document.getElementById('pos-register')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<Scan size={18} />}
            >
              Try Counter Register
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#27C93F]">&lt; 1 sec</div>
              <div className="text-xs text-white/50">Contactless Tap Checkout</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">100%</div>
              <div className="text-xs text-white/50">Offline Order Processing</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FFBD2E]">Real-Time</div>
              <div className="text-xs text-white/50">Store Stock Syncing</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FF5F56]">0%</div>
              <div className="text-xs text-white/50">Inventory Discrepancy</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Retail Checkout Register Simulator */}
      <section id="pos-register" className="py-20 bg-[#0B0D1B]/90 border-t border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Interactive Retail Counter Register
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Add items from the quick-keys catalog, apply customer loyalty rewards, and complete a simulated in-store checkout.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative">
            <div className="bg-[#131629] px-4 py-3 rounded-t-2xl border-b border-white/10 flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                <span className="text-xs text-white/50 ml-2 font-mono">Register #01 — Flagship Store (Downtown)</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#27C93F]">
                <Wifi size={14} />
                <span>POS Online · Unified Sync</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Product Catalog Keys */}
              <div className="lg:col-span-7">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Counter Catalog Quick-Keys</h3>
                  <span className="text-xs text-white/40">Tap product to scan item</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableProducts.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => addToCart(prod)}
                      className="glass rounded-xl p-4 border border-white/10 hover:border-[#27C93F]/50 text-left transition-all hover:scale-[1.02] active:scale-95 group"
                    >
                      <div className="text-[10px] text-white/40 uppercase mb-1">{prod.category}</div>
                      <div className="font-semibold text-white text-sm mb-2 group-hover:text-[#27C93F] transition-colors">
                        {prod.name}
                      </div>
                      <div className="font-bold text-[#FFBD2E] text-sm">${prod.price.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cashier Register Cart */}
              <div className="lg:col-span-5 glass rounded-2xl p-6 border border-white/10 bg-[#090b16] flex flex-col justify-between">
                {paymentSuccess ? (
                  <div className="py-10 text-center flex flex-col items-center justify-center my-auto">
                    <div className="w-16 h-16 rounded-full bg-[#27C93F]/20 border border-[#27C93F]/40 flex items-center justify-center text-[#27C93F] mb-4 animate-bounce">
                      <CheckCircle2 size={36} />
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-2">Payment Approved!</h4>
                    <p className="text-xs text-white/60 mb-4">Thermal receipt printed & SMS receipt sent to {customerPhone}.</p>
                    <div className="font-mono text-xs text-white/50 mb-6 bg-white/5 p-3 rounded-lg border border-white/10 w-full">
                      TxID: NEX-POS-9941 · Total Charged: ${total.toFixed(2)}
                    </div>
                    <Button variant="secondary" size="md" onClick={resetRegister}>
                      Start Next Transaction
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                        <div>
                          <span className="font-bold text-white text-sm">Customer Order ({cart.length} items)</span>
                          <div className="text-[11px] text-[#27C93F] font-mono mt-0.5">
                            Loyalty Member: {customerPhone} ({loyaltyPoints} pts)
                          </div>
                        </div>
                        <button 
                          onClick={() => setCart([])}
                          className="text-xs text-white/40 hover:text-[#FF5F56] transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={12} /> Clear
                        </button>
                      </div>

                      <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1 mb-6">
                        {cart.length === 0 ? (
                          <div className="text-center py-8 text-white/30 text-xs">
                            Register cart empty. Select products from the catalog.
                          </div>
                        ) : (
                          cart.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-xs bg-white/5 p-2.5 rounded-lg border border-white/5">
                              <div>
                                <div className="font-semibold text-white">{item.name}</div>
                                <div className="text-white/40">${item.price.toFixed(2)} each</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQty(item.id, -1)}
                                  className="w-5 h-5 rounded bg-white/10 flex items-center justify-center hover:bg-white/20 text-white"
                                >
                                  <Minus size={10} />
                                </button>
                                <span className="font-bold text-white w-4 text-center">{item.qty}</span>
                                <button
                                  onClick={() => updateQty(item.id, 1)}
                                  className="w-5 h-5 rounded bg-white/10 flex items-center justify-center hover:bg-white/20 text-white"
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="space-y-1 text-xs text-white/60 pt-3 border-t border-white/10 mb-4">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span className="text-white">${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sales Tax (8%)</span>
                          <span className="text-white">${tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-white/10">
                          <span>Total Charge</span>
                          <span className="text-[#27C93F]">${total.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Payment Tender Selector */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <button
                          onClick={() => setPaymentMethod('nfc')}
                          className={`py-2 px-2 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 border transition-all ${
                            paymentMethod === 'nfc'
                              ? 'bg-[#27C93F]/20 text-[#27C93F] border-[#27C93F]/50'
                              : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'
                          }`}
                        >
                          <Wifi size={14} />
                          <span>Tap to Pay</span>
                        </button>
                        <button
                          onClick={() => setPaymentMethod('card')}
                          className={`py-2 px-2 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 border transition-all ${
                            paymentMethod === 'card'
                              ? 'bg-[#27C93F]/20 text-[#27C93F] border-[#27C93F]/50'
                              : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'
                          }`}
                        >
                          <CreditCard size={14} />
                          <span>Chip Reader</span>
                        </button>
                        <button
                          onClick={() => setPaymentMethod('qr')}
                          className={`py-2 px-2 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 border transition-all ${
                            paymentMethod === 'qr'
                              ? 'bg-[#27C93F]/20 text-[#27C93F] border-[#27C93F]/50'
                              : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'
                          }`}
                        >
                          <Scan size={14} />
                          <span>QR Code</span>
                        </button>
                      </div>

                      <Button
                        variant="primary"
                        size="md"
                        className="w-full py-3 text-sm font-bold bg-gradient-to-r from-[#27C93F] to-[#FFBD2E] text-black"
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || isProcessing}
                      >
                        {isProcessing ? 'Processing Payment...' : `Complete Sale ($${total.toFixed(2)})`}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Omnichannel Retail Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
              Everything your physical store needs
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-base">
              Connect your retail counters with your online e-commerce storefront under one unified inventory and reporting engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass rounded-2xl p-8 border border-white/10 hover:border-[#27C93F]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/20 flex items-center justify-center text-[#27C93F] mb-6">
                <RefreshCw size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Unified Inventory Sync</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                When an item sells at your physical store register, your online e-commerce inventory decrements instantly in real time.
              </p>
              <ul className="space-y-2 text-xs text-white/70">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>Sub-second multi-location stock updates</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>Buy Online, Pick Up In-Store (BOPIS)</span>
                </li>
              </ul>
            </div>

            <div className="glass rounded-2xl p-8 border border-white/10 hover:border-[#FFBD2E]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/20 flex items-center justify-center text-[#FFBD2E] mb-6">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Staff & Cash Drawer Shifts</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                Assign PIN codes to cashiers, track staff sales commissions, manage cash drawer balance shifts, and audit register activity.
              </p>
              <ul className="space-y-2 text-xs text-white/70">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>Staff PIN login & permissions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>End-of-day register cash drawer balancing</span>
                </li>
              </ul>
            </div>

            <div className="glass rounded-2xl p-8 border border-white/10 hover:border-[#FF5F56]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/20 flex items-center justify-center text-[#FF5F56] mb-6">
                <Wifi size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Offline Sales Protection</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                Wi-Fi outages won't stop your checkout lines. Process offline card payments securely and sync transaction queues automatically when back online.
              </p>
              <ul className="space-y-2 text-xs text-white/70">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>Encrypted local queue vault</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>Auto-resync when connection resumes</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Hardware Showcase */}
      <section className="py-20 bg-[#0B0D1B]/80 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Hardware Built for High-Volume Retail
            </h2>
            <p className="text-white/60 text-sm sm:text-base">
              Plug and play hardware options built to handle busy retail environments.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="glass rounded-2xl p-6 text-center border border-white/10">
              <div className="w-16 h-16 rounded-2xl bg-white/5 mx-auto mb-4 flex items-center justify-center text-[#27C93F]">
                <Smartphone size={32} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Nexus Mobile Reader</h4>
              <p className="text-xs text-white/60 mb-4">Pocket-sized contactless reader for mobile card payments.</p>
              <div className="text-xl font-bold text-[#FFBD2E]">$49</div>
            </div>

            <div className="glass rounded-2xl p-6 text-center border border-[#27C93F]/40 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#27C93F] text-black text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase">
                Best Seller
              </span>
              <div className="w-16 h-16 rounded-2xl bg-[#27C93F]/10 mx-auto mb-4 flex items-center justify-center text-[#27C93F]">
                <Store size={32} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Nexus Countertop Register</h4>
              <p className="text-xs text-white/60 mb-4">Dual-screen touch register with customer display & barcode scanner.</p>
              <div className="text-xl font-bold text-[#FFBD2E]">$299</div>
            </div>

            <div className="glass rounded-2xl p-6 text-center border border-white/10">
              <div className="w-16 h-16 rounded-2xl bg-white/5 mx-auto mb-4 flex items-center justify-center text-[#FFBD2E]">
                <Printer size={32} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Thermal Printer & Cash Drawer</h4>
              <p className="text-xs text-white/60 mb-4">High-speed receipt printer and heavy-duty steel cash drawer.</p>
              <div className="text-xl font-bold text-[#FFBD2E]">$189</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#27C93F]/15 via-[#FFBD2E]/10 to-[#FF5F56]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Transform your retail counter today
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Order POS hardware or turn existing iPads into checkout registers in under 5 minutes.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#27C93F] via-[#FFBD2E] to-[#FF5F56] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Start In-Person Selling
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
