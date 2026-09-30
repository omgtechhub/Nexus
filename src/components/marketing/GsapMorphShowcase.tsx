import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Store, Sparkles, ShieldCheck, Globe, ArrowRight, Layers } from 'lucide-react';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';

// SVG Path definitions for live GSAP Path Morphing
const morphShapes = {
  store: {
    label: 'Storefront Architecture',
    color: '#27C93F',
    gradient: ['#27C93F', '#00E5FF'],
    icon: <Store size={18} />,
    description: 'High-converting Liquid 3.0 theme engine with instant CDN rendering.',
    path: 'M 150 40 L 260 90 L 260 210 L 150 260 L 40 210 L 40 90 Z', // Hexagon
  },
  ai: {
    label: 'NexusIQ AI Core',
    color: '#FFBD2E',
    gradient: ['#FFBD2E', '#FF5F56'],
    icon: <Sparkles size={18} />,
    description: 'Real-time AI predictive merchandising, pricing, and automated inventory flows.',
    path: 'M 150 30 L 200 90 L 270 150 L 200 210 L 150 270 L 100 210 L 30 150 L 100 90 Z', // 8-point Diamond Star
  },
  payments: {
    label: 'Payments & Vault Shield',
    color: '#00E5FF',
    gradient: ['#00E5FF', '#3B82F6'],
    icon: <ShieldCheck size={18} />,
    description: 'PCI DSS Level 1 vault with 1-click Shop Pay accelerated checkout.',
    path: 'M 150 30 L 260 70 L 260 170 C 260 250 150 280 150 280 C 150 280 40 250 40 170 L 40 70 Z', // Security Shield
  },
  global: {
    label: 'Global Cross-Border Engine',
    color: '#FF5F56',
    gradient: ['#FF5F56', '#FFBD2E'],
    icon: <Globe size={18} />,
    description: 'Sell internationally across 175+ countries with auto-currency & duty calculation.',
    path: 'M 150 40 C 220 40 270 90 270 150 C 270 210 220 260 150 260 C 80 260 30 210 30 150 C 30 90 80 40 150 40 Z', // Smooth Circle
  },
};

type MorphMode = keyof typeof morphShapes;

export function GsapMorphShowcase() {
  const { navigate } = useApp();
  const [activeMode, setActiveMode] = useState<MorphMode>('store');
  const [expandedCard, setExpandedCard] = useState(false);

  const pathRef = useRef<SVGPathElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const iconBoxRef = useRef<HTMLDivElement>(null);

  // Trigger GSAP Morph Transition when activeMode changes
  useEffect(() => {
    const current = morphShapes[activeMode];

    // 1. GSAP SVG Path Morphing Transition
    if (pathRef.current) {
      gsap.to(pathRef.current, {
        attr: { d: current.path },
        duration: 0.85,
        ease: 'elastic.out(1, 0.6)',
      });
    }

    // 2. GSAP Text & Card Content Morph
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 10, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power2.out' }
      );
    }

    if (descRef.current) {
      gsap.fromTo(
        descRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, delay: 0.05, ease: 'power2.out' }
      );
    }

    if (iconBoxRef.current) {
      gsap.fromTo(
        iconBoxRef.current,
        { scale: 0.7, rotate: -45 },
        { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2)' }
      );
    }
  }, [activeMode]);

  // Handle Morph Card Expand/Collapse Transition
  const toggleExpand = () => {
    if (!cardContainerRef.current) return;
    const isExpanding = !expandedCard;
    setExpandedCard(isExpanding);

    if (isExpanding) {
      gsap.to(cardContainerRef.current, {
        scale: 1.02,
        borderColor: morphShapes[activeMode].color,
        boxShadow: `0 20px 40px -10px ${morphShapes[activeMode].color}40`,
        duration: 0.4,
        ease: 'power3.out',
      });
    } else {
      gsap.to(cardContainerRef.current, {
        scale: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        duration: 0.4,
        ease: 'power3.out',
      });
    }
  };

  return (
    <section className="py-20 relative overflow-hidden bg-[#0D0F21]/90 border-t border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-medium mb-4">
            <Layers size={14} />
            <span>Interactive GSAP Morphing Engine</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
            Dynamic Platform <span className="text-gradient">Morph Transitions</span>
          </h2>
          <p className="text-secondary text-sm sm:text-base">
            Select a mode below to trigger real-time GSAP vector path morphing and fluid card transition states.
          </p>
        </div>

        {/* Morph Control Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {(Object.keys(morphShapes) as MorphMode[]).map((key) => {
            const item = morphShapes[key];
            const isActive = activeMode === key;
            return (
              <button
                key={key}
                onClick={() => setActiveMode(key)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition duration-300 cursor-pointer border ${
                  isActive
                    ? 'bg-gradient-to-r from-white/15 to-white/5 border-white text-white shadow-xl scale-105'
                    : 'glass text-secondary border-white/10 hover:text-white hover:bg-white/5'
                }`}
                style={{ borderColor: isActive ? item.color : undefined }}
              >
                <span style={{ color: isActive ? item.color : undefined }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* GSAP Morph Visualizer Card */}
        <div
          ref={cardContainerRef}
          className="glass rounded-3xl p-8 border border-white/10 max-w-4xl mx-auto shadow-2xl relative transition-colors duration-300"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* SVG Morph Shape Stage (5 cols) */}
            <div className="md:col-span-5 flex flex-col items-center justify-center relative">
              <div className="relative w-64 h-64 flex items-center justify-center">
                {/* SVG Path Morph Container */}
                <svg className="w-full h-full drop-shadow-2xl" viewBox="0 0 300 300">
                  <defs>
                    <linearGradient id="morphGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={morphShapes[activeMode].gradient[0]} stopOpacity="0.9" />
                      <stop offset="100%" stopColor={morphShapes[activeMode].gradient[1]} stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                  <path
                    ref={pathRef}
                    d={morphShapes[activeMode].path}
                    fill="url(#morphGrad)"
                    stroke={morphShapes[activeMode].color}
                    strokeWidth="3"
                    className="transition-colors duration-500"
                  />
                </svg>

                {/* Center Icon */}
                <div
                  ref={iconBoxRef}
                  className="absolute inset-0 flex items-center justify-center text-white drop-shadow-lg"
                  style={{ color: morphShapes[activeMode].color }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
                    {morphShapes[activeMode].icon}
                  </div>
                </div>
              </div>
            </div>

            {/* Content & Details Stage (7 cols) */}
            <div className="md:col-span-7 space-y-5 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border" style={{ color: morphShapes[activeMode].color, borderColor: `${morphShapes[activeMode].color}40`, backgroundColor: `${morphShapes[activeMode].color}15` }}>
                {morphShapes[activeMode].icon}
                <span>{activeMode.toUpperCase()} MORPH MODULE</span>
              </div>

              <h3 ref={titleRef} className="text-2xl sm:text-3xl font-extrabold text-white">
                {morphShapes[activeMode].label}
              </h3>

              <p ref={descRef} className="text-body text-sm leading-relaxed">
                {morphShapes[activeMode].description}
              </p>

              <div className="pt-4 flex flex-wrap items-center justify-center md:justify-start gap-4">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate(activeMode === 'store' ? 'online-store' : activeMode === 'ai' ? 'ai-assistant' : activeMode === 'payments' ? 'payments' : 'markets')}
                  className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-white/20 to-white/10 text-white border border-white/20 hover:border-white"
                  icon={<ArrowRight size={16} />}
                  iconPosition="right"
                >
                  Explore {morphShapes[activeMode].label}
                </Button>

                <button
                  onClick={toggleExpand}
                  className="px-4 py-3 rounded-xl text-xs font-bold text-secondary hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {expandedCard ? 'Collapse GSAP State' : 'Morph Expand View'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
