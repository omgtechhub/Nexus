import { useState } from 'react';
import { 
  Globe, Languages, ShieldCheck, CheckCircle2, ArrowRight, 
  Sparkles, DollarSign, RefreshCw, MapPin, Landmark
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function InternationalSolutionPage() {
  const { navigate } = useApp();
  const [targetRegion, setTargetRegion] = useState<'eu' | 'uk' | 'jp' | 'latam'>('eu');

  const marketSpecs = {
    eu: { region: 'European Union', currencies: 'EUR (€)', languages: 'German, French, Spanish, Italian', duty: 'Automated VAT Collection (DDP)', payment: 'iDEAL, Sofort, Bancontact, Cards' },
    uk: { region: 'United Kingdom', currencies: 'GBP (£)', languages: 'English (UK)', duty: 'Automated UK VAT', payment: 'Klarna, Apple Pay, Cards' },
    jp: { region: 'Asia Pacific (Japan)', currencies: 'JPY (¥)', languages: 'Japanese', duty: 'Automated Customs Duties', payment: 'Konbini, Line Pay, PayEasy' },
    latam: { region: 'Latin America (Brazil/Mexico)', currencies: 'BRL (R$), MXN ($)', languages: 'Portuguese, Spanish', duty: 'Automated ICMS / Tax Duties', payment: 'Pix Instant Pay, OXXO, Cards' },
  };

  const current = marketSpecs[targetRegion];

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
            <Globe size={16} />
            <span>Nexus International Trade & Expansion</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-white/60">Cross-border e-commerce</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Cross-border e-commerce trade, <br />
            <span className="text-gradient">localized for every country.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Sell to buyers in over 175 countries with localized store currency conversion, automated landed cost duties (VAT/GST), multi-language translation, and preferred local payment methods.
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
              Start Global Expansion
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl border-white/20 hover:border-white/40"
              onClick={() => {
                document.getElementById('intl-simulator')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<Globe size={18} />}
            >
              Test International Localizer
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FFBD2E]">175+</div>
              <div className="text-xs text-white/50">Target Countries</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#27C93F]">135+</div>
              <div className="text-xs text-white/50">Settlement Currencies</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">DDP Ready</div>
              <div className="text-xs text-white/50">Delivered Duty Paid</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FF5F56]">Auto VAT</div>
              <div className="text-xs text-white/50">Customs Compliance</div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Market Simulator */}
      <section id="intl-simulator" className="py-20 bg-[#0B0D1B]/90 border-t border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Interactive International Market Localizer
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Select a global market to inspect automatic localization and tax duty compliance.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-3">Target International Region:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'eu', label: 'European Union (EU)' },
                      { id: 'uk', label: 'United Kingdom' },
                      { id: 'jp', label: 'Asia Pacific (Japan)' },
                      { id: 'latam', label: 'Latin America (Brazil/Mexico)' },
                    ].map((reg) => (
                      <button
                        key={reg.id}
                        onClick={() => setTargetRegion(reg.id as any)}
                        className={`p-3 rounded-xl text-xs font-semibold text-left border transition-all ${
                          targetRegion === reg.id
                            ? 'bg-[#FFBD2E]/20 border-[#FFBD2E]/60 text-white'
                            : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {reg.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                  <div className="flex justify-between text-white/60">
                    <span>Currency & Pricing:</span>
                    <span className="font-bold text-white">{current.currencies}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Tax & Landed Duty:</span>
                    <span className="font-semibold text-[#27C93F]">{current.duty}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Local Payment Tenders:</span>
                    <span className="font-semibold text-[#FFBD2E]">{current.payment}</span>
                  </div>
                </div>
              </div>

              {/* Display Summary */}
              <div className="md:col-span-5 glass rounded-2xl p-6 border border-[#FFBD2E]/40 bg-[#090b16] text-center">
                <div className="text-xs text-white/40 uppercase font-mono mb-1">Configured Market</div>
                <div className="text-2xl font-extrabold text-white mb-2">{current.region}</div>
                <p className="text-xs text-white/50 mb-6">
                  Languages: {current.languages}
                </p>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FFBD2E] to-[#27C93F] text-black font-bold"
                  onClick={() => navigate('signup')}
                >
                  Enable {current.region}
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
            Expand your brand worldwide today
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Get started with a 14-day free trial.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#FFBD2E] via-[#FF5F56] to-[#27C93F] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Launch International Trade
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
