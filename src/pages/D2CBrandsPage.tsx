import { useState } from 'react';
import { 
  Sparkles, Repeat, Users, BarChart, Heart, ArrowRight, 
  CheckCircle2, XCircle, ShoppingBag, ShieldCheck, Zap, DollarSign, Package
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function D2CBrandsPage() {
  const { navigate } = useApp();
  const [subscribers, setSubscribers] = useState<number>(5000);
  const [subPrice, setSubPrice] = useState<number>(45);

  const mrr = subscribers * subPrice;
  const arr = mrr * 12;

  const comparisonData = [
    { feature: 'Marketplace Commission Fee', nexus: '0% Platform Fee', marketplace: '15% – 25% Cut' },
    { feature: 'Customer Email Ownership', nexus: '100% Owned First-Party Data', marketplace: 'Masked / Hidden Emails' },
    { feature: 'Recurring Subscriptions', nexus: 'Built-in Auto-Refill Portal', marketplace: 'Not Supported' },
    { feature: 'Custom Brand Storefront', nexus: 'Unlimited Merchandising Control', marketplace: 'Generic Marketplace Grid' },
    { feature: 'Post-Purchase Upsells', nexus: '+24% Average Order Value Lift', marketplace: 'Competitor Ads Displayed' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-20 left-1/3 w-[600px] h-[380px] bg-[#27C93F]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-[#FFBD2E]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#27C93F]/40 bg-[#27C93F]/10 text-[#27C93F] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <Sparkles size={16} />
            <span>Nexus Direct-to-Consumer (D2C)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFBD2E]" />
            <span className="text-white/60">Own your brand channel</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Own your customer relationships, <br />
            <span className="text-gradient">maximize lifetime value.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Eliminate third-party marketplace commissions and build lasting direct relationships with your buyers. Built-in recurring subscriptions, VIP loyalty rewards, and first-party customer intelligence.
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
              Start D2C Storefront
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl border-white/20 hover:border-white/40"
              onClick={() => {
                document.getElementById('mrr-calculator')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<Repeat size={18} />}
            >
              Calculate Subscription MRR
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#27C93F]">+320%</div>
              <div className="text-xs text-white/50">Higher Customer LTV</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FFBD2E]">0%</div>
              <div className="text-xs text-white/50">Marketplace Commission</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">100%</div>
              <div className="text-xs text-white/50">Customer Data Ownership</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FF5F56]">3.2x</div>
              <div className="text-xs text-white/50">Repeat Purchase Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription & MRR Calculator */}
      <section id="mrr-calculator" className="py-20 bg-[#0B0D1B]/90 border-t border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Interactive D2C Subscription & MRR Calculator
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              See how recurring subscription replenishment builds predictable monthly revenue for your D2C brand.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-white/80">Active Subscribers:</label>
                    <span className="text-xl font-bold text-[#27C93F]">
                      {subscribers.toLocaleString()} members
                    </span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={50000}
                    step={500}
                    value={subscribers}
                    onChange={(e) => setSubscribers(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#27C93F]"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-white/80">Avg. Monthly Order Value:</label>
                    <span className="text-xl font-bold text-[#FFBD2E]">
                      ${subPrice} / mo
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={150}
                    step={5}
                    value={subPrice}
                    onChange={(e) => setSubPrice(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFBD2E]"
                  />
                </div>
              </div>

              <div className="glass rounded-2xl p-6 border border-[#27C93F]/40 bg-[#090b16] text-center">
                <div className="text-xs text-[#27C93F] font-bold uppercase tracking-wider mb-2">
                  Monthly Recurring Revenue (MRR)
                </div>
                <div className="text-4xl font-extrabold text-white mb-2">
                  ${mrr.toLocaleString()} / mo
                </div>
                <div className="text-sm text-[#FFBD2E] font-semibold mb-4">
                  Annual Projection: ${arr.toLocaleString()} / yr
                </div>
                <p className="text-xs text-white/50 mb-6">
                  Predictable cash flow with zero third-party commission cuts.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full py-3 rounded-xl bg-[#27C93F] text-black font-bold"
                  onClick={() => navigate('signup')}
                >
                  Launch Subscription Portal
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
              Nexus D2C Store vs. Third-Party Marketplaces
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-base">
              Why leading direct-to-consumer brands choose to sell directly on Nexus.
            </p>
          </div>

          <div className="glass rounded-2xl border border-white/10 overflow-hidden max-w-4xl mx-auto">
            <div className="grid grid-cols-12 bg-[#131629] p-4 text-xs font-bold text-white border-b border-white/10 uppercase">
              <div className="col-span-5">Feature</div>
              <div className="col-span-4 text-[#27C93F]">Nexus D2C Store</div>
              <div className="col-span-3 text-white/40">Marketplaces</div>
            </div>

            {comparisonData.map((row, idx) => (
              <div key={idx} className="grid grid-cols-12 p-4 text-sm items-center border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <div className="col-span-5 font-semibold text-white">{row.feature}</div>
                <div className="col-span-4 font-bold text-[#27C93F] flex items-center gap-1.5 text-xs sm:text-sm">
                  <CheckCircle2 size={16} />
                  <span>{row.nexus}</span>
                </div>
                <div className="col-span-3 text-white/40 flex items-center gap-1.5 text-xs sm:text-sm">
                  <XCircle size={16} className="text-[#FF5F56]" />
                  <span>{row.marketplace}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#27C93F]/15 via-[#FFBD2E]/10 to-[#FF5F56]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Take back control of your D2C brand
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Build your direct storefront, capture customer loyalty, and scale recurring subscription revenue.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#27C93F] via-[#FFBD2E] to-[#FF5F56] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Start Your D2C Channel
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
