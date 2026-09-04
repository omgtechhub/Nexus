import { useState } from 'react';
import { 
  BookOpen, Search, Clock, ArrowRight, Sparkles, Tag, ExternalLink
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function BlogPage() {
  const { navigate } = useApp();
  const [activeCategory, setActiveCategory] = useState<'all' | 'growth' | 'cro' | 'pos'>('all');

  const articles = [
    {
      id: 1,
      title: '7 Checkout Design Tweaks That Lift Mobile Store Conversion by +30%',
      snippet: 'Learn how simplifying payment fields, displaying security badges, and offering 1-click Apple Pay dramatically cuts cart drop-offs.',
      category: 'cro',
      readTime: '6 min read',
      date: 'Sept 4, 2026',
    },
    {
      id: 2,
      title: 'How Omnichannel POS Registers Eliminate Stock Discrepancies',
      snippet: 'Discover how top boutique retailers sync physical counter registers with online e-commerce stock in sub-second real time.',
      category: 'pos',
      readTime: '8 min read',
      date: 'Aug 28, 2026',
    },
    {
      id: 3,
      title: 'Scaling D2C Subscription Replenishment in 2026',
      snippet: 'A deep dive into recurring billing incentives, flexible delivery schedules, and retention strategies that double customer lifetime value.',
      category: 'growth',
      readTime: '10 min read',
      date: 'Aug 21, 2026',
    },
  ];

  const filtered = articles.filter(a => activeCategory === 'all' || a.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute top-20 left-1/3 w-[550px] h-[380px] bg-[#FFBD2E]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FFBD2E]/40 bg-[#FFBD2E]/10 text-[#FFBD2E] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <BookOpen size={16} />
            <span>Nexus E-Commerce Merchant Journal</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-white/60">Weekly Insights & Playbooks</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            E-Commerce strategy, growth <br />
            <span className="text-gradient">playbooks & product releases.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Articles written by veteran e-commerce founders and retail strategists to help you optimize conversion and scale revenue.
          </p>

          <div className="flex justify-center gap-2 mb-10">
            {[
              { id: 'all', label: 'All Articles' },
              { id: 'growth', label: 'Store Growth' },
              { id: 'cro', label: 'CRO & Checkout' },
              { id: 'pos', label: 'Omnichannel POS' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-gradient-to-r from-[#FF5F56] to-[#FFBD2E] text-black font-bold'
                    : 'glass text-white/60 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filtered.map((art) => (
              <div key={art.id} className="glass rounded-2xl p-6 border border-white/10 hover:border-[#FFBD2E]/40 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between text-xs text-white/40 mb-3">
                    <span>{art.date}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {art.readTime}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#FFBD2E] transition-colors">{art.title}</h3>
                  <p className="text-xs text-white/60 leading-relaxed mb-6">{art.snippet}</p>
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs font-semibold text-[#27C93F]">
                  <span>Read Article</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
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
