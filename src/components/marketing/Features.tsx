import { useRef, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import {
  Package, CreditCard, Sparkles, Users, Truck, ShieldCheck,
  Boxes, Zap, ShoppingBag, Headphones, Receipt, LineChart
} from 'lucide-react';
import gsap from 'gsap';
import { cn } from '../../utils/cn';
import { getAssetUrl } from '../../utils/assetPath';

/**
 * Feature copy.
 *
 * Deliberately inert: each card used to navigate to a dedicated marketing page
 * (/online-store, /payments, /pos and so on), and those pages are gone. Rather
 * than leave cards that look clickable and land on the homepage, they are plain
 * descriptive content — so no `target`, no onClick, and none of the hover
 * affordances that imply a destination.
 *
 * The copy describes selling *on* Nexus, not building a shop with it. The
 * earlier set sold a store builder: 150+ themes, point of sale, theme
 * customisation, developer APIs. None of that exists in the product, and
 * promising a seller their own shopfront is the opposite of what a marketplace
 * offers them — the platform runs the shopfront, the checkout and the delivery,
 * and the seller brings the products.
 */
const mainFeatures = [
  {
    icon: <Package size={24} />,
    title: 'List in Minutes',
    description: 'Add a product, set your price, upload your photos. Your listing is live on the marketplace the moment you publish it.',
    color: 'emerald',
    tag: 'Listings',
  },
  {
    icon: <Users size={24} />,
    title: 'An Audience Already Here',
    description: 'No traffic to buy, no merchant to promote. Shoppers browsing Nexus find your products the day you list them.',
    color: 'blue',
    tag: 'Reach',
  },
  {
    icon: <Sparkles size={24} />,
    title: 'Nexus IQ',
    description: 'Your own analyst. What to restock, what to price differently, and which listings are about to run dry.',
    color: 'purple',
    tag: 'Nexus IQ',
  },
  {
    icon: <CreditCard size={24} />,
    title: 'Checkout We Run For You',
    description: 'Cards, transfers and wallets, handled by the platform. You never touch a gateway — you just get paid out.',
    color: 'amber',
    tag: 'Payments',
  },
  {
    icon: <Truck size={24} />,
    title: 'Fulfilment & Tracking',
    description: 'Mark an order fulfilled and the buyer gets tracking automatically. Every shipment in one list.',
    color: 'pink',
    tag: 'Fulfilment',
  },
  {
    icon: <ShieldCheck size={24} />,
    title: 'Paid, and Protected',
    description: 'Card details are entered with our payment provider and never reach Nexus. Verified buyers, held funds on disputes, and payouts on a schedule you can plan around.',
    color: 'red',
    tag: 'Trust',
  },
];

const additionalFeatures = [
  { icon: <Boxes size={18} />, title: 'Inventory Tracking', desc: 'Stock levels synced to every listing' },
  { icon: <ShoppingBag size={18} />, title: 'Order Management', desc: 'Every order in one place' },
  { icon: <Receipt size={18} />, title: 'Payout History', desc: 'See what cleared, and when' },
  { icon: <LineChart size={18} />, title: 'Sales Reports', desc: 'Revenue, top products, trends' },
  { icon: <Zap size={18} />, title: 'Low-Stock Alerts', desc: 'Know before a listing runs dry' },
  { icon: <Headphones size={18} />, title: 'Seller Support', desc: 'Real help whenever you need it' },
];

const colorMap: Record<string, string> = {
  emerald: 'from-[#27C93F]/20 to-[#27C93F]/5 border-[#27C93F]/30 text-[var(--brand-green-ink)]',
  blue: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 text-cyan-400',
  purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
  amber: 'from-[#FFBD2E]/20 to-[#FFBD2E]/5 border-[#FFBD2E]/30 text-[var(--brand-yellow-ink)]',
  pink: 'from-pink-500/20 to-pink-600/5 border-pink-500/30 text-pink-400',
  red: 'from-[#FF5F56]/20 to-[#FF5F56]/5 border-[#FF5F56]/30 text-[var(--brand-red-ink)]',
};

function FeatureCard({ feature, index }: { feature: typeof mainFeatures[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { ref: inViewRef, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const colors = colorMap[feature.color];

  // GSAP entrance on scroll view
  useEffect(() => {
    if (inView && cardRef.current) {
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 35, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, delay: index * 0.08, ease: 'back.out(1.4)' }
      );
    }
  }, [inView, index]);

  return (
    <div
      ref={(el) => {
        cardRef.current = el;
        inViewRef(el);
      }}
      className="glass rounded-2xl p-6 border border-[var(--ink)]/5"
    >
      <div className={cn(
        'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 border',
        colors
      )}>
        {feature.icon}
      </div>
      <div className="text-xs font-medium text-muted uppercase tracking-wider mb-2">{feature.tag}</div>
      <h3 className="text-lg font-semibold text-primary mb-2">{feature.title}</h3>
      <p className="text-sm text-muted leading-relaxed">{feature.description}</p>
    </div>
  );
}

export function Features() {
  const { ref: headerRef, inView: headerInView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div
          ref={headerRef}
          className={cn(
            'text-center max-w-3xl mx-auto mb-16 transition-colors duration-700',
            headerInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#FFBD2E]/30 bg-[#FFBD2E]/10 text-[var(--brand-yellow-ink)] text-xs font-medium mb-5">
            <Zap size={12} fill="currentColor" />
            Everything you need to sell
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-primary mb-5 leading-tight">
            One marketplace,
            <span className="text-gradient"> everything you need to sell</span>
          </h2>
          <p className="text-lg text-muted leading-relaxed">
            You bring the products. We bring the shoppers, the checkout, the payouts and the delivery. Nothing to set up, nothing to stitch together.
          </p>
        </div>

        {/* Feature image showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <div className="relative rounded-2xl overflow-hidden border border-[var(--ink)]/10 group">
            <img loading="lazy" decoding="async" src={getAssetUrl('/images/feature-analytics.jpg')} alt="Analytics" className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-base)] via-[var(--surface-base)]/30 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5F56]/20 border border-[#FF5F56]/30 text-[var(--brand-red-ink)] text-xs font-medium mb-2">
                <Sparkles size={12} /> Nexus IQ
              </div>
              <h3 className="text-xl font-bold text-primary group-hover:text-[var(--brand-yellow-ink)] transition-colors">Know what to sell next</h3>
              <p className="text-sm text-muted mt-1">Demand signals, pricing guidance and restock warnings, read off your own sales.</p>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-[var(--ink)]/10 group">
            <img loading="lazy" decoding="async" src={getAssetUrl('/images/feature-commerce.jpg')} alt="Commerce" className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-base)] via-[var(--surface-base)]/30 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#27C93F]/20 border border-[#27C93F]/30 text-[var(--brand-green-ink)] text-xs font-medium mb-2">
                <CreditCard size={12} /> Marketplace Checkout
              </div>
              <h3 className="text-xl font-bold text-primary group-hover:text-[var(--brand-yellow-ink)] transition-colors">One bag, one checkout, every seller</h3>
              <p className="text-sm text-muted mt-1">Shoppers buy from several sellers at once. We split the order and pay each of you.</p>
            </div>
          </div>
        </div>

        {/* Main feature grid with GSAP card animations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {mainFeatures.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        {/* Additional features */}
        <div className="glass rounded-2xl border border-[var(--ink)]/5 p-8">
          <p className="text-center text-sm text-muted mb-6 font-medium uppercase tracking-wider">And much more</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {additionalFeatures.map(feat => (
              <div key={feat.title} className="text-center">
                <div className="w-10 h-10 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 flex items-center justify-center mx-auto mb-3 text-muted">
                  {feat.icon}
                </div>
                <p className="text-xs font-medium text-body">{feat.title}</p>
                <p className="text-xs text-muted mt-0.5">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
