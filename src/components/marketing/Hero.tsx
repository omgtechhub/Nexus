import { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, Play, Star, TrendingUp, Users, ShoppingBag, 
  Sparkles, Store, Layout, X
} from 'lucide-react';
import gsap from 'gsap';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { GsapMorphBg } from './GsapMorphBg';
import { getAssetUrl } from '../../utils/assetPath';

function HeroVideo({ src, poster, isActive }: { src: string; poster?: string; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      />
    </div>
  );
}

const slide1Data = {
  phrase: 'sell more.',
  description: 'Nexus is the all-in-one commerce platform to launch your online store, process global payments, and manage every sale seamlessly.',
};

const slide2SubPhrases = [
  {
    phrase: 'grow faster.',
    description: 'Accelerate your merchant sales with AI intelligence, 1-click Shop Pay checkout, and automated customer marketing.',
  },
  {
    phrase: 'scale globally.',
    description: 'Expand into 175+ countries with automatic multi-currency conversion, local payment gateways, and international shipping.',
  },
  {
    phrase: 'build smarter.',
    description: 'Empower your brand with custom storefront themes, real-time inventory synchronization, and enterprise-grade uptime.',
  },
];

const stats = [
  { value: '2.1M+', label: 'Active merchants', icon: <ShoppingBag size={16} /> },
  { value: '$200B+', label: 'Revenue processed', icon: <TrendingUp size={16} /> },
  { value: '175+', label: 'Countries served', icon: <Users size={16} /> },
  { value: '99.99%', label: 'Uptime guarantee', icon: <Star size={16} /> },
];

interface HeroSlide {
  id: string;
  type: 'image' | 'video' | 'animated-image';
  duration: number;
  mediaSrc: string;
  videoPoster?: string;
  icon: React.ReactNode;
}

const heroSlides: HeroSlide[] = [
  {
    id: 'slide-1',
    type: 'image',
    duration: 8000,
    mediaSrc: getAssetUrl('/images/hero-bg.jpg'),
    icon: <Layout size={14} />,
  },
  {
    id: 'slide-2',
    type: 'video',
    duration: 20200,
    mediaSrc: getAssetUrl('/videos/final-video-slider-v2.mp4'),
    videoPoster: getAssetUrl('/images/hero-store.jpg'),
    icon: <Store size={14} />,
  },
];

export function Hero() {
  const { navigate } = useApp();
  const [email, setEmail] = useState('');
  const [videoOpen, setVideoOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [subIndex, setSubIndex] = useState(0);

  // GSAP Refs
  const heroBadgeRef = useRef<HTMLButtonElement>(null);
  const mainTitleRef = useRef<HTMLHeadingElement>(null);
  const phraseRef = useRef<HTMLSpanElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const heroFormRef = useRef<HTMLFormElement>(null);
  const heroStatsRef = useRef<HTMLDivElement>(null);

  // GSAP Entrance Timeline on Component Mount
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (heroBadgeRef.current) {
        tl.fromTo(heroBadgeRef.current,
          { opacity: 0, y: -30, scale: 0.8 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.7)' }
        );
      }

      if (mainTitleRef.current) {
        tl.fromTo(mainTitleRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.9 },
          '-=0.5'
        );
      }

      if (heroFormRef.current) {
        tl.fromTo(heroFormRef.current,
          { opacity: 0, y: 25, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.7 },
          '-=0.4'
        );
      }

      if (heroStatsRef.current) {
        tl.fromTo(heroStatsRef.current.children,
          { opacity: 0, y: 25, scale: 0.85 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.5)' },
          '-=0.3'
        );
      }
    });

    return () => ctx.revert();
  }, []);

  // Autonomous Carousel Auto-Advance
  useEffect(() => {
    const duration = heroSlides[activeSlide].duration;
    const startTime = Date.now();

    setSubIndex(0);

    const slideTimer = setTimeout(() => {
      setActiveSlide(next => (next + 1) % heroSlides.length);
    }, duration);

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (activeSlide === 1) {
        if (elapsed < 7000) {
          setSubIndex(0);
        } else if (elapsed < 14000) {
          setSubIndex(1);
        } else {
          setSubIndex(2);
        }
      }
    }, 100);

    return () => {
      clearTimeout(slideTimer);
      clearInterval(progressInterval);
    };
  }, [activeSlide]);

  const currentPhrase = activeSlide === 0 
    ? slide1Data.phrase 
    : slide2SubPhrases[subIndex].phrase;

  const currentDescription = activeSlide === 0 
    ? slide1Data.description 
    : slide2SubPhrases[subIndex].description;

  // GSAP Morph Transition when currentPhrase or currentDescription updates
  useEffect(() => {
    if (phraseRef.current) {
      gsap.fromTo(phraseRef.current,
        { opacity: 0, scale: 0.88, y: 18, filter: 'blur(10px)' },
        { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: 0.55, ease: 'back.out(1.6)' }
      );
    }
    if (descRef.current) {
      gsap.fromTo(descRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, [currentPhrase, currentDescription]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) navigate('signup');
  };

  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden">
      {/* GSAP SVG Liquid Path Morphing Ambient Background */}
      <GsapMorphBg />

      {/* Upper Hero Carousel Container */}
      <div className="relative w-full z-0 overflow-hidden pt-16 pb-10">
        {/* Background Carousel Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {heroSlides.map((s, index) => {
            const isActive = index === activeSlide;
            return (
              <div
                key={s.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {s.type === 'image' && (
                  <img
                    src={s.mediaSrc}
                    alt=""
                    className={`w-full h-full object-cover opacity-25 transition-transform duration-[8000ms] ease-out ${
                      isActive ? 'scale-105' : 'scale-100'
                    }`}
                  />
                )}

                {s.type === 'video' && (
                  <HeroVideo
                    src={s.mediaSrc}
                    poster={s.videoPoster}
                    isActive={isActive}
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-b from-[#0B0D1B]/30 via-[#0B0D1B]/50 to-[#0B0D1B]" />
                <div className="absolute inset-0 bg-[#0B0D1B]/15" />
              </div>
            );
          })}
        </div>

        {/* Content Layer */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
          {/* GSAP Top Badge */}
          <button
            ref={heroBadgeRef}
            onClick={() => navigate('pricing')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FFBD2E]/40 bg-[#FFBD2E]/10 text-[#FFBD2E] text-sm font-medium mb-8 backdrop-blur-sm shadow-lg shadow-yellow-500/10 hover:border-[#FFBD2E]/70 hover:bg-[#FFBD2E]/20 hover:scale-105 transition-all duration-300 cursor-pointer group"
          >
            <Sparkles size={14} className="text-[#FFBD2E] group-hover:rotate-12 transition-transform" />
            <span>Every plan starts with a 14-day free trial</span>
            <ArrowRight size={12} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>

          {/* GSAP Main headline with Morphing Phrase */}
          <h1 ref={mainTitleRef} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
            The platform to
            <br />
            <span
              ref={phraseRef}
              className="text-gradient inline-block font-black"
              style={{ minWidth: '10ch' }}
            >
              {currentPhrase}
            </span>
          </h1>

          {/* GSAP Subtitle */}
          <p
            ref={descRef}
            className="text-lg sm:text-xl md:text-2xl text-white/60 max-w-3xl mx-auto mb-8 leading-relaxed"
          >
            {currentDescription}
          </p>

          {/* GSAP Email CTA Form */}
          <form ref={heroFormRef} onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mb-6">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 form-input text-base h-14 rounded-xl"
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="h-14 px-8 rounded-xl whitespace-nowrap bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-black font-bold"
              icon={<ArrowRight size={18} />}
              iconPosition="right"
            >
              Start free trial
            </Button>
          </form>

          <p className="text-xs text-white/30 mb-8">
            14-day free trial · No credit card required · Cancel anytime
          </p>

          {/* Watch demo button */}
          <button
            onClick={() => setVideoOpen(true)}
            className="inline-flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group mb-10 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-[#FF5F56]/20 group-hover:border-[#FF5F56]/40 transition-all">
              <Play size={14} className="text-white ml-0.5" fill="currentColor" />
            </div>
            Watch 2-min product demo
          </button>

          {/* GSAP Staggered Stats Grid */}
          <div ref={heroStatsRef} className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {stats.map(stat => (
              <div key={stat.label} className="glass rounded-2xl p-5 text-center card-hover hover:border-[#FFBD2E]/40 transition-all">
                <div className="flex items-center justify-center gap-1.5 text-[#FFBD2E] mb-2 opacity-80 text-xs">
                  {stat.icon}
                </div>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-xs text-white/40">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-white/40">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <img
                    key={i}
                    src={getAssetUrl(`/images/avatar-${i}.jpg`)}
                    alt=""
                    className="w-7 h-7 rounded-full border-2 border-[#0B0D1B] object-cover"
                  />
                ))}
              </div>
              <span>Joined by 12,000+ merchants this month</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={14} className="text-[#FFBD2E]" fill="currentColor" />
              ))}
              <span className="ml-1">4.9/5 from 14,200 reviews</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard preview */}
      <div className="relative z-10 mt-12 max-w-5xl mx-auto px-4 sm:px-6 w-full pb-16">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 hover:border-[#27C93F]/40 transition-all">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D1B] via-transparent to-transparent z-10 h-32 bottom-0 top-auto" />
          <img
            src={getAssetUrl('/images/dashboard-preview.jpg')}
            alt="Nexus Commerce Dashboard"
            className="w-full object-cover rounded-2xl opacity-80"
          />
          <div className="absolute top-4 left-4 flex gap-1.5 z-20">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
          </div>
        </div>
      </div>

      {/* Video modal */}
      {videoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setVideoOpen(false)} />
          <div className="relative z-10 w-full max-w-4xl aspect-video bg-[#0B0D1B] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setVideoOpen(false)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white border border-white/10 transition-colors"
              title="Close video demo"
            >
              <X size={18} />
            </button>

            <video
              autoPlay
              controls
              src={getAssetUrl('/videos/product-demo-full.mp4')}
              className="w-full h-full object-cover"
            >
              Your browser does not support HTML5 video playback.
            </video>
          </div>
        </div>
      )}
    </section>
  );
}
