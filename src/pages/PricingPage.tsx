import { useState } from 'react';
import { 
  ArrowRight, ChevronDown, ChevronUp, 
  Zap, CheckCircle2
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';
import { usePlansQuery } from '../hooks/useBillingQueries';
import { formatCurrency, formatCurrencyCompact } from '../utils/money';

/*
 * The "Find Your Plan" slider, in naira.
 *
 * Every figure here was on a dollar scale — a ₦2,000 to ₦300,000 range with
 * tier breaks at 10k/50k/200k — which was invisible while the readout printed
 * a "$", and nonsense the moment it printed a "₦": it offered an Enterprise
 * seller a ceiling of ₦300,000 of monthly sales, about two Pro subscriptions.
 *
 * Rounded to naira figures a seller would recognise rather than converted
 * literally, since these are conversation-starters, not quotes.
 */
const GMV_MIN = 2_500_000;
const GMV_MAX = 400_000_000;
const GMV_STEP = 2_500_000;
const GMV_DEFAULT = 45_000_000;

/** Monthly sales above which each tier is the better fit. */
const GMV_FOR_GROWTH = 15_000_000;
const GMV_FOR_PRO = 65_000_000;
const GMV_FOR_ENTERPRISE = 250_000_000;

export function PricingPage() {
  const { navigate } = useApp();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [gmv, setGmv] = useState<number>(GMV_DEFAULT);
  const [staffSeats, setStaffSeats] = useState<number>(5);

  /*
   * The prices come from the rows that actually bill.
   *
   * This page hardcoded 29/79/199/499 and multiplied by 0.8 for annual. Three
   * things were wrong with that: the figures were a stale copy of an older
   * seed, so once the plans were repriced in naira the page advertised dollars
   * nobody would be charged; the currency symbol was a literal "$"; and the
   * annual price was invented by the browser instead of read from the plan —
   * against the "one pricing authority" rule this codebase holds everywhere
   * else.
   *
   * The array below keeps editorial copy only: wording, feature lists, which
   * card is highlighted. Money comes from the API.
   */
  const { data: livePlans, isLoading: plansLoading, isError: plansError } = usePlansQuery();

  const liveByCode = new Map((livePlans ?? []).map(lp => [lp.code, lp]));

  /*
   * The annual saving, derived rather than asserted. The old badge and FAQ
   * both promised "20%" while the plan rows encoded a different discount.
   */
  const sampleLive = (livePlans ?? [])[0];
  const annualSavingPercent =
    sampleLive && sampleLive.monthlyPrice > 0 && sampleLive.annualPrice < sampleLive.monthlyPrice
      ? Math.round((1 - sampleLive.annualPrice / sampleLive.monthlyPrice) * 100)
      : null;

  /*
   * The seller plans.
   *
   * Editorial copy only — no prices. The limits quoted in the feature lists
   * mirror the plans' real `maxProducts` / `maxTeamMembers`; the money is
   * fetched above. This page, the homepage and the database once disagreed
   * three ways — this page said Pro was $299, the homepage said $79, the
   * database charged $199 — and a seller could be billed a figure no page had
   * ever shown them.
   *
   * The feature lists are also off the store-builder pitch: "Online
   * Storefronts", POS register connections, social store sync, 99.99% *store*
   * uptime. Nexus is a marketplace — the platform owns the shopfront, the
   * checkout and the delivery rules — so a plan buys headroom, not a shop.
   */
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'For sellers putting their first products in front of buyers.',
      features: [
        'Up to 50 active listings',
        '2 Team Accounts',
        'Standard Sales Analytics',
        '1,000 Nexus IQ Tokens / mo',
        'Listed in the shared Nexus shopfront',
        'Checkout, delivery & payouts run for you',
        'Standard Email Support',
      ],
      cta: 'Start 14-Day Free Trial',
      highlighted: false,
    },
    {
      id: 'growth',
      name: 'Growth',
      description: 'For sellers with steady order volume and a growing catalogue.',
      features: [
        'Up to 500 active listings',
        '5 Team Accounts',
        'Advanced Analytics & Sales Export',
        '10,000 Nexus IQ Tokens / mo',
        'Low-stock & restock alerts',
        'Fulfilment & shipment tracking',
        '24/7 Priority Seller Support',
      ],
      cta: 'Start 14-Day Free Trial',
      highlighted: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For established catalogues that need room and answers fast.',
      features: [
        'Up to 2,500 active listings',
        '15 Team Accounts',
        'Custom Report Builder & Sales Export',
        '100,000 Nexus IQ Tokens / mo',
        'Margin & repricing guidance',
        'Multi-Warehouse Inventory Sync',
        'Dedicated Account Manager',
      ],
      cta: 'Start 14-Day Free Trial',
      highlighted: true,
      badge: 'Most Popular for Sellers',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For high-volume, wholesale and distributor-scale selling.',
      features: [
        'Up to 10,000 active listings',
        '50 Team Accounts',
        'Unlimited Nexus IQ',
        'Custom Data Warehouse & ERP Sync',
        'Dedicated Solutions Architect',
        'Advanced Security & Compliance',
        // Was '99.99% Platform Uptime SLA'. Section 5 of the Terms states
        // there is no uptime guarantee on current plans; selling one as a
        // plan feature would contradict the contract it is sold under.
        'Priority Support with a Named Contact',
      ],
      cta: 'Talk to Enterprise Sales',
      highlighted: false,
    },
  ];

  /*
   * Which plan the sliders point at.
   *
   * The seat thresholds are the plans' real `maxTeamMembers` limits — 2, 5, 15
   * — so the recommendation cannot suggest a plan that would not hold the team
   * the visitor just described.
   */
  const getRecommendedPlan = () => {
    if (gmv > GMV_FOR_ENTERPRISE || staffSeats > 15) return 'Enterprise';
    if (gmv > GMV_FOR_PRO || staffSeats > 5) return 'Pro';
    if (gmv > GMV_FOR_GROWTH || staffSeats > 2) return 'Growth';
    return 'Starter';
  };

  const recommended = getRecommendedPlan();

  const faqs = [
    {
      q: 'Can I change my plan or cancel at any time?',
      a: 'Yes, absolutely. You can upgrade, downgrade, or cancel your seller subscription at any time directly from your seller dashboard with zero penalty or cancellation fees.',
    },
    {
      q: 'What is included in the 14-day free trial?',
      a: 'Full access to everything a Pro seller gets: unlimited listings for the duration, the whole catalogue and inventory side of the dashboard, orders and fulfilment, analytics, and Nexus IQ. No credit card is required to start, and nothing is charged until the trial ends.',
    },
    {
      q: 'Do I need to set up a payment gateway?',
      a: 'No. Nexus runs the checkout for every seller, so there is no gateway to register, configure or maintain — shoppers pay by card, bank transfer or wallet through our payment partners, and your dashboard shows what cleared and when it was paid out. Processing is handled by the platform rather than billed to you on top of your plan.',
    },
    {
      q: 'How do annual billing discounts work?',
      a: 'Annual billing is charged once for the year and costs less than the monthly plan on every tier. The exact figures are on the cards above — switch the toggle to compare them.',
    },
    {
      q: 'What happens when I pass my plan’s included AI tokens?',
      a: 'Nexus IQ keeps working. Your plan’s token figure is what is included in the price, not a switch that cuts the assistant off mid-month — usage past it is simply metered and shown in your dashboard, and we talk to you before anything is billed on top.',
    },
    {
      q: 'Do I get a shop of my own?',
      a: 'No, and that is the point. Your products are listed in the one shared Nexus shopfront where shoppers already browse. There are no themes to pick, no checkout to configure and no traffic to buy — that side of it is ours to run.',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-primary">
      <Navbar />
      {/* The Navbar's skip link targets #main. */}
      <main id="main" tabIndex={-1}>

      {/* Hero Header */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[380px] bg-gradient-to-r from-[#FF5F56]/15 via-[#FFBD2E]/15 to-[#27C93F]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FFBD2E]/40 bg-[#FFBD2E]/10 text-[var(--brand-yellow-ink)] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <Zap size={16} />
            <span>Transparent Seller Pricing</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-secondary">No hidden transaction fees</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Predictable plans for <br />
            <span className="text-gradient">every size of catalogue.</span>
          </h1>

          <p className="text-lg sm:text-xl text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Start free for 14 days. Move up when your catalogue grows, not when your sales do. Every
            plan lists into the shared Nexus shopfront, with the checkout, delivery and payouts run
            for you — and Nexus IQ included.
          </p>

          <div className="inline-flex items-center gap-3 p-1.5 bg-[var(--ink)]/5 rounded-2xl border border-[var(--ink)]/10 backdrop-blur-md">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                billingCycle === 'monthly'
                  ? 'bg-[var(--ink)]/20 text-primary shadow-md'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                billingCycle === 'annual'
                  ? 'bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-black shadow-md font-bold'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-2 py-0.5 rounded-full bg-[var(--surface-3)] text-[var(--brand-green-ink)] text-[10px] uppercase tracking-wider font-extrabold">
                {annualSavingPercent !== null ? `Save ${annualSavingPercent}%` : 'Best value'}
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
              const live = liveByCode.get(plan.id);
              // What this card actually charges on the selected cycle.
              const amount = live
                ? billingCycle === 'annual'
                  ? live.annualPrice
                  : live.monthlyPrice
                : null;

              return (
                <div
                  key={plan.id}
                  className={`glass rounded-3xl p-8 border transition flex flex-col justify-between relative ${
                    plan.highlighted
                      ? 'border-[#FFBD2E]/60 shadow-2xl bg-gradient-to-b from-[#FFBD2E]/10 via-[var(--surface-sunken)] to-[var(--surface-sunken)] scale-[1.03]'
                      : 'border-[var(--ink)]/10 hover:border-[var(--ink)]/25'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF5F56] to-[#FFBD2E] text-black text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                      {plan.badge}
                    </span>
                  )}

                  <div>
                    <h3 className="text-2xl font-bold text-primary mb-2">{plan.name}</h3>
                    <p className="text-xs text-muted mb-6 min-h-[36px]">{plan.description}</p>

                    <div className="mb-6 pb-6 border-b border-[var(--ink)]/10">
                      {/*
                        `min-w-0` plus wrapping, and a price that scales with the
                        card instead of a fixed 5xl. A naira figure is far longer
                        than the dollar one this was built for: "₦450,000" at
                        text-5xl overflowed the card and pushed the "/ year" unit
                        outside its rounded border entirely.
                      */}
                      <div className="min-w-0">
                        <div className="text-[clamp(1.65rem,3.4vw,2.5rem)] font-extrabold text-primary tabular-nums leading-none">
                          {amount !== null
                            ? formatCurrency(amount)
                            : plansLoading
                              ? '—'
                              : 'Unavailable'}
                        </div>
                        {amount !== null && (
                          <div className="text-xs text-muted mt-1.5">
                            per {billingCycle === 'annual' ? 'year' : 'month'}
                          </div>
                        )}
                      </div>
                      {/* What committing for the year actually saves, read off
                          the two prices rather than computed from one of them. */}
                      {billingCycle === 'annual' && live && live.monthlyPrice > live.annualPrice && (
                        <div className="text-[11px] text-[var(--brand-green-ink)] font-semibold mt-2">
                          Saves {formatCurrency(live.monthlyPrice - live.annualPrice)} vs monthly
                        </div>
                      )}
                      {plansError && (
                        <div className="text-[11px] text-muted font-semibold mt-1">
                          Prices could not be loaded. Please refresh.
                        </div>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8 text-xs text-strong">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2.5">
                          <CheckCircle2 size={16} className="text-[var(--brand-green-ink)] shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    variant={plan.highlighted ? 'primary' : 'outline'}
                    size="md"
                    className={`w-full py-3.5 rounded-xl font-bold ${
                      plan.highlighted ? 'bg-gradient-to-r from-[#FFBD2E] to-[#FF5F56] text-black' : 'border-[var(--ink)]/20 hover:border-[var(--ink)]/40'
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
      <section className="py-20 bg-[var(--surface-base)]/90 border-t border-b border-[var(--ink)]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4">
              Find Your Plan
            </h2>
            <p className="text-secondary max-w-2xl mx-auto text-sm sm:text-base">
              Slide your estimated monthly sales and team size to see which seller plan fits.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-10 border border-[var(--ink)]/10 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-strong">Estimated Monthly Sales (GMV):</label>
                    <span className="text-xl font-bold text-[var(--brand-yellow-ink)]">
                      {formatCurrencyCompact(gmv)} / mo
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Monthly sales volume"
                    min={GMV_MIN}
                    max={GMV_MAX}
                    step={GMV_STEP}
                    value={gmv}
                    onChange={(e) => setGmv(Number(e.target.value))}
                    className="w-full h-2 bg-[var(--ink)]/10 rounded-lg appearance-none cursor-pointer accent-[#FFBD2E]"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-strong">Staff Team Accounts Needed:</label>
                    <span className="text-xl font-bold text-[var(--brand-green-ink)]">
                      {staffSeats} accounts
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Staff accounts"
                    min={1}
                    max={30}
                    step={1}
                    value={staffSeats}
                    onChange={(e) => setStaffSeats(Number(e.target.value))}
                    className="w-full h-2 bg-[var(--ink)]/10 rounded-lg appearance-none cursor-pointer accent-[#27C93F]"
                  />
                </div>
              </div>

              <div className="md:col-span-5 glass rounded-2xl p-6 border border-[#FFBD2E]/40 bg-[var(--surface-sunken)] text-center">
                <div className="text-xs text-muted uppercase font-mono mb-1">Recommended Seller Plan</div>
                <div className="text-3xl font-extrabold text-primary mb-2">{recommended} Plan</div>
                <div className="text-xs text-[var(--brand-green-ink)] font-semibold mb-4">
                  Fits your {formatCurrencyCompact(gmv)} GMV & {staffSeats} staff seats.
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
            <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-secondary text-sm sm:text-base">
              Got questions about seller billing or what a plan includes? We’ve got answers.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="glass rounded-2xl border border-[var(--ink)]/10 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-[var(--ink)]/[0.02] transition-colors"
                >
                  <span className="font-semibold text-primary text-base sm:text-lg">{faq.q}</span>
                  {openFaq === idx ? (
                    <ChevronUp size={20} className="text-[var(--brand-yellow-ink)] shrink-0" />
                  ) : (
                    <ChevronDown size={20} className="text-muted shrink-0" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-6 text-sm text-secondary leading-relaxed border-t border-[var(--ink)]/5 pt-4">
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
          <h2 className="text-4xl sm:text-5xl font-extrabold text-primary mb-6">
            List your first product free
          </h2>
          <p className="text-secondary text-lg mb-8 max-w-xl mx-auto">
            Fourteen days of the full seller dashboard, zero risk, no credit card required.
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
      </main>

      <Footer />
    </div>
  );
}
