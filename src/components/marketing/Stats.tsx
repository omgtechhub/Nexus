import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { TrendingUp, ShoppingCart, Globe2, Star } from 'lucide-react';

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

        {/* Logos strip */}
        <div className="mt-16 text-center">
          <p className="text-xs text-muted uppercase tracking-widest mb-6 font-medium">Featured in & trusted by</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {['TechCrunch', 'Forbes', 'Wired', 'The Verge', 'Fast Company', 'Entrepreneur'].map(name => (
              <div key={name} className="text-muted hover:text-body transition-colors font-bold text-sm tracking-wide">
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
