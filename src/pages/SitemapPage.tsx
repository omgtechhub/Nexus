import { useState } from 'react';
import { 
  Map, Search, Layers, ShoppingBag, ShieldCheck, BookOpen, 
  DollarSign, User, ExternalLink, ArrowRight, Sparkles, CheckCircle2
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';
import { View } from '../types';

export function SitemapPage() {
  const { navigate } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const siteTree: {
    category: string;
    icon: any;
    color: string;
    items: { title: string; desc: string; target: View }[];
  }[] = [
    {
      category: 'E-Commerce Products',
      icon: ShoppingBag,
      color: '#FF5F56',
      items: [
        { title: 'Online Store', desc: 'Customizable storefront builder & Liquid engine', target: 'online-store' },
        { title: 'Point of Sale (POS)', desc: 'In-person retail register software & barcode hardware', target: 'pos' },
        { title: 'Nexus Payments', desc: 'Built-in multi-currency payment processing', target: 'payments' },
        { title: 'Nexus Capital', desc: 'Fast merchant growth revenue financing', target: 'capital' },
        { title: 'Nexus Shipping', desc: 'Discounted shipping labels & real-time tracking', target: 'shipping' },
        { title: 'Nexus Markets', desc: 'Cross-border international sales localizer', target: 'markets' },
        { title: 'NexusIQ AI Assistant', desc: 'Merchant AI for auto-copywriting & CRO analytics', target: 'ai-assistant' },
        { title: 'Shop Pay', desc: '1-Click accelerated buyer checkout', target: 'shop-pay' },
      ],
    },
    {
      category: 'Industry Solutions',
      icon: Layers,
      color: '#FFBD2E',
      items: [
        { title: 'Startups', desc: 'Turnkey store launch wizard & founder credits', target: 'startups' },
        { title: 'Small Business', desc: 'All-in-one store software & SMB profit calculator', target: 'small-business' },
        { title: 'Enterprises', desc: 'High-concurrency peak checkout & custom SLA', target: 'enterprises' },
        { title: 'D2C Brands', desc: 'Subscription replenishment & VIP loyalty rewards', target: 'd2c' },
        { title: 'B2B Wholesale', desc: 'Volume tier pricing, Net-30 credit terms & ERP sync', target: 'b2b' },
        { title: 'Marketplaces', desc: 'Multi-vendor platform take-rate revenue splitter', target: 'marketplaces' },
        { title: 'Retail', desc: 'Physical brick-and-mortar store network inventory sync', target: 'retail' },
        { title: 'International', desc: 'Global localized currencies, duties & payment tenders', target: 'international' },
      ],
    },
    {
      category: 'Merchant Resources & Community',
      icon: BookOpen,
      color: '#27C93F',
      items: [
        { title: 'Resource Hub', desc: 'Interactive CRO playbooks & profit margin tools', target: 'resources' },
        { title: 'Documentation', desc: 'GraphQL API schema reader & Liquid theme docs', target: 'docs' },
        { title: 'Blog', desc: 'Merchant growth playbooks & marketing guides', target: 'blog' },
        { title: 'Help Center', desc: '24/7 store support search portal & FAQs', target: 'help-center' },
        { title: 'Partners Program', desc: 'Agency partner network & 20% revenue share', target: 'partners' },
        { title: 'App Store', desc: 'Extend store capabilities with 1-click apps', target: 'app-store' },
        { title: 'Changelog', desc: 'Platform release updates & monthly log', target: 'changelog' },
        { title: 'Status Page', desc: 'Real-time 99.99% system uptime monitor', target: 'status-page' },
        { title: 'Community', desc: 'Merchant forums, city meetups & annual summit', target: 'community' },
      ],
    },
    {
      category: 'Pricing & Account Portals',
      icon: DollarSign,
      color: '#FFBD2E',
      items: [
        { title: 'Pricing Plans', desc: 'Starter, Growth, Pro & Enterprise plan matrix', target: 'pricing' },
        { title: 'Merchant Login', desc: 'Sign in to your Nexus store admin dashboard', target: 'login' },
        { title: 'Start Free Trial', desc: 'Create a new Nexus store account in 2 minutes', target: 'signup' },
        { title: 'Merchant Dashboard', desc: 'Store sales metrics, orders & inventory management', target: 'dashboard' },
        { title: 'Admin Control Panel', desc: 'Platform system configuration & store settings', target: 'admin' },
      ],
    },
    {
      category: 'Legal & Privacy Compliance',
      icon: ShieldCheck,
      color: '#FF5F56',
      items: [
        { title: 'Privacy Policy', desc: 'GDPR/CCPA merchant data protection standards & DSAR portal', target: 'privacy' },
        { title: 'Terms of Service', desc: 'Merchant master service agreement & 99.99% SLA credit terms', target: 'terms' },
        { title: 'Cookie Policy', desc: 'Interactive cookie preference manager & platform directory', target: 'cookies' },
        { title: 'Visual Sitemap', desc: 'Complete directory of all pages on Nexus Commerce', target: 'sitemap' },
      ],
    },
    {
      category: 'Company & Corporate',
      icon: User,
      color: '#FFBD2E',
      items: [
        { title: 'About Us', desc: 'Our mission, history & executive leadership team', target: 'about' },
        { title: 'Careers', desc: 'Explore open remote positions & team benefits', target: 'careers' },
        { title: 'Press & Media Kit', desc: 'Official brand assets, logos & news releases', target: 'press' },
        { title: 'Investor Relations', desc: 'Financial performance & institutional funding history', target: 'investors' },
        { title: 'Contact Us', desc: '24/7 global support & office location directory', target: 'contact' },
      ],
    },
  ];

  const filteredTree = siteTree.map(cat => ({
    ...cat,
    items: cat.items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        {/* Header Hero */}
        <section className="relative overflow-hidden py-16 border-b border-[#222642]/60">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF5F56]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#27C93F]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-wide text-[#27C93F] mb-6">
                <Map size={14} /> Full Platform Index • 33 Complete Page Views
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                Nexus Commerce <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">Platform Sitemap</span>
              </h1>
              <p className="text-lg text-white/60 leading-relaxed mb-8">
                Explore the complete structure of Nexus Commerce. Click any node below to navigate directly to its dedicated page view.
              </p>

              {/* Search Filter */}
              <div className="relative max-w-md">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pages across Nexus platform..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#FFBD2E] transition-all"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Tree Directory Content */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
          {filteredTree.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl border border-white/10">
              <p className="text-white/60 text-lg">No platform pages found matching "{searchQuery}"</p>
              <button onClick={() => setSearchQuery('')} className="mt-4 text-[#FFBD2E] text-sm font-bold underline">
                Clear Search Filter
              </button>
            </div>
          ) : (
            filteredTree.map((section, catIdx) => {
              const IconComp = section.icon;
              return (
                <div key={catIdx} className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center border"
                      style={{ 
                        backgroundColor: `${section.color}15`, 
                        borderColor: `${section.color}40`,
                        color: section.color 
                      }}
                    >
                      <IconComp size={20} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{section.category}</h2>
                      <p className="text-xs text-white/40">{section.items.length} active pages</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {section.items.map((item, itemIdx) => (
                      <button
                        key={itemIdx}
                        onClick={() => navigate(item.target)}
                        className="glass p-5 rounded-xl border border-white/10 hover:border-[#FFBD2E]/40 hover:bg-white/10 transition-all text-left group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-white text-sm group-hover:text-[#FFBD2E] transition-colors">{item.title}</span>
                            <ArrowRight size={14} className="text-white/30 group-hover:text-[#FFBD2E] group-hover:translate-x-1 transition-all" />
                          </div>
                          <p className="text-xs text-white/50 leading-relaxed">{item.desc}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-white/30">
                          <span>Route: /{item.target}</span>
                          <span className="text-[#27C93F] font-semibold">Active Page</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
