import { useState } from 'react';
import { 
  Globe, ArrowRight
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function MarketsPage() {
  const { navigate } = useApp();
  const [selectedRegion, setSelectedRegion] = useState<'eu' | 'uk' | 'jp' | 'br'>('eu');

  const regions = {
    eu: { country: 'Germany / Europe', currency: 'EUR (€)', rate: 0.92, vat: '19% VAT Included', domain: 'yourstore.de', method: 'iDEAL & Sofort' },
    uk: { country: 'United Kingdom', currency: 'GBP (£)', rate: 0.79, vat: '20% VAT Included', domain: 'yourstore.co.uk', method: 'Klarna & Visa' },
    jp: { country: 'Japan', currency: 'JPY (¥)', rate: 155, vat: '10% Duty Included', domain: 'yourstore.jp', method: 'Konbini & Line Pay' },
    br: { country: 'Brazil', currency: 'BRL (R$)', rate: 5.45, vat: '17% ICMS Included', domain: 'yourstore.com.br', method: 'Pix Instant Pay' },
  };

  const current = regions[selectedRegion];
  const itemPriceUsd = 100;
  const localPrice = (itemPriceUsd * current.rate).toFixed(selectedRegion === 'jp' ? 0 : 2);

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
            <span>Nexus Markets Global Expansion</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-white/60">Cross-border e-commerce</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Sell globally, <br />
            <span className="text-gradient">localize locally.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Expand into international markets with automatic currency conversion, localized storefront languages, local domain routing, and guaranteed landed cost duty collection.
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
              Start Global Store Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl border-white/20 hover:border-white/40"
              onClick={() => {
                document.getElementById('markets-simulator')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<Globe size={18} />}
            >
              Test Cross-Border Simulator
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FFBD2E]">175+</div>
              <div className="text-xs text-white/50">Countries Supported</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#27C93F]">135+</div>
              <div className="text-xs text-white/50">Local Currencies</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">100%</div>
              <div className="text-xs text-white/50">Guaranteed Landed Duties</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FF5F56]">Auto</div>
              <div className="text-xs text-white/50">Language Translation</div>
            </div>
          </div>
        </div>
      </section>

      {/* Cross-Border Storefront Simulator */}
      <section id="markets-simulator" className="py-20 bg-[#0B0D1B]/90 border-t border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Interactive Cross-Border Merchandising Simulator
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Select an international region to see how your store automatically adapts currency, domain, and landed duties for local buyers.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-3">Select Target Market:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'eu', label: 'Europe (Germany/France)' },
                      { id: 'uk', label: 'United Kingdom' },
                      { id: 'jp', label: 'Japan' },
                      { id: 'br', label: 'Brazil' },
                    ].map((reg) => (
                      <button
                        key={reg.id}
                        onClick={() => setSelectedRegion(reg.id as any)}
                        className={`p-3 rounded-xl text-xs font-semibold text-left border transition-all ${
                          selectedRegion === reg.id
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
                    <span>Local Domain Redirect:</span>
                    <span className="font-mono text-[#27C93F]">https://{current.domain}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Tax & Duties Standard:</span>
                    <span className="font-semibold text-white">{current.vat}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Preferred Payment Method:</span>
                    <span className="font-semibold text-[#FFBD2E]">{current.method}</span>
                  </div>
                </div>
              </div>

              {/* Localized Buyer Checkout Display */}
              <div className="md:col-span-5 glass rounded-2xl p-6 border border-[#FFBD2E]/40 bg-[#090b16] text-center">
                <div className="text-xs text-white/40 uppercase font-mono mb-1">Local Buyer Checkout Display</div>
                <div className="text-xs text-white/60 mb-2">Base Item: $100.00 USD</div>
                <div className="text-3xl font-extrabold text-[#27C93F] mb-1">
                  {current.currency.split(' ')[1]} {localPrice}
                </div>
                <div className="text-[11px] text-white/50 mb-6">{current.vat}</div>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FFBD2E] to-[#27C93F] text-black font-bold"
                  onClick={() => navigate('signup')}
                >
                  Enable {current.country} Store
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
            Start selling to international buyers today
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Enable cross-border sales in a few clicks with zero complex setup.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#FFBD2E] via-[#FF5F56] to-[#27C93F] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Launch Nexus Markets
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
