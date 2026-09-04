import { useInView } from 'react-intersection-observer';
import {
  Store, CreditCard, BarChart3, Globe, Smartphone, ShieldCheck,
  Package, Zap, Users, Headphones, Palette, GitBranch
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useApp } from '../../context/AppContext';

const mainFeatures = [
  {
    icon: <Store size={24} />,
    title: 'Stunning Online Stores',
    description: 'Design with AI or choose from 150+ premium themes. Every store is fast, beautiful, and built to convert.',
    color: 'emerald',
    tag: 'Store Builder',
    target: 'online-store' as const,
  },
  {
    icon: <CreditCard size={24} />,
    title: 'Nexus Payments',
    description: 'Accept every payment globally. Stripe, PayPal, crypto, BNPL — zero setup, lowest rates in the industry.',
    color: 'blue',
    tag: 'Payments',
    target: 'payments' as const,
  },
  {
    icon: <BarChart3 size={24} />,
    title: 'AI Analytics & Insights',
    description: 'Know exactly what\'s working. Real-time dashboards with AI predictions for inventory, pricing, and trends.',
    color: 'purple',
    tag: 'Analytics',
    target: 'ai-assistant' as const,
  },
  {
    icon: <Globe size={24} />,
    title: 'Global Commerce',
    description: 'Sell in 175+ countries with multi-currency, localized checkout, and automated tax compliance.',
    color: 'amber',
    tag: 'International',
    target: 'international' as const,
  },
  {
    icon: <Smartphone size={24} />,
    title: 'Point of Sale',
    description: 'Unify online and in-store. Take your store anywhere with our sleek POS hardware and app.',
    color: 'pink',
    tag: 'POS',
    target: 'pos' as const,
  },
  {
    icon: <ShieldCheck size={24} />,
    title: 'Enterprise Security',
    description: 'PCI DSS Level 1, SOC 2 Type II, and 99.99% uptime SLA. Your data, protected at every layer.',
    color: 'red',
    tag: 'Security',
    target: 'terms' as const,
  },
];

const additionalFeatures = [
  { icon: <Package size={18} />, title: 'Inventory Management', desc: 'Smart stock tracking and forecasting', target: 'shipping' as const },
  { icon: <Zap size={18} />, title: 'Marketing Automation', desc: 'Email flows, SMS, and ad integrations', target: 'ai-assistant' as const },
  { icon: <Users size={18} />, title: 'Customer Profiles', desc: 'Full CRM built-in, no extras needed', target: 'd2c' as const },
  { icon: <Headphones size={18} />, title: '24/7 Support', desc: 'Expert help whenever you need it', target: 'help-center' as const },
  { icon: <Palette size={18} />, title: 'Theme Customization', desc: 'Drag-and-drop or full code control', target: 'online-store' as const },
  { icon: <GitBranch size={18} />, title: 'Developer APIs', desc: 'GraphQL & REST for any integration', target: 'docs' as const },
];

const colorMap: Record<string, string> = {
  emerald: 'from-[#27C93F]/20 to-[#27C93F]/5 border-[#27C93F]/30 text-[#27C93F]',
  blue: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 text-cyan-400',
  purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
  amber: 'from-[#FFBD2E]/20 to-[#FFBD2E]/5 border-[#FFBD2E]/30 text-[#FFBD2E]',
  pink: 'from-pink-500/20 to-pink-600/5 border-pink-500/30 text-pink-400',
  red: 'from-[#FF5F56]/20 to-[#FF5F56]/5 border-[#FF5F56]/30 text-[#FF5F56]',
};

function FeatureCard({ feature, index }: { feature: typeof mainFeatures[0]; index: number }) {
  const { navigate } = useApp();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const colors = colorMap[feature.color];

  return (
    <div
      ref={ref}
      onClick={() => navigate(feature.target)}
      className={cn(
        'glass rounded-2xl p-6 card-hover border border-white/5 transition-all duration-700 cursor-pointer group',
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
      )}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className={cn(
        'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 border',
        colors
      )}>
        {feature.icon}
      </div>
      <div className="text-xs font-medium text-white/30 uppercase tracking-wider mb-2">{feature.tag}</div>
      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[#FFBD2E] transition-colors">{feature.title}</h3>
      <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
    </div>
  );
}

export function Features() {
  const { navigate } = useApp();
  const { ref: headerRef, inView: headerInView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div
          ref={headerRef}
          className={cn(
            'text-center max-w-3xl mx-auto mb-16 transition-all duration-700',
            headerInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#FFBD2E]/30 bg-[#FFBD2E]/10 text-[#FFBD2E] text-xs font-medium mb-5">
            <Zap size={12} fill="currentColor" />
            Everything you need
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
            The complete commerce
            <span className="text-gradient"> operating system</span>
          </h2>
          <p className="text-lg text-white/50 leading-relaxed">
            One platform to build, manage, and scale your business. No duct tape. No missing features. Everything connected.
          </p>
        </div>

        {/* Feature image showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <div 
            onClick={() => navigate('ai-assistant')}
            className="relative rounded-2xl overflow-hidden border border-white/10 group cursor-pointer"
          >
            <img src="images/feature-analytics.jpg" alt="Analytics" className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D1B] via-[#0B0D1B]/30 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5F56]/20 border border-[#FF5F56]/30 text-[#FF5F56] text-xs font-medium mb-2">
                <BarChart3 size={12} /> NexusIQ Analytics
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-[#FFBD2E] transition-colors">AI-powered business intelligence</h3>
              <p className="text-sm text-white/50 mt-1">Predict trends, optimize pricing, and find growth opportunities automatically.</p>
            </div>
          </div>

          <div 
            onClick={() => navigate('online-store')}
            className="relative rounded-2xl overflow-hidden border border-white/10 group cursor-pointer"
          >
            <img src="images/feature-commerce.jpg" alt="Commerce" className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D1B] via-[#0B0D1B]/30 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#27C93F]/20 border border-[#27C93F]/30 text-[#27C93F] text-xs font-medium mb-2">
                <Store size={12} /> Store Builder
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-[#FFBD2E] transition-colors">Checkout that converts up to 50% more</h3>
              <p className="text-sm text-white/50 mt-1">World's fastest, most trusted checkout experience — Shop Pay included.</p>
            </div>
          </div>
        </div>

        {/* Main feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {mainFeatures.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        {/* Additional features */}
        <div className="glass rounded-2xl border border-white/5 p-8">
          <p className="text-center text-sm text-white/40 mb-6 font-medium uppercase tracking-wider">And much more</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {additionalFeatures.map(feat => (
              <div key={feat.title} onClick={() => navigate(feat.target)} className="text-center group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-white/40 group-hover:text-[#FFBD2E] group-hover:border-[#FFBD2E]/30 transition-all">
                  {feat.icon}
                </div>
                <p className="text-xs font-medium text-white/70 group-hover:text-white transition-colors">{feat.title}</p>
                <p className="text-xs text-white/30 mt-0.5">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
