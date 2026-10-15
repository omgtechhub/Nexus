import { ArrowRight, Zap } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

export function CTA() {
  const { navigate } = useApp();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

  return (
    <section className="py-24 px-4 sm:px-6" ref={ref}>
      <div className={cn(
        'max-w-5xl mx-auto transition-colors duration-700',
        inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      )}>
        {/* The panel is near-black on a near-black page in dark mode, where the
            glow and the top hairline carry the edge. On a light page those
            disappear, so it needs a real border and a lift. */}
        <div className="relative rounded-3xl overflow-hidden border border-[var(--ink)]/10 shadow-[0_1px_2px_rgb(11_13_27_/_0.04),0_24px_60px_rgb(11_13_27_/_0.08)] dark:shadow-none">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface-base)] via-[var(--surface-1)] to-[var(--surface-accent)]" />
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FFBD2E]/60 to-transparent" />
          
          {/* Glowing orbs */}
          <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-[#FF5F56]/25 blur-3xl" />
          <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-[#27C93F]/20 blur-3xl" />

          {/* Content */}
          <div className="relative z-10 text-center px-8 py-16 sm:py-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#FFBD2E]/40 bg-[#FFBD2E]/10 text-[var(--brand-yellow-ink)] text-xs font-medium mb-6">
              <Zap size={12} fill="currentColor" />
              No credit card required
            </div>

            {/* The headline used to read "Your store is one click away from
                launch", which promised sellers a shopfront of their own to set
                up. Nexus is a marketplace: a seller lists products and the
                platform brings the shoppers, so the ask is to start selling,
                not to start building. */}
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-primary mb-5 leading-tight">
              Start selling{' '}
              <span className="text-gradient">your products</span>
              <br />
              today
            </h2>

            <p className="text-lg text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
              Join 2.1 million sellers reaching customers on Nexus. Create your seller account, list your first product and take orders today — no card, no commitment, no setup.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="primary"
                size="xl"
                onClick={() => navigate('signup')}
                icon={<ArrowRight size={20} />}
                iconPosition="right"
                className="rounded-xl"
              >
                Start selling free
              </Button>
              <Button
                variant="secondary"
                size="xl"
                onClick={() => navigate('login')}
                className="rounded-xl border-[var(--ink)]/20"
              >
                Sign in to sell
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted">
              14-day free trial · No credit card · List as many products as you like
            </p>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
              {/* Static badges. These used to be buttons leading to /terms,
                  /privacy and a status page; the status page no longer exists,
                  and a compliance claim is a statement rather than a
                  navigation affordance either way. */}
              {[
                { icon: '🔒', label: 'PCI DSS Level 1' },
                { icon: '🛡️', label: 'SOC 2 Type II' },
                { icon: '⚡', label: '99.99% Uptime' },
                { icon: '🌍', label: 'GDPR Compliant' },
              ].map(badge => (
                <span
                  key={badge.label}
                  className="flex items-center gap-2 text-xs text-muted"
                >
                  <span aria-hidden="true">{badge.icon}</span>
                  <span>{badge.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
