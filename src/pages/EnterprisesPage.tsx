import { useState } from 'react';
import { 
  Building2, Activity, Globe, Lock, ArrowRight, CheckCircle2, Headphones
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function EnterprisesPage() {
  const { navigate } = useApp();
  const [concurrency, setConcurrency] = useState<number>(60000);

  const latency = Math.round(18 + (concurrency / 10000) * 1.2);
  const throughput = (concurrency * 0.98).toLocaleString();

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-20 left-1/3 w-[600px] h-[400px] bg-[#FF5F56]/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-[#FFBD2E]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FF5F56]/40 bg-[#FF5F56]/10 text-[#FF5F56] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <Building2 size={16} />
            <span>Nexus Enterprise E-Commerce</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-white/60">99.999% SLA Uptime</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Global e-commerce scale, <br />
            <span className="text-gradient">engineered for high volume.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            High-concurrency e-commerce architecture built to handle viral product drops, Black Friday order spikes, multi-storefront international expansion, and custom ERP integrations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl"
              onClick={() => navigate('signup')}
              icon={<ArrowRight size={18} />}
              iconPosition="right"
            >
              Contact Enterprise Sales
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl border-white/20 hover:border-white/40"
              onClick={() => {
                document.getElementById('checkout-simulator')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<Activity size={18} />}
            >
              Simulate High-Volume Spike
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FF5F56]">99.999%</div>
              <div className="text-xs text-white/50">Uptime SLA Guarantee</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">&lt; 30ms</div>
              <div className="text-xs text-white/50">Global Edge API Response</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#27C93F]">150K+</div>
              <div className="text-xs text-white/50">Checkouts / Min Capability</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FFBD2E]">24/7/365</div>
              <div className="text-xs text-white/50">Dedicated Enterprise Team</div>
            </div>
          </div>
        </div>
      </section>

      {/* High Volume Checkout Simulator */}
      <section id="checkout-simulator" className="py-20 bg-[#0B0D1B]/90 border-t border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Interactive Black Friday Checkout Simulator
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Simulate high-volume checkout spikes (e.g. Flash Sales) and inspect real-time checkout stability.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative max-w-4xl mx-auto">
            <div className="bg-[#131629] px-4 py-3 rounded-t-2xl border-b border-white/10 flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                <span className="text-xs text-white/50 ml-2 font-mono">Global Edge Checkout Engine</span>
              </div>
              <span className="text-xs text-[#27C93F] font-mono">Cluster: Healthy</span>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-white/80">Simulated Concurrent Orders / min:</label>
                <span className="text-2xl font-extrabold text-[#FF5F56]">
                  {concurrency.toLocaleString()} orders/min
                </span>
              </div>
              <input
                type="range"
                min={10000}
                max={200000}
                step={10000}
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF5F56]"
              />
              <div className="flex justify-between text-[11px] text-white/40 mt-1 font-mono">
                <span>10k / min (Normal)</span>
                <span>100k / min (Flash Sale)</span>
                <span>200k / min (Super Bowl Drop)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                <div className="text-xs text-white/40 mb-1">Checkout Response Time</div>
                <div className="text-2xl font-bold text-[#27C93F]">{latency} ms</div>
                <div className="text-[10px] text-[#27C93F]/80">Instant Edge Payment</div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                <div className="text-xs text-white/40 mb-1">Processed Throughput</div>
                <div className="text-2xl font-bold text-white">{throughput} /min</div>
                <div className="text-[10px] text-white/40">Zero Cart Drops</div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                <div className="text-xs text-white/40 mb-1">Order Completion Rate</div>
                <div className="text-2xl font-bold text-[#FFBD2E]">100.00%</div>
                <div className="text-[10px] text-[#FFBD2E]/80">0 Payment Errors</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Capabilities */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
              Built for Enterprise Retail Leadership
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-base">
              Security, international localization, and ERP integrations tailored to global brands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass rounded-2xl p-8 border border-white/10 hover:border-[#FF5F56]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/20 flex items-center justify-center text-[#FF5F56] mb-6">
                <Globe size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Multi-Storefront & Localization</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                Launch region-specific storefronts with local currencies, translated product descriptions, and automated cross-border duties (AvaTax).
              </p>
              <ul className="space-y-2 text-xs text-white/70">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>Centralized multi-store dashboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>Automated landed cost calculation</span>
                </li>
              </ul>
            </div>

            <div className="glass rounded-2xl p-8 border border-white/10 hover:border-[#FFBD2E]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/20 flex items-center justify-center text-[#FFBD2E] mb-6">
                <Lock size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">SOC-2 & PCI Level 1 Security</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                Enterprise security compliance including SOC-2 Type II audit, ISO 27001, PCI-DSS Level 1 card vaulting, and Okta Single Sign-On.
              </p>
              <ul className="space-y-2 text-xs text-white/70">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>Single Sign-On (SAML/Okta)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>Role-based access control (RBAC)</span>
                </li>
              </ul>
            </div>

            <div className="glass rounded-2xl p-8 border border-white/10 hover:border-[#27C93F]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/20 flex items-center justify-center text-[#27C93F] mb-6">
                <Headphones size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Dedicated E-Commerce Team</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                Direct Slack channel with your dedicated E-Commerce Solutions Architect, white-glove migration assistance, and 15-minute emergency SLA.
              </p>
              <ul className="space-y-2 text-xs text-white/70">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>24/7 Flash Sale War Room support</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#27C93F]" />
                  <span>Custom migration from Magento/Shopify Plus</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#FF5F56]/15 via-[#FFBD2E]/10 to-[#27C93F]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Ready to upgrade your enterprise platform?
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Schedule an enterprise architecture review with our team.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Talk to Enterprise E-Commerce Architect
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
