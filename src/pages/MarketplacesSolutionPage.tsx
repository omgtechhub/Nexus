import { useState } from 'react';
import { 
  Globe, ArrowRight, 
  DollarSign
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function MarketplacesSolutionPage() {
  const { navigate } = useApp();
  const [gmv, setGmv] = useState<number>(250000);
  const [takeRate, setTakeRate] = useState<number>(12);

  const platformRevenue = gmv * (takeRate / 100);
  const sellerPayouts = gmv - platformRevenue;

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-20 left-1/3 w-[550px] h-[380px] bg-[#FF5F56]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-[#FFBD2E]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FF5F56]/40 bg-[#FF5F56]/10 text-[#FF5F56] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <Globe size={16} />
            <span>Nexus Multi-Vendor Marketplaces</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-white/60">Scale your platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Build & scale a multi-vendor <br />
            <span className="text-gradient">e-commerce marketplace.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Allow third-party sellers to list products on your store. Automate seller onboarding, custom commission take-rates, split payment checkouts, and seller payout routing.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-black font-bold"
              onClick={() => navigate('signup')}
              icon={<ArrowRight size={18} />}
              iconPosition="right"
            >
              Launch Marketplace Platform
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl border-white/20 hover:border-white/40"
              onClick={() => {
                document.getElementById('marketplace-calculator')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<DollarSign size={18} />}
            >
              Calculate Platform Take-Rate
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FF5F56]">Auto Split</div>
              <div className="text-xs text-white/50">Payment Checkout Routing</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">10,000+</div>
              <div className="text-xs text-white/50">Vendors Capability</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#27C93F]">100%</div>
              <div className="text-xs text-white/50">Automated Tax Reporting</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FFBD2E]">Custom</div>
              <div className="text-xs text-white/50">Commission Rule Engine</div>
            </div>
          </div>
        </div>
      </section>

      {/* Marketplace Commission Calculator */}
      <section id="marketplace-calculator" className="py-20 bg-[#0B0D1B]/90 border-t border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Interactive Marketplace Take-Rate Calculator
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Slide your gross marketplace GMV and take-rate percentage to estimate your platform revenue and automated vendor payouts.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-white/80">Gross Marketplace Volume (GMV):</label>
                    <span className="text-xl font-bold text-[#FF5F56]">
                      ${gmv.toLocaleString()} / mo
                    </span>
                  </div>
                  <input
                    type="range"
                    min={25000}
                    max={1000000}
                    step={25000}
                    value={gmv}
                    onChange={(e) => setGmv(Number(e.target.value))}
                    className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF5F56]"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-white/80">Platform Commission Take-Rate:</label>
                    <span className="text-xl font-bold text-[#FFBD2E]">
                      {takeRate}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={30}
                    step={1}
                    value={takeRate}
                    onChange={(e) => setTakeRate(Number(e.target.value))}
                    className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFBD2E]"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                  <div className="flex justify-between text-white/60">
                    <span>Automated Seller Payout Total:</span>
                    <span className="font-bold text-[#27C93F]">${sellerPayouts.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Display Revenue */}
              <div className="md:col-span-5 glass rounded-2xl p-6 border border-[#FF5F56]/40 bg-[#090b16] text-center">
                <div className="text-xs text-white/40 uppercase font-mono mb-1">Gross Platform Net Revenue</div>
                <div className="text-3xl font-extrabold text-[#FF5F56] mb-2">
                  ${platformRevenue.toLocaleString()} / mo
                </div>
                <p className="text-xs text-white/50 mb-6">
                  Annual Net Revenue: ${ (platformRevenue * 12).toLocaleString() }
                </p>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF5F56] to-[#FFBD2E] text-black font-bold"
                  onClick={() => navigate('signup')}
                >
                  Start Marketplace Platform
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#FF5F56]/15 via-[#FFBD2E]/10 to-[#27C93F]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Build your multi-vendor marketplace
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Get started with a 14-day free trial.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Launch Marketplace
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
