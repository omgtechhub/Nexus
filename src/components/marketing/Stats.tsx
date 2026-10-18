import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { Wallet, ShieldCheck, Layers, RotateCcw } from 'lucide-react';

/**
 * Facts about the product, not invented scale.
 *
 * This section used to read "$200B+ in merchant revenue", "2.1M+ active
 * merchants", "175+ countries", "99.99% uptime guaranteed" and "50% higher
 * conversions vs. standard checkout" under the heading "Trusted by millions,
 * proven at scale" — on a platform that has not launched. Two of those are
 * quantified performance and availability claims, which is advertising a
 * buyer can rely on and a regulator can act on; the uptime figure also
 * contradicted the Terms, which now state plainly that there is no uptime
 * guarantee.
 *
 * Each number below is checkable against the code: commission defaults to
 * zero, card details are entered with the payment provider and never reach
 * our servers, there are four plan tiers, and the 14-day annual refund
 * window is the one written into section 3 of the Terms. Replace any of
 * these only with something equally checkable.
 */
const stats = [
  {
    icon: <Wallet size={28} />,
    prefix: '',
    value: 0,
    suffix: '%',
    label: 'Commission on your sales',
    description: 'Subscriptions fund the platform, not a cut of your revenue',
    color: 'emerald',
  },
  {
    icon: <ShieldCheck size={28} />,
    prefix: '',
    value: 0,
    suffix: '',
    label: 'Card numbers we store',
    description: 'Card details are entered with our payment provider, never on Nexus',
    color: 'blue',
  },
  {
    icon: <Layers size={28} />,
    prefix: '',
    value: 4,
    suffix: '',
    label: 'Plans, priced in naira',
    description: 'Starter to Enterprise, monthly or annual',
    color: 'purple',
  },
  {
    icon: <RotateCcw size={28} />,
    prefix: '',
    value: 14,
    suffix: ' days',
    label: 'To change your mind',
    description: 'Full refund on a new annual plan, no questions',
    color: 'amber',
  },
];

const colorClasses = {
  emerald: { bg: 'bg-[#27C93F]/10', border: 'border-[#27C93F]/30', text: 'text-[var(--brand-green-ink)]', glow: 'shadow-[#27C93F]/20' },
  blue: { bg: 'bg-[#FF5F56]/10', border: 'border-[#FF5F56]/30', text: 'text-[var(--brand-red-ink)]', glow: 'shadow-[#FF5F56]/20' },
  purple: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
  amber: { bg: 'bg-[#FFBD2E]/10', border: 'border-[#FFBD2E]/30', text: 'text-[var(--brand-yellow-ink)]', glow: 'shadow-[#FFBD2E]/20' },
};

export function Stats() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-radial-glow opacity-60" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6" ref={ref}>
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4">
            Built so the terms
            <span className="text-gradient"> match the product</span>
          </h2>
          <p className="text-muted max-w-xl mx-auto">
            Four numbers you can hold us to. Every one of them is in our Terms.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => {
            const colors = colorClasses[stat.color as keyof typeof colorClasses];
            return (
              <div
                key={stat.label}
                className={`relative rounded-2xl p-8 border ${colors.border} ${colors.bg} backdrop-blur-sm text-center group hover:shadow-lg ${colors.glow} transition-colors duration-300`}
                style={{ transitionDelay: `${idx * 80}ms` }}
              >
                <div className={`w-14 h-14 rounded-2xl ${colors.bg} border ${colors.border} flex items-center justify-center mx-auto mb-5 ${colors.text} group-hover:scale-110 transition-transform duration-300`}>
                  {stat.icon}
                </div>
                <div className={`text-4xl font-extrabold mb-1 ${colors.text}`}>
                  {inView ? (
                    <>
                      {stat.prefix}
                      <CountUp
                        end={stat.value}
                        duration={2.5}
                        decimals={0}
                        delay={idx * 0.2}
                      />
                      {stat.suffix}
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </div>
                <div className="text-base font-semibold text-primary mb-1">{stat.label}</div>
                <div className="text-xs text-muted">{stat.description}</div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
