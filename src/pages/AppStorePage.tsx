import { useState } from 'react';
import { 
  Grid, Search, Star, Download, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Tag
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function AppStorePage() {
  const { navigate } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'marketing' | 'fulfillment' | 'reviews'>('all');

  const apps = [
    { name: 'Klaviyo Email & SMS', desc: 'Automated email flows, abandoned cart recovery & SMS marketing.', category: 'marketing', rating: 4.9, reviews: 1420, installed: true },
    { name: 'Yotpo Reviews & Loyalty', desc: 'Collect photo reviews, customer Q&As, and VIP loyalty rewards.', category: 'reviews', rating: 4.8, reviews: 890, installed: false },
    { name: 'ShipStation Logistics', desc: 'Discounted shipping label printing & multi-carrier tracking.', category: 'fulfillment', rating: 4.9, reviews: 2150, installed: false },
    { name: 'Gorgias Customer Helpdesk', desc: 'Unified customer support desk for email, chat, and social DMs.', category: 'marketing', rating: 4.7, reviews: 640, installed: false },
    { name: 'Printful Print-on-Demand', desc: 'Custom apparel, mugs, and merchandise printed and dropshipped on demand.', category: 'fulfillment', rating: 4.8, reviews: 3100, installed: false },
    { name: 'Rebuy Smart Personalization', desc: 'AI-powered post-purchase upsells and personalized cart recommendations.', category: 'marketing', rating: 4.9, reviews: 520, installed: false },
  ];

  const filtered = apps.filter((a) => {
    const matchCategory = category === 'all' || a.category === category;
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden text-center">
        <div className="absolute top-20 left-1/3 w-[550px] h-[380px] bg-[#27C93F]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#27C93F]/40 bg-[#27C93F]/10 text-[#27C93F] text-xs font-medium mb-8 backdrop-blur-md">
            <Grid size={16} />
            <span>Nexus E-Commerce App Ecosystem</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Extend your storefront with <br />
            <span className="text-gradient">1,000+ e-commerce apps.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Connect your store to email marketing, review widgets, print-on-demand suppliers, and AI personalization apps in 1 click.
          </p>

          <div className="max-w-xl mx-auto relative mb-10">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search apps (e.g. Klaviyo, Yotpo, ShipStation)..."
              className="w-full bg-white/5 border border-white/15 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/40 focus:outline-none focus:border-[#27C93F] text-sm"
            />
          </div>
        </div>
      </section>

      {/* Apps Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered.map((app, idx) => (
              <div key={idx} className="glass rounded-2xl p-6 border border-white/10 hover:border-[#27C93F]/40 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-lg font-bold text-white group-hover:text-[#27C93F] transition-colors">{app.name}</h4>
                    <div className="flex items-center gap-1 text-xs text-[#FFBD2E]">
                      <Star size={14} fill="currentColor" />
                      <span>{app.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed mb-6">{app.desc}</p>
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs font-semibold">
                  <span className="text-white/40">1-Click Install</span>
                  <button className="px-3 py-1.5 rounded-lg bg-[#27C93F] text-black font-bold hover:opacity-90">
                    Add App
                  </button>
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
