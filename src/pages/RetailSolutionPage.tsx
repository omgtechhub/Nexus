import { useState } from 'react';
import { 
  Store, ArrowRight
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function RetailSolutionPage() {
  const { navigate } = useApp();
  const [storeCount, setStoreCount] = useState<number>(3);
  const [registersPerStore, setRegistersPerStore] = useState<number>(2);

  const totalRegisters = storeCount * registersPerStore;

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-20 left-1/3 w-[550px] h-[380px] bg-[#27C93F]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-[#FFBD2E]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#27C93F]/40 bg-[#27C93F]/10 text-[#27C93F] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <Store size={16} />
            <span>Nexus Retail & Brick-and-Mortar</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFBD2E]" />
            <span className="text-white/60">Omnichannel Store Network</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Connect physical stores with <br />
            <span className="text-gradient">online e-commerce sales.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Empower your retail store cashiers with iPad & tablet POS registers, unified inventory tracking across locations, local store pickup (BOPIS), and real-time sales reporting.
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
              Get Started with Retail POS
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl border-white/20 hover:border-white/40"
              onClick={() => {
                document.getElementById('retail-simulator')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<Store size={18} />}
            >
              Test Multi-Store Network
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#27C93F]">Sub-Second</div>
              <div className="text-xs text-white/50">Multi-Location Stock Sync</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">BOPIS Ready</div>
              <div className="text-xs text-white/50">Buy Online Pick Up In-Store</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FFBD2E]">Staff PIN</div>
              <div className="text-xs text-white/50">Cashier Commission Tracking</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FF5F56]">100%</div>
              <div className="text-xs text-white/50">Offline Sales Protection</div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Store Network Simulator */}
      <section id="retail-simulator" className="py-20 bg-[#0B0D1B]/90 border-t border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Interactive Retail Store Network Simulator
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Slide physical location counts and register setups to configure your retail network.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-white/80">Physical Store Locations:</label>
                    <span className="text-xl font-bold text-[#27C93F]">
                      {storeCount} retail locations
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={storeCount}
                    onChange={(e) => setStoreCount(Number(e.target.value))}
                    className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#27C93F]"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-white/80">Registers per Store Location:</label>
                    <span className="text-xl font-bold text-[#FFBD2E]">
                      {registersPerStore} checkout terminals
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={1}
                    value={registersPerStore}
                    onChange={(e) => setRegistersPerStore(Number(e.target.value))}
                    className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFBD2E]"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                  <div className="flex justify-between text-white/60">
                    <span>Total Connected Register Terminals:</span>
                    <span className="font-bold text-white">{totalRegisters} terminals</span>
                  </div>
                </div>
              </div>

              {/* Display Summary */}
              <div className="md:col-span-5 glass rounded-2xl p-6 border border-[#27C93F]/40 bg-[#090b16] text-center">
                <div className="text-xs text-white/40 uppercase font-mono mb-1">Configured Network</div>
                <div className="text-3xl font-extrabold text-white mb-2">{totalRegisters} Terminals</div>
                <p className="text-xs text-white/50 mb-6">
                  Synced across {storeCount} physical stores with online e-commerce catalog.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full py-3 rounded-xl bg-[#27C93F] text-black font-bold"
                  onClick={() => navigate('signup')}
                >
                  Deploy Retail Network
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#27C93F]/15 via-[#FFBD2E]/10 to-[#FF5F56]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Upgrade your retail store network
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Get started with a 14-day free trial.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#27C93F] via-[#FFBD2E] to-[#FF5F56] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Start Retail Solution
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
