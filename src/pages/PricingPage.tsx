import { useState } from 'react';
import { 
  Check, ArrowRight, Sparkles, HelpCircle, ChevronDown, ChevronUp, 
  Zap, Shield, Calculator, CheckCircle2, Star, ShoppingBag
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function PricingPage() {
  const { navigate } = useApp();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [gmv, setGmv] = useState<number>(35000);
  const [staffSeats, setStaffSeats] = useState<number>(5);

  const discountMultiplier = billingCycle === 'annual' ? 0.8 : 1;

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Ideal for new merchants launching their first online storefront.',
      monthlyPrice: 29,
      features: [
        '1 Online Storefront',
        '2 Staff Accounts',
        'Basic Store Analytics & Reports',
        '2.9% + 30¢ Credit Card Processing',
        '1,000 NexusIQ AI Store Tokens / mo',
        '1 Physical POS Register Connection',
        'Standard Email Support',
      ],
      cta: 'Start 14-Day Free Trial',
      highlighted: false,
    },
    {
      id: 'growth',
      name: 'Growth',
      description: 'Perfect for expanding brands scaling sales and retail channels.',
      monthlyPrice: 79,
      features: [
        '3 Online Storefronts',
        '5 Staff Accounts',
        'Advanced Sales & Customer Segmentation',
        '2.4% + 20¢ Credit Card Processing',
        '10,000 NexusIQ AI Store Tokens / mo',
        '3 Physical POS Register Connections',
        '24/7 Priority Merchant Support',
        'Social Media Store Sync (Instagram/TikTok)',
      ],
      cta: 'Start 14-Day Free Trial',
      highlighted: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For high-volume merchants demanding maximum speed & AI merchandising.',
      monthlyPrice: 299,
      features: [
        '10 Online Storefronts',
        '15 Staff Accounts',
        'Custom Report Builder & Sales Export',
        '2.1% + 15¢ Credit Card Processing',
        '100,000 NexusIQ AI Store Tokens / mo',
        'Unlimited POS Register Connections',
        'Dedicated Account Manager',
        'Multi-Warehouse Inventory Sync',
        '99.99% Store Uptime Guarantee',
      ],
      cta: 'Start 14-Day Free Trial',
      highlighted: true,
      badge: 'Most Popular for Brands',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Custom infrastructure & SLAs for global retail brands & B2B.',
      monthlyPrice: 'Custom',
      features: [
        'Unlimited Online Storefronts',
        'Unlimited Staff Accounts',
        'Custom Data Warehouse & ERP Sync',
        'Custom Negotiated Processing Rates',
        'Unlimited NexusIQ AI Store Tokens',
        'Dedicated Solutions Architect',
        'Landed Cost Duties & AvaTax Integration',
        '99.999% Enterprise Uptime SLA',
      ],
      cta: 'Talk to Enterprise Sales',
      highlighted: false,
    },
  ];

  const getRecommendedPlan = () => {
    if (gmv > 200000 || staffSeats > 15) return 'Enterprise';
    if (gmv > 50000 || staffSeats > 5) return 'Pro';
    if (gmv > 10000 || staffSeats > 2) return 'Growth';
    return 'Starter';
  };

  const recommended = getRecommendedPlan();

  const faqs = [
    {
      q: 'Can I change my plan or cancel at any time?',
      a: 'Yes, absolutely. You can upgrade, downgrade, or cancel your merchant subscription at any time directly from your store dashboard with zero penalty or cancellation fees.',
    },
    {
      q: 'What is included in the 14-day free trial?',
      a: 'During your 14-day free trial, you get full access to all Pro plan features, including store builder, product catalog management, NexusIQ AI, POS register simulation, and payment gateway setup. No credit card is required to start.',
    },
    {
      q: 'Are there any extra transaction fees when using Nexus Payments?',
      a: 'Nexus does not charge any additional platform fees when using Nexus Payments. You only pay standard competitive credit card processing rates (as low as 2.1% + 15¢). Third-party gateways incur a 0.5% fee.',
    },
    {
      q: 'How do annual billing discounts work?',
      a: 'When you choose annual billing, you pay upfront for 12 months and receive an instant 20% discount off the standard monthly rate across all merchant plans.',
    },
    {
      q: 'What happens when I exceed my monthly AI token limit?',
      a: 'If you exceed your plan’s included NexusIQ AI store tokens, you can top up add-on token packs starting at $10 for 50,000 additional tokens, or upgrade your plan tier.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Header */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[380px] bg-gradient-to-r from-[#FF5F56]/15 via-[#FFBD2E]/15 to-[#27C93F]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FFBD2E]/40 bg-[#FFBD2E]/10 text-[#FFBD2E] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <Zap size={16} />
            <span>Transparent Merchant Pricing</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-white/60">No hidden transaction fees</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Predictable plans for <br />
            <span className="text-gradient">every stage of e-commerce.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Start free for 14 days. Scale as your sales volume grows. All plans include global CDN, free SSL certificates, and NexusIQ AI integration.
          </p>

          <div className="inline-flex items-center gap-3 p-1.5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white/20 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                billingCycle === 'annual'
                  ? 'bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-black shadow-md font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-2 py-0.5 rounded-full bg-black/40 text-[#27C93F] text-[10px] uppercase tracking-wider font-extrabold">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan) => {
              const price = typeof plan.monthlyPrice === 'number'
                ? Math.round(plan.monthlyPrice * discountMultiplier)
                : plan.monthlyPrice;

              return (
                <div
                  key={plan.id}
                  className={`glass rounded-3xl p-8 border transition-all flex flex-col justify-between relative ${
                    plan.highlighted
                      ? 'border-[#FFBD2E]/60 shadow-2xl bg-gradient-to-b from-[#FFBD2E]/10 via-[#090b16] to-[#090b16] scale-[1.03]'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF5F56] to-[#FFBD2E] text-black text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                      {plan.badge}
                    </span>
                  )}

                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-xs text-white/50 mb-6 min-h-[36px]">{plan.description}</p>

                    <div className="mb-6 pb-6 border-b border-white/10">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl sm:text-5xl font-extrabold text-white">
                          {typeof price === 'number' ? `$${price}` : price}
                        </span>
                        {typeof price === 'number' && (
                          <span className="text-xs text-white/40">/ month</span>
                        )}
                      </div>
                      {billingCycle === 'annual' && typeof price === 'number' && (
                        <div className="text-[11px] text-[#27C93F] font-semibold mt-1">
                          Billed annually (${price * 12}/yr)
                        </div>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8 text-xs text-white/80">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2.5">
                          <CheckCircle2 size={16} className="text-[#27C93F] shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    variant={plan.highlighted ? 'primary' : 'outline'}
                    size="md"
                    className={`w-full py-3.5 rounded-xl font-bold ${
                      plan.highlighted ? 'bg-gradient-to-r from-[#FFBD2E] to-[#FF5F56] text-black' : 'border-white/20 hover:border-white/40'
                    }`}
                    onClick={() => navigate('signup')}
                  >
                    {plan.cta}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Merchant Plan Recommender Calculator */}
      <section className="py-20 bg-[#0B0D1B]/90 border-t border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Interactive Merchant Plan Recommender
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Slide your estimated monthly sales volume and team size to find your optimal merchant tier.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-10 border border-white/10 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-white/80">Estimated Monthly Store Sales (GMV):</label>
                    <span className="text-xl font-bold text-[#FFBD2E]">
                      ${gmv.toLocaleString()} / mo
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2000}
                    max={300000}
                    step={5000}
                    value={gmv}
                    onChange={(e) => setGmv(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFBD2E]"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-white/80">Staff Team Accounts Needed:</label>
                    <span className="text-xl font-bold text-[#27C93F]">
                      {staffSeats} accounts
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={staffSeats}
                    onChange={(e) => setStaffSeats(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#27C93F]"
                  />
                </div>
              </div>

              <div className="md:col-span-5 glass rounded-2xl p-6 border border-[#FFBD2E]/40 bg-[#090b16] text-center">
                <div className="text-xs text-white/40 uppercase font-mono mb-1">Recommended Merchant Plan</div>
                <div className="text-3xl font-extrabold text-white mb-2">{recommended} Plan</div>
                <div className="text-xs text-[#27C93F] font-semibold mb-4">
                  Fits your ${gmv.toLocaleString()} GMV & {staffSeats} staff seats.
                </div>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FFBD2E] to-[#27C93F] text-black font-bold"
                  onClick={() => navigate('signup')}
                >
                  Choose {recommended} Plan
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-white/60 text-sm sm:text-base">
              Got questions about merchant billing or store plans? We’ve got answers.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="glass rounded-2xl border border-white/10 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-semibold text-white text-base sm:text-lg">{faq.q}</span>
                  {openFaq === idx ? (
                    <ChevronUp size={20} className="text-[#FFBD2E] shrink-0" />
                  ) : (
                    <ChevronDown size={20} className="text-white/40 shrink-0" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-6 text-sm text-white/60 leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#FF5F56]/15 via-[#FFBD2E]/10 to-[#27C93F]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Start your 14-day free store trial
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Experience the full power of Nexus with zero risk and no credit card required.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-black font-bold"
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
