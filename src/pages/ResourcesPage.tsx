import { useState } from 'react';
import { 
  BookOpen, Search, Sparkles, 
  ArrowRight, ExternalLink, Calculator, Clock
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function ResourcesPage() {
  const { navigate } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'guides' | 'playbooks' | 'case-studies' | 'calculators'>('all');
  
  // Interactive E-Commerce Business Profit Calculator State
  const [sellingPrice, setSellingPrice] = useState<number>(85);
  const [cogs, setCogs] = useState<number>(25);
  const [adSpendPerSale, setAdSpendPerSale] = useState<number>(18);
  const [shippingCost, setShippingCost] = useState<number>(7);
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  // Business Calculator Calculations
  const grossProfit = sellingPrice - cogs - adSpendPerSale - shippingCost;
  const grossMargin = sellingPrice > 0 ? ((grossProfit / sellingPrice) * 100).toFixed(1) : '0';
  const roasRequired = cogs > 0 ? (sellingPrice / adSpendPerSale).toFixed(2) : '0';

  const resourcesList = [
    {
      id: 1,
      title: 'The 2026 E-Commerce Conversion Rate Optimization (CRO) Playbook',
      desc: 'Discover 25 battle-tested checkout design changes, trust badge placements, and cart abandonment triggers that boost store conversion rate.',
      category: 'guides',
      type: 'Guide',
      readTime: '12 min read',
      badge: 'Popular Guide',
    },
    {
      id: 2,
      title: 'Mastering Product Photography & Video Merchandising',
      desc: 'How to shoot studio-quality product photos on a smartphone, optimize WebP image compression, and build 360-degree interactive product viewers.',
      category: 'playbooks',
      type: 'Playbook',
      readTime: '10 min read',
      badge: 'Visual Merchandising',
    },
    {
      id: 3,
      title: 'Case Study: How Aura Apparel Scaled to $12M ARR with Nexus POS & Store',
      desc: 'Discover how Aura synced 4 physical boutique stores with online inventory to eliminate stockouts and boost repeat customer purchases.',
      category: 'case-studies',
      type: 'Case Study',
      readTime: '8 min read',
      badge: 'Merchant Growth',
    },
    {
      id: 4,
      title: 'Global Shipping & Landed Cost Duties Checklist for E-Commerce',
      desc: 'A complete guide to cross-border shipping rates, automated customs duty collection (DDP vs DDU), and 3PL fulfillment warehouse selection.',
      category: 'guides',
      type: 'Checklist',
      readTime: '15 min read',
      badge: 'Fulfillment & Logistics',
    },
    {
      id: 5,
      title: 'How to Build a Recurring D2C Subscription & Auto-Refill Model',
      desc: 'Step-by-step merchant workflow to turn one-time buyers into loyal monthly subscribers using custom discounts and flexible delivery frequencies.',
      category: 'playbooks',
      type: 'Playbook',
      readTime: '11 min read',
      badge: 'Subscription Strategy',
    },
    {
      id: 6,
      title: 'Case Study: Lumina Lighting Boosted Mobile Checkout Sales by +42%',
      desc: 'How Lumina migrated from legacy slow infrastructure to Nexus 1-click Apple Pay checkout, reducing cart drop-off by over 40%.',
      category: 'case-studies',
      type: 'Case Study',
      readTime: '7 min read',
      badge: 'Conversion Lift',
    },
    {
      id: 7,
      title: 'Black Friday & Cyber Monday High-Volume Merchant Preparation Blueprint',
      desc: 'Technical and operational store preparation steps to handle 100k+ concurrent buyer checkout requests without server lag or stock glitches.',
      category: 'playbooks',
      type: 'Playbook',
      readTime: '14 min read',
      badge: 'Peak Sales Season',
    },
    {
      id: 8,
      title: 'NexusIQ AI Prompt Library for E-Commerce Store Owners',
      desc: 'Copy-and-paste merchant AI prompts to write high-ranking SEO product descriptions, Meta titles, email marketing flows, and social ad copy.',
      category: 'guides',
      type: 'AI Templates',
      readTime: '9 min read',
      badge: 'Merchant AI',
    },
  ];

  const filteredResources = resourcesList.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[650px] h-[400px] bg-gradient-to-r from-[#FF5F56]/15 via-[#FFBD2E]/15 to-[#27C93F]/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FFBD2E]/40 bg-[#FFBD2E]/10 text-[#FFBD2E] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <BookOpen size={16} />
            <span>Nexus E-Commerce Merchant Academy</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-white/60">Guides, Tools & Growth Playbooks</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            E-Commerce guides, playbooks, <br />
            <span className="text-gradient">case studies & calculators.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Everything store owners and brand managers need to optimize product conversion rates, master fulfillment logistics, and scale store revenue globally.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative mb-12">
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search e-commerce playbooks, CRO guides, or case studies..."
                className="w-full bg-white/5 border border-white/15 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/40 focus:outline-none focus:border-[#FFBD2E] text-base backdrop-blur-md shadow-xl"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { id: 'all', label: 'All Resources' },
              { id: 'guides', label: 'E-Commerce Guides' },
              { id: 'playbooks', label: 'Merchant Playbooks' },
              { id: 'case-studies', label: 'Founder Case Studies' },
              { id: 'calculators', label: 'Profit Calculators' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-black shadow-md'
                    : 'glass text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive E-Commerce Merchant Profit Calculator */}
      <section className="py-16 bg-[#0B0D1B]/90 border-t border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#27C93F] uppercase tracking-wider mb-2">
              <Calculator size={14} />
              <span>Interactive Merchant Tool</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              E-Commerce Product Profit & Margin Calculator
            </h2>
            <p className="text-white/60 text-xs sm:text-sm max-w-xl mx-auto mt-2">
              Input your product retail price, COGS, ad spend, and shipping cost to calculate net profit margin and target ROAS.
            </p>
          </div>

          <div className="glass rounded-3xl border border-white/10 p-6 sm:p-8 max-w-4xl mx-auto shadow-2xl bg-[#090b16]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Inputs */}
              <div className="md:col-span-7 space-y-4 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-white/80 font-semibold">Retail Selling Price ($):</label>
                    <span className="font-bold text-white">${sellingPrice}</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={300}
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none accent-[#27C93F]"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-white/80 font-semibold">Cost of Goods Sold / COGS ($):</label>
                    <span className="font-bold text-white">${cogs}</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={150}
                    value={cogs}
                    onChange={(e) => setCogs(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none accent-[#FFBD2E]"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-white/80 font-semibold">Ad Acquisition Cost per Sale / CAC ($):</label>
                    <span className="font-bold text-white">${adSpendPerSale}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={adSpendPerSale}
                    onChange={(e) => setAdSpendPerSale(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none accent-[#FF5F56]"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-white/80 font-semibold">Shipping & Packaging Cost ($):</label>
                    <span className="font-bold text-white">${shippingCost}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={shippingCost}
                    onChange={(e) => setShippingCost(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none accent-[#27C93F]"
                  />
                </div>
              </div>

              {/* Display Summary */}
              <div className="md:col-span-5 glass rounded-2xl p-6 border border-[#27C93F]/40 bg-gradient-to-b from-[#27C93F]/10 to-[#090b16] text-center">
                <div className="text-xs text-white/40 uppercase font-mono mb-1">Net Profit Per Unit</div>
                <div className={`text-4xl font-extrabold mb-2 ${grossProfit > 0 ? 'text-[#27C93F]' : 'text-[#FF5F56]'}`}>
                  ${grossProfit.toFixed(2)}
                </div>
                <div className="text-xs text-white/70 mb-4">
                  Net Margin: <span className="font-bold text-white">{grossMargin}%</span>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-white/60 font-mono">
                  Target Min Ad ROAS: <span className="text-[#FFBD2E] font-bold">{roasRequired}x</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main E-Commerce Resources Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-bold text-white">
              Showing ({filteredResources.length}) Articles & Merchant Playbooks
            </h3>
            <span className="text-xs text-white/40">Updated Weekly</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredResources.map((res) => (
              <div
                key={res.id}
                className="glass rounded-2xl p-6 border border-white/10 hover:border-[#FFBD2E]/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#FFBD2E]/10 text-[#FFBD2E] border border-[#FFBD2E]/20">
                      {res.badge}
                    </span>
                    <span className="text-xs text-white/40 flex items-center gap-1">
                      <Clock size={12} />
                      {res.readTime}
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-white mb-3 group-hover:text-[#FFBD2E] transition-colors leading-snug">
                    {res.title}
                  </h4>

                  <p className="text-xs text-white/60 leading-relaxed mb-6">
                    {res.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-[#27C93F]">
                  <span className="group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Read Article <ArrowRight size={14} />
                  </span>
                  <ExternalLink size={14} className="text-white/30 group-hover:text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Dispatch */}
      <section className="py-20 bg-[#0B0D1B]/80 border-t border-white/10 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/20 text-[#FFBD2E] flex items-center justify-center mx-auto mb-4">
            <Sparkles size={24} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Subscribe to Nexus Commerce Insider
          </h2>
          <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Join 85,000+ e-commerce merchants receiving our weekly dispatch of growth strategies, CRO tips, and store AI prompts.
          </p>

          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#27C93F]"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="px-6 py-3 rounded-xl bg-[#27C93F] text-black font-bold whitespace-nowrap"
            >
              {subscribed ? 'Subscribed!' : 'Subscribe Free'}
            </Button>
          </form>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#FFBD2E]/15 via-[#FF5F56]/10 to-[#27C93F]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Ready to build your e-commerce brand?
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Get started today with a 14-day free store trial. No credit card required.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#FFBD2E] via-[#FF5F56] to-[#27C93F] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Start Free Store Trial
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
