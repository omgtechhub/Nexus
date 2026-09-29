import { useState } from 'react';
import { 
  Rocket, CheckCircle2, ArrowRight, Globe, Store
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function StartupsPage() {
  const { navigate } = useApp();
  const [brandName, setBrandName] = useState('Aura Apparel');
  const [industry, setIndustry] = useState('Apparel & Fashion');
  const [isLaunching, setIsLaunching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [launched, setLaunched] = useState(false);

  const handleLaunchSimulation = () => {
    setIsLaunching(true);
    setProgress(0);
    setLaunched(false);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsLaunching(false);
          setLaunched(true);
          return 100;
        }
        return prev + 25;
      });
    }, 350);
  };

  const partnerPerks = [
    { provider: 'Stripe Launch', perk: '$20,000 Fee-Free Processing', icon: '💳' },
    { provider: 'Meta for Business', perk: '$500 Ad Campaign Voucher', icon: '📱' },
    { provider: 'Google Ads', perk: '$500 Matching Ad Credit', icon: '🔍' },
    { provider: 'ShipStation & DHL', perk: 'Up to 75% Off Shipping Rates', icon: '📦' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[380px] bg-[#FFBD2E]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-80 h-80 bg-[#FF5F56]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FFBD2E]/40 bg-[#FFBD2E]/10 text-[#FFBD2E] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <Rocket size={16} />
            <span>Nexus for E-Commerce Startups</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-white/60">Launch your brand in minutes</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Launch your e-commerce brand, <br />
            <span className="text-gradient">start selling today.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Everything ambitious founders need to build, launch, and validate an online store. Zero setup fees, turnkey storefront themes, instant payment gateway setup, and $50k in partner credits.
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
              Start Free Founder Trial
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl border-white/20 hover:border-white/40"
              onClick={() => {
                document.getElementById('startup-launcher')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<Store size={18} />}
            >
              Test Instant Store Setup
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FFBD2E]">&lt; 3 mins</div>
              <div className="text-xs text-white/50">Avg Time to Launch</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">$0</div>
              <div className="text-xs text-white/50">Upfront Platform Cost</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#27C93F]">$50K+</div>
              <div className="text-xs text-white/50">Partner Credits Included</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FF5F56]">14 Days</div>
              <div className="text-xs text-white/50">Free Trial Period</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Turnkey Store Launcher */}
      <section id="startup-launcher" className="py-20 bg-[#0B0D1B]/90 border-t border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Turnkey E-Commerce Store Generator
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Enter your brand name and industry below to simulate instant store setup and payment gateway provisioning.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative max-w-4xl mx-auto">
            <div className="bg-[#131629] px-4 py-3 rounded-t-2xl border-b border-white/10 flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                <span className="text-xs text-white/50 ml-2 font-mono">Store Provisioning Wizard</span>
              </div>
              <span className="text-xs text-[#27C93F] font-mono">1-Click Launch</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-semibold text-white/70 uppercase mb-2">Brand Name:</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFBD2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 uppercase mb-2">Industry Sector:</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-[#131629] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFBD2E]"
                >
                  <option>Apparel & Fashion</option>
                  <option>Health & Wellness</option>
                  <option>Beauty & Cosmetics</option>
                  <option>Food & Beverage</option>
                  <option>Home Goods</option>
                </select>
              </div>
            </div>

            <div className="flex justify-center mb-6">
              <Button
                variant="primary"
                size="md"
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#FFBD2E] via-[#FF5F56] to-[#27C93F] text-black font-bold shadow-xl"
                onClick={handleLaunchSimulation}
                disabled={isLaunching}
                icon={<Rocket size={16} />}
              >
                {isLaunching ? `Building Store... ${progress}%` : 'Provision Turnkey Storefront'}
              </Button>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/10 bg-[#090b16] min-h-[180px] flex items-center justify-center">
              {isLaunching ? (
                <div className="w-full max-w-md text-center">
                  <div className="text-xs text-[#FFBD2E] font-mono mb-2">
                    {progress === 25 && '📦 Setting up product catalog & collections...'}
                    {progress === 50 && '🎨 Applying mobile-first store theme...'}
                    {progress === 75 && '💳 Connecting instant payment processing gateway...'}
                    {progress === 100 && '🚀 Store ready for orders!'}
                  </div>
                  <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] h-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : launched ? (
                <div className="w-full text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-[#27C93F]/20 border border-[#27C93F]/40 text-[#27C93F] flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={28} />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-1">
                    {brandName} Store Provisioned!
                  </h4>
                  <p className="text-xs text-white/50 mb-4">
                    Category: {industry} · SSL Secured · Ready to accept payments
                  </p>
                  <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-xs font-mono text-[#27C93F] mb-4">
                    <Globe size={14} />
                    <span>https://{brandName.toLowerCase().replace(/\s+/g, '')}.nexus.store</span>
                  </div>
                  <div>
                    <Button variant="primary" size="sm" onClick={() => navigate('signup')}>
                      Claim Your Storefront
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-white/40 text-xs font-mono">
                  Click "Provision Turnkey Storefront" above to launch.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Partner Credits Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              $50,000+ in E-Commerce Founder Perks
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Every Nexus Startup account comes with exclusive credits to kickstart your advertising, shipping, and payment processing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {partnerPerks.map((perk, idx) => (
              <div key={idx} className="glass rounded-2xl p-6 border border-white/10 hover:border-[#FFBD2E]/40 transition-all text-center">
                <div className="text-3xl mb-3">{perk.icon}</div>
                <h4 className="text-lg font-bold text-white mb-1">{perk.provider}</h4>
                <div className="text-xs text-[#27C93F] font-bold bg-[#27C93F]/10 px-3 py-1 rounded-full border border-[#27C93F]/20 inline-block">
                  {perk.perk}
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
            Ready to launch your e-commerce startup?
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Start your 14-day free trial today. No credit card required, instant store setup.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#FFBD2E] via-[#FF5F56] to-[#27C93F] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Launch Your Brand Now
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
