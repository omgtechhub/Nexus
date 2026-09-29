import { useState } from 'react';
import { 
  Store, ArrowRight, 
  Clock
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function SmallBusinessPage() {
  const { navigate } = useApp();
  const [monthlySales, setMonthlySales] = useState<number>(20000);

  const hoursSavedWeekly = Math.round(monthlySales / 1500);
  const softwareCostSavedMonthly = 185;

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-20 left-1/3 w-[550px] h-[380px] bg-[#FFBD2E]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-[#FF5F56]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FFBD2E]/40 bg-[#FFBD2E]/10 text-[#FFBD2E] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <Store size={16} />
            <span>Nexus for Small Business</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-white/60">All-in-one store management</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Everything your small business needs, <br />
            <span className="text-gradient">in one simple platform.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Replace separate software subscriptions with one unified solution. Manage your online storefront, in-person register, inventory, customer contacts, and invoicing without hiring tech staff.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl bg-gradient-to-r from-[#FFBD2E] via-[#FF5F56] to-[#27C93F] text-black font-bold"
              onClick={() => navigate('signup')}
              icon={<ArrowRight size={18} />}
              iconPosition="right"
            >
              Start Free SMB Trial
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl border-white/20 hover:border-white/40"
              onClick={() => {
                document.getElementById('smb-calculator')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<Clock size={18} />}
            >
              Calculate Time & Cost Savings
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FFBD2E]">15+ Hrs/Wk</div>
              <div className="text-xs text-white/50">Admin Time Saved</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#27C93F]">$200+/mo</div>
              <div className="text-xs text-white/50">Software Fees Saved</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">1 Register</div>
              <div className="text-xs text-white/50">Free Mobile POS Included</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FF5F56]">24/7</div>
              <div className="text-xs text-white/50">Merchant Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Time & Cost Savings Calculator */}
      <section id="smb-calculator" className="py-20 bg-[#0B0D1B]/90 border-t border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Interactive Small Business Savings Calculator
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Slide your average monthly store sales to calculate how much admin time and plugin software costs Nexus saves your business.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-white/80">Monthly Small Business Revenue:</label>
                    <span className="text-xl font-bold text-[#FFBD2E]">
                      ${monthlySales.toLocaleString()} / mo
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5000}
                    max={60000}
                    step={2500}
                    value={monthlySales}
                    onChange={(e) => setMonthlySales(Number(e.target.value))}
                    className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFBD2E]"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                  <div className="flex justify-between text-white/60">
                    <span>Replaced Software Subscriptions:</span>
                    <span className="font-semibold text-white">POS + Website + Invoicing + Email</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Estimated Admin Time Saved:</span>
                    <span className="font-bold text-[#27C93F]">{hoursSavedWeekly} hours / week</span>
                  </div>
                </div>
              </div>

              {/* Display Output */}
              <div className="md:col-span-5 glass rounded-2xl p-6 border border-[#FFBD2E]/40 bg-[#090b16] text-center">
                <div className="text-xs text-white/40 uppercase font-mono mb-1">Estimated Software Savings</div>
                <div className="text-3xl font-extrabold text-[#27C93F] mb-2">
                  ${softwareCostSavedMonthly}/mo
                </div>
                <p className="text-xs text-white/50 mb-6">
                  Save ${softwareCostSavedMonthly * 12}/year by consolidating into one Nexus SMB plan.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FFBD2E] to-[#27C93F] text-black font-bold"
                  onClick={() => navigate('signup')}
                >
                  Start Small Business Trial
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#FFBD2E]/15 via-[#FF5F56]/10 to-[#27C93F]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Simplify your small business operations
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Get started with a 14-day free trial. No credit card required.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#FFBD2E] via-[#FF5F56] to-[#27C93F] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Start Free Trial
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
