import { useState } from 'react';
import { 
  DollarSign, TrendingUp, ShieldCheck, CheckCircle2, ArrowRight, 
  Sparkles, RefreshCw, Building, Zap, Percent, Clock, Award
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function CapitalPage() {
  const { navigate } = useApp();
  const [monthlySales, setMonthlySales] = useState<number>(45000);
  const [fundingRequest, setFundingRequest] = useState<number>(30000);

  // Capital calculation logic
  const flatFee = fundingRequest * 0.08; // 8% flat fee
  const totalRepayment = fundingRequest + flatFee;
  const dailyRemittanceRate = 8; // 8% of daily sales

  const estimatedDaysToRepay = Math.round(totalRepayment / ((monthlySales / 30) * (dailyRemittanceRate / 100)));

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
            <DollarSign size={16} />
            <span>Nexus Capital Merchant Funding</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-white/60">Fast growth capital</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Flexible merchant funding, <br />
            <span className="text-gradient">repaid as you make sales.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Fuel inventory purchases, Q4 ad campaigns, and brand expansion with fast, non-dilutive capital. No credit checks, no compounding interest, and automated daily sales remittance.
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
              Check Capital Eligibility
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl border-white/20 hover:border-white/40"
              onClick={() => {
                document.getElementById('capital-calculator')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<TrendingUp size={18} />}
            >
              Calculate Funding Terms
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FFBD2E]">&lt; 48 Hours</div>
              <div className="text-xs text-white/50">Approval to Deposit</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#27C93F]">0</div>
              <div className="text-xs text-white/50">Credit Score Impact</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">$5,000 – $250k</div>
              <div className="text-xs text-white/50">Funding Range</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FF5F56]">Fixed Flat Fee</div>
              <div className="text-xs text-white/50">No Compounding Interest</div>
            </div>
          </div>
        </div>
      </section>

      {/* Capital Funding Calculator */}
      <section id="capital-calculator" className="py-20 bg-[#0B0D1B]/90 border-t border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Interactive Capital Funding Calculator
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Slide your average monthly store sales and desired funding amount to view your estimated remittance schedule.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-white/80">Monthly Store Sales (GMV):</label>
                    <span className="text-xl font-bold text-[#FFBD2E]">
                      ${monthlySales.toLocaleString()} / mo
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10000}
                    max={250000}
                    step={5000}
                    value={monthlySales}
                    onChange={(e) => setMonthlySales(Number(e.target.value))}
                    className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFBD2E]"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-white/80">Desired Capital Advance:</label>
                    <span className="text-xl font-bold text-[#27C93F]">
                      ${fundingRequest.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5000}
                    max={100000}
                    step={5000}
                    value={fundingRequest}
                    onChange={(e) => setFundingRequest(Number(e.target.value))}
                    className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#27C93F]"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                  <div className="flex justify-between text-white/60">
                    <span>Fixed Capital Fee (8%):</span>
                    <span className="font-bold text-white">${flatFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Daily Sales Remittance Rate:</span>
                    <span className="font-bold text-[#27C93F]">{dailyRemittanceRate}% of daily store revenue</span>
                  </div>
                </div>
              </div>

              {/* Offer Summary */}
              <div className="md:col-span-5 glass rounded-2xl p-6 border border-[#FFBD2E]/40 bg-[#090b16] text-center flex flex-col justify-between">
                <div>
                  <div className="text-xs text-white/40 uppercase font-mono mb-1">Estimated Repayment Total</div>
                  <div className="text-3xl font-extrabold text-white mb-2">
                    ${totalRepayment.toLocaleString()}
                  </div>
                  <p className="text-xs text-white/60 mb-4">
                    Est. Repayment Time: <span className="text-[#FFBD2E] font-bold">~{estimatedDaysToRepay} days</span>
                  </p>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-[11px] text-white/50 mb-6">
                    If sales slow down, daily remittance automatically slows down. Zero fixed monthly penalties.
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FFBD2E] to-[#27C93F] text-black font-bold"
                  onClick={() => navigate('signup')}
                >
                  Apply for Capital Advance
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
            Fuel your next stage of store growth
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Get instant funding offers based on your store sales history.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#FFBD2E] via-[#FF5F56] to-[#27C93F] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Apply for Nexus Capital
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
