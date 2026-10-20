import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { TrendingUp, ShoppingCart, Globe2, Star } from 'lucide-react';

/**
 * The scale section, restored at David's instruction on 2026-10-20.
 *
 * These four figures are marketing claims, not values computed from the
 * database, and they were removed once before as unverifiable. They are back
 * by an explicit decision after being shown exactly what they say.
 *
 * Two things were NOT restored with them:
 *
 *  - The "Featured in & trusted by" strip naming TechCrunch, Forbes, Wired,
 *    The Verge, Fast Company and Entrepreneur. Naming real publications as
 *    having covered you is a different kind of claim from a round number.
 *
 *  - Nothing else on the page was changed to agree with the uptime line. The
 *    Terms still state there is no uptime guarantee and no service credits,
 *    so the two pages disagree. If the guarantee is meant to be real, section
 *    7 of the Terms is where it has to be written.
 */
const stats = [
  {
    icon: <TrendingUp size={28} />,
    prefix: '$',
    value: 200,
    suffix: 'B+',
    label: 'In merchant revenue',
    description: 'Powered by Nexus worldwide',
    color: 'emerald',
  },
  {
    icon: <ShoppingCart size={28} />,
    prefix: '',
    value: 2.1,
    decimals: 1,
    suffix: 'M+',
    label: 'Active merchants',
    description: 'In 175+ countries',
    color: 'blue',
  },
  {
    icon: <Globe2 size={28} />,
    prefix: '',
    value: 99.99,
    decimals: 2,
    suffix: '%',
    label: 'Uptime guaranteed',
    description: 'Enterprise-grade reliability',
    color: 'purple',
  },
  {
    icon: <Star size={28} />,
    prefix: '',
    value: 50,
    suffix: '%',
    label: 'Higher conversions',
    description: 'vs. standard checkout',
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
            Trusted by millions,
            <span className="text-gradient"> proven at scale</span>
          </h2>
          <p className="text-muted max-w-xl mx-auto">
            The numbers behind why the world's fastest-growing brands choose Nexus Commerce.
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
                        decimals={stat.decimals || 0}
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
