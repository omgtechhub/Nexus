import { useState } from 'react';
import { 
  CreditCard, ShieldCheck, DollarSign, Globe, Lock, ArrowRight, 
  CheckCircle2, Sparkles, Zap, RefreshCw, BarChart2, ShieldAlert, Wallet, Building
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function PaymentsPage() {
  const { navigate } = useApp();
  const [monthlyVolume, setMonthlyVolume] = useState<number>(75000);
  const [region, setRegion] = useState<'domestic' | 'international' | 'local'>('domestic');

  const rates = {
    domestic: { competitor: 0.029, competitorFixed: 0.30, nexus: 0.021, nexusFixed: 0.15 },
    international: { competitor: 0.039, competitorFixed: 0.30, nexus: 0.028, nexusFixed: 0.20 },
    local: { competitor: 0.025, competitorFixed: 0.35, nexus: 0.012, nexusFixed: 0.10 },
  };

  const currentRate = rates[region];
  const avgTxSize = 75;
  const totalTxCount = monthlyVolume / avgTxSize;

  const competitorFeeMonthly = (monthlyVolume * currentRate.competitor) + (totalTxCount * currentRate.competitorFixed);
  const nexusFeeMonthly = (monthlyVolume * currentRate.nexus) + (totalTxCount * currentRate.nexusFixed);
  const monthlySavings = competitorFeeMonthly - nexusFeeMonthly;
  const annualSavings = monthlySavings * 12;

  const paymentMethods = [
    { name: 'Visa & Mastercard', category: 'Credit / Debit', fee: '2.1% + $0.15', badge: 'Standard' },
    { name: 'American Express', category: 'Credit / Debit', fee: '2.3% + $0.15', badge: 'High AOV' },
    { name: 'Apple Pay & Google Pay', category: 'Digital Wallets', fee: '2.1% + $0.15', badge: '1-Click Express' },
    { name: 'Klarna & Afterpay', category: 'Buy Now Pay Later', fee: '3.5% + $0.25', badge: '+28% AOV Lift' },
    { name: 'iDEAL, Bancontact & SEPA', category: 'European Local', fee: '1.2% + $0.10', badge: 'Euro Direct' },
    { name: 'ACH Direct Bank Transfer', category: 'Bank Deposit', fee: '0.8% ($5 cap)', badge: 'B2B Wholesale' },
  ];

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
            <span>Nexus Merchant Payment Processing</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5F56]" />
            <span className="text-white/60">Lower rates, instant payouts</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Accept any payment, <br />
            <span className="text-gradient">keep more merchant profit.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Process credit cards, Apple Pay, Buy Now Pay Later, and international local payment methods. Transparent rates, zero hidden platform fees, and same-day bank deposits.
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
              Activate Payments Account
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl border-white/20 hover:border-white/40"
              onClick={() => {
                document.getElementById('fee-calculator')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<BarChart2 size={18} />}
            >
              Compare Processing Fees
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FFBD2E]">2.1% + 15¢</div>
              <div className="text-xs text-white/50">Starting Card Rate</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#27C93F]">Same Day</div>
              <div className="text-xs text-white/50">Merchant Payout Schedule</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">135+</div>
              <div className="text-xs text-white/50">Settlement Currencies</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FF5F56]">99.8%</div>
              <div className="text-xs text-white/50">Fraud Prevention Accuracy</div>
            </div>
          </div>
        </div>
      </section>

      {/* Fee Savings Calculator */}
      <section id="fee-calculator" className="py-20 bg-[#0B0D1B]/90 border-t border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Interactive Merchant Fee Savings Calculator
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Calculate your monthly transaction fee savings compared to legacy payment gateways.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-white/80">Monthly Sales Volume:</label>
                    <span className="text-2xl font-extrabold text-[#FFBD2E]">
                      ${monthlyVolume.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5000}
                    max={500000}
                    step={5000}
                    value={monthlyVolume}
                    onChange={(e) => setMonthlyVolume(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFBD2E]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Transaction Type:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'domestic', label: 'US Domestic Cards', sub: '2.1% + 15¢' },
                      { id: 'international', label: 'International Cards', sub: '2.8% + 20¢' },
                      { id: 'local', label: 'Direct Bank Payment', sub: '1.2% + 10¢' },
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setRegion(type.id as any)}
                        className={`p-3 rounded-xl text-left border transition-all ${
                          region === type.id
                            ? 'bg-[#FFBD2E]/20 border-[#FFBD2E]/60 text-white'
                            : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-xs font-bold">{type.label}</div>
                        <div className="text-[10px] text-white/40">{type.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 glass rounded-2xl p-8 border border-[#27C93F]/40 bg-[#090b16] text-center flex flex-col justify-center">
                <div className="text-xs text-[#27C93F] font-bold uppercase tracking-wider mb-2">Estimated Annual Savings</div>
                <div className="text-4xl sm:text-5xl font-extrabold text-white mb-2">
                  ${annualSavings > 0 ? annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
                </div>
                <p className="text-xs text-white/50 mb-6">
                  Save approx <span className="text-[#27C93F] font-bold">${monthlySavings.toFixed(0)}/mo</span> in raw processing fees.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full py-3 rounded-xl bg-[#27C93F] text-black font-bold"
                  onClick={() => navigate('signup')}
                >
                  Activate Merchant Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Methods Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
              100+ Global & Local Payment Methods
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-base">
              Give buyers their favorite way to pay at checkout to maximize store sales.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {paymentMethods.map((method, idx) => (
              <div key={idx} className="glass rounded-2xl p-6 border border-white/10 hover:border-[#FFBD2E]/40 transition-all flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#FFBD2E] bg-[#FFBD2E]/10 px-2 py-0.5 rounded-full">
                    {method.category}
                  </span>
                  <h4 className="text-base font-bold text-white mt-2 mb-1">{method.name}</h4>
                  <div className="text-xs text-white/40">Rate: {method.fee}</div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-medium text-[#27C93F] bg-[#27C93F]/10 px-2 py-1 rounded-md border border-[#27C93F]/20">
                    {method.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#FFBD2E]/15 via-[#FF5F56]/10 to-[#27C93F]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Start accepting payments in minutes
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Seamlessly integrated into your Nexus Online Store and POS counter.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#FFBD2E] via-[#FF5F56] to-[#27C93F] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Create Merchant Account
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
