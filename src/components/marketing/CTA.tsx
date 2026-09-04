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
        'max-w-5xl mx-auto transition-all duration-700',
        inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      )}>
        <div className="relative rounded-3xl overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0B0D1B] via-[#131629] to-[#1E122C]" />
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FFBD2E]/60 to-transparent" />
          
          {/* Glowing orbs */}
          <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-[#FF5F56]/25 blur-3xl" />
          <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-[#27C93F]/20 blur-3xl" />

          {/* Content */}
          <div className="relative z-10 text-center px-8 py-16 sm:py-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#FFBD2E]/40 bg-[#FFBD2E]/10 text-[#FFBD2E] text-xs font-medium mb-6">
              <Zap size={12} fill="currentColor" />
              No credit card required
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-5 leading-tight">
              Your store is{' '}
              <span className="text-gradient">one click</span>
              <br />
              away from launch
            </h2>

            <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
              Join 2.1 million merchants who chose Nexus to power their business. Start your 14-day free trial today — no card, no commitment, no limits.
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
                Start your free trial
              </Button>
              <Button
                variant="secondary"
                size="xl"
                onClick={() => navigate('login')}
                className="rounded-xl border-white/20"
              >
                View live demo
              </Button>
            </div>

            <p className="mt-6 text-sm text-white/30">
              14-day free trial · No credit card · Full access to all Pro features
            </p>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
              {[
                { icon: '🔒', label: 'PCI DSS Level 1', target: 'terms' as const },
                { icon: '🛡️', label: 'SOC 2 Type II', target: 'terms' as const },
                { icon: '⚡', label: '99.99% Uptime', target: 'status-page' as const },
                { icon: '🌍', label: 'GDPR Compliant', target: 'privacy' as const },
              ].map(badge => (
                <button 
                  key={badge.label} 
                  onClick={() => navigate(badge.target)}
                  className="flex items-center gap-2 text-xs text-white/40 hover:text-[#FFBD2E] transition-colors cursor-pointer"
                >
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
