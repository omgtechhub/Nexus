import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap, Star } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { pricingPlans } from '../../data/marketingContent';
import { usePlansQuery } from '../../hooks/useBillingQueries';
import { formatCurrency } from '../../utils/money';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

export function Pricing() {
  const { navigate } = useApp();
  const [annual, setAnnual] = useState(false);

  const { data: livePlans } = usePlansQuery();
  const livePricing = new Map((livePlans ?? []).map(lp => [lp.code, lp]));

  const samplePlan = (livePlans ?? [])[0];
  const annualSavingPercent =
    samplePlan && samplePlan.monthlyPrice > 0 && samplePlan.annualPrice < samplePlan.monthlyPrice
      ? Math.round((1 - samplePlan.annualPrice / samplePlan.monthlyPrice) * 100)
      : null;
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.05 });

  return (
    <section id="pricing" className="py-24 relative" ref={ref}>
      <div className="absolute inset-0 bg-radial-glow opacity-50" />

      <div className={cn(
        'relative max-w-7xl mx-auto px-4 sm:px-6 transition-colors duration-700',
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      )}>
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#FFBD2E]/30 bg-[#FFBD2E]/10 text-[var(--brand-yellow-ink)] text-xs font-medium mb-5">
            <Zap size={12} fill="currentColor" />
            Simple, transparent pricing
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-primary mb-4">
            Start free, scale with
            <span className="text-gradient"> confidence</span>
          </h2>
          <p className="text-muted max-w-xl mx-auto mb-8">
            Every plan comes with a 14-day free trial. No credit card required. Upgrade, downgrade, or cancel anytime.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 glass rounded-full p-1.5 border border-[var(--ink)]/10">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                'px-5 py-2 rounded-full text-sm font-medium transition-colors',
                !annual ? 'bg-gradient-to-r from-[#FF5F56] to-[#FFBD2E] text-white shadow-lg font-semibold' : 'text-muted hover:text-primary'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                'px-5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2',
                annual ? 'bg-gradient-to-r from-[#FFBD2E] to-[#27C93F] text-white shadow-lg font-semibold' : 'text-muted hover:text-primary'
              )}
            >
              Annual
              {/* Derived, not asserted: this said a flat -20% while the plans
                  encoded a different gap between monthly and annual. */}
              {annualSavingPercent !== null && (
                <span className="text-xs bg-[#27C93F] text-slate-950 px-1.5 py-0.5 rounded-full font-bold">
                  -{annualSavingPercent}%
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plans */}
        {/*
          Prices come from the rows that bill, matched to the copy below by id.
          `marketingContent.ts` carried its own 29/24/79/66/199/166/499/416 in
          dollars, so the homepage advertised a different price from the pricing
          page AND from the database — the exact drift its own header comment
          warns about.
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {pricingPlans.map((plan, index) => (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-2xl p-6 border transition-colors duration-300',
                plan.highlighted
                  ? 'bg-gradient-to-b from-[#FF5F56]/15 via-[var(--surface-1)] to-[var(--surface-base)] border-[#FFBD2E]/50 shadow-2xl shadow-red-900/30 scale-105 z-10'
                  : 'glass border-[var(--ink)]/10 hover:border-[var(--ink)]/20'
              )}
              style={{ transitionDelay: `${index * 60}ms` }}
            >
              {/* Glow effect for highlighted */}
              {plan.highlighted && (
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#FF5F56]/30 via-[#FFBD2E]/10 to-transparent opacity-60 pointer-events-none" />
              )}

              {plan.badge && (
                <div className={cn(
                  'absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold',
                  plan.highlighted
                    ? 'bg-gradient-to-r from-[#FF5F56] to-[#FFBD2E] text-white shadow-lg shadow-red-900/50'
                    : 'bg-[var(--ink)]/20 text-primary'
                )}>
                  {plan.badge === 'Best Value' && <Star size={10} className="inline mr-1" fill="currentColor" />}
                  {plan.badge}
                </div>
              )}

              <div className="relative z-10">
                <h3 className="text-lg font-bold text-primary mb-1">{plan.name}</h3>
                <p className="text-xs text-muted mb-5">{plan.description}</p>

                <div className="mb-6">
                  <div className="min-w-0">
                    <div className="text-[clamp(1.5rem,2.6vw,2.25rem)] font-extrabold text-primary tabular-nums leading-none">
                      {livePricing.get(plan.id)
                        ? formatCurrency(
                            annual
                              ? livePricing.get(plan.id)!.annualPrice
                              : livePricing.get(plan.id)!.monthlyPrice
                          )
                        : '—'}
                    </div>
                    <div className="text-muted text-xs mt-1.5">per {annual ? 'year' : 'month'}</div>
                  </div>
                  {annual && livePricing.get(plan.id) && (
                    <div className="text-xs text-[var(--brand-green-ink)] mt-2 font-medium">
                      Saves{' '}
                      {formatCurrency(
                        livePricing.get(plan.id)!.monthlyPrice - livePricing.get(plan.id)!.annualPrice
                      )}{' '}
                      vs monthly
                    </div>
                  )}
                </div>

                <Button
                  variant={plan.highlighted ? 'primary' : 'secondary'}
                  size="md"
                  fullWidth
                  onClick={() => navigate('signup')}
                  className="mb-6"
                >
                  {plan.cta}
                </Button>

                <ul className="space-y-2.5">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <div className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                        plan.highlighted
                          ? 'bg-[#27C93F]/20 text-[var(--brand-green-ink)]'
                          : 'bg-[var(--ink)]/10 text-muted'
                      )}>
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span className={plan.highlighted ? 'text-strong' : 'text-muted'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise note */}
        <div className="mt-10 text-center">
          <p className="text-sm text-muted">
            Need a custom solution?{' '}
            {/* A link, not a button. It goes to a page, so it has to behave
                like every other link on the site: a real href the browser can
                show on hover, middle-click into a new tab, or copy. The button
                it replaced routed correctly but offered none of that. */}
            <Link
              to="/contact"
              className="rounded text-[var(--brand-yellow-ink)] underline underline-offset-2 transition-colors hover:text-[var(--brand-green-ink)] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
            >
              Talk to our sales team
            </Link>{' '}
            — we'll build a plan that fits perfectly.
          </p>
        </div>
      </div>
    </section>
  );
}
