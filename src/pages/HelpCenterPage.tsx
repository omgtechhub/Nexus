import { useState } from 'react';
import { 
  HelpCircle, Search, ShoppingBag, CreditCard, Truck, RefreshCw, 
  Shield, Users
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';

export function HelpCenterPage() {
  const [search, setSearch] = useState('');

  const categories = [
    { title: 'Setting Up Your Storefront', icon: <ShoppingBag size={24} />, count: '24 articles' },
    { title: 'Nexus Payments & Payouts', icon: <CreditCard size={24} />, count: '18 articles' },
    { title: 'POS Register Setup & Hardware', icon: <RefreshCw size={24} />, count: '15 articles' },
    { title: 'Shipping, Rates & Labels', icon: <Truck size={24} />, count: '21 articles' },
    { title: 'Managing Staff & Security', icon: <Shield size={24} />, count: '12 articles' },
    { title: 'Customer Orders & Returns', icon: <Users size={24} />, count: '19 articles' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden text-center">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[380px] bg-[#27C93F]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#27C93F]/40 bg-[#27C93F]/10 text-[#27C93F] text-xs font-medium mb-8 backdrop-blur-md">
            <HelpCircle size={16} />
            <span>Nexus Merchant Help Center</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6">
            How can we help your <br />
            <span className="text-gradient">store today?</span>
          </h1>

          <div className="max-w-xl mx-auto relative mb-8">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search help guides (e.g. connecting POS reader, refunding orders)..."
              className="w-full bg-white/5 border border-white/15 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/40 focus:outline-none focus:border-[#27C93F] text-sm"
            />
          </div>
        </div>
      </section>

      {/* Help Categories Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((cat, idx) => (
              <div key={idx} className="glass rounded-2xl p-6 border border-white/10 hover:border-[#27C93F]/40 transition-all flex items-start gap-4 cursor-pointer group">
                <div className="w-12 h-12 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/20 flex items-center justify-center text-[#27C93F] shrink-0">
                  {cat.icon}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white mb-1 group-hover:text-[#27C93F] transition-colors">{cat.title}</h4>
                  <div className="text-xs text-white/40">{cat.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
