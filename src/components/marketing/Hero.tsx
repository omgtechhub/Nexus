import { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, Play, Star, TrendingUp, Users, ShoppingBag, 
  Sparkles, Store, Layout, X
} from 'lucide-react';
import gsap from 'gsap';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { GsapMorphBg } from './GsapMorphBg';
import { getAssetUrl } from '../../utils/assetPath';

import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';

/**
 * The hero's video slide.
 *
 * Playback is driven by `isActive` rather than by the `autoPlay` attribute,
 * and the file is attached on an idle callback rather than at mount. That
 * keeps the 2.1MB fetch and decode out of the way of first paint without ever
 * putting the visitor in a state where the video does not arrive: the idle
 * callback carries a 3s timeout, the fallback timer is 2.5s, and the image
 * slide ahead of it runs for eight seconds.
 *
 * What is deliberately *not* here is a media-preference gate. Withholding the
 * source under `prefers-reduced-motion`, Save-Data or a slow `effectiveType`
 * left a bare `<video>` showing nothing but its poster frame — a still image
 * standing in for the slider for the whole twenty seconds of the slide. On
 * Windows that fires whenever Settings -> Accessibility -> Visual effects ->
 * Animation effects is off, which is a common performance tweak and has
 * nothing to do with wanting a dead hero. The video is the slide; it plays.
 *
 * There is no `poster` either, for the same reason: a poster is only ever
 * visible when the video is not, so it can only ever be the stale image this
 * was reported as. Until the first frame decodes the element is transparent
 * and the slide's own overlays carry the section, which is what the opacity
 * crossfade already shows during the transition.
 */
function HeroVideo({ src, isActive }: { src: string; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Once true, the <source> exists. It never goes back to false, so returning
  // to the slide does not re-download.
  const [shouldLoad, setShouldLoad] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      setShouldLoad(true);
      return;
    }

    const idle = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout?: number }) => number)
      | undefined;

    if (idle) {
      const handle = idle(() => setShouldLoad(true), { timeout: 3000 });
      return () => (window as any).cancelIdleCallback?.(handle);
    }

    // Safari has no requestIdleCallback; a timer past first paint is close
    // enough and still well ahead of the slide change.
    const timer = setTimeout(() => setShouldLoad(true), 2500);
    return () => clearTimeout(timer);
  }, [isActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    let cancelled = false;

    const play = () => {
      if (cancelled || document.hidden) return;
      video.play().catch(() => {
        /* A blocked autoplay is not an error worth surfacing. */
      });
    };

    if (isActive) play();
    else video.pause();

    // A hidden tab should not be decoding video frames.
    const onVisibility = () => {
      if (document.hidden) video.pause();
      else if (isActive) play();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      video.pause();
    };
  }, [isActive, shouldLoad]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <video
        ref={videoRef}
        src={shouldLoad ? src : undefined}
        // No `autoPlay`: the effect above owns playback, and the attribute is
        // what made an inactive slide download and decode the whole file.
        loop
        muted
        playsInline
        preload={shouldLoad ? 'auto' : 'none'}
        disablePictureInPicture
        tabIndex={-1}
        aria-hidden="true"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

/*
 * The headline copy.
 *
 * Realigned off the store-builder pitch it used to carry — "launch your online
 * store", "custom storefront themes", a Shop Pay checkout that does not exist.
 * Nexus is a marketplace: the seller brings products, the platform brings the
 * shopfront, the shoppers, the checkout and the delivery rules. Promising a
 * shopfront of their own is the opposite of what they get, and the hero is the
 * first sentence anyone reads.
 */
const slide1Data = {
  phrase: 'sell more.',
  description:
    'Nexus is the marketplace where independent sellers list their products — and where shoppers buy from all of them with one account and one bag.',
};

const slide2SubPhrases = [
  {
    phrase: 'list faster.',
    description:
      'Add a product, set your price, upload your photos. Your listing is live in the shared shopfront the moment you publish it.',
  },
  {
    phrase: 'reach further.',
    description:
      'No traffic to buy and no storefront to promote. Shoppers already browsing Nexus find your products the day you list them.',
  },
  {
    phrase: 'sell smarter.',
    description:
      'Nexus IQ reads your own stock, orders and margins and says what to restock, what to reprice, and which listings are about to run dry.',
  },
];

/**
 * Invented scale figures ("2.1M+ active merchants", "$200B+ revenue
 * processed", "175+ countries") and an uptime guarantee the Terms do not
 * give. Replaced with claims the code backs — see the note in Stats.tsx.
 */
const stats = [
  { value: '0%', label: 'Sales commission', icon: <TrendingUp size={16} /> },
  { value: '₦', label: 'Naira-native pricing', icon: <ShoppingBag size={16} /> },
  { value: 'One', label: 'Cart, every store', icon: <Users size={16} /> },
  { value: '14-day', label: 'Annual refund window', icon: <Star size={16} /> },
];

interface HeroSlide {
  id: string;
  type: 'image' | 'video' | 'animated-image';
  duration: number;
  mediaSrc: string;
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
    icon: <Store size={14} />,
  },
];

export function Hero() {
  const { navigate } = useApp();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [videoOpen, setVideoOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [subIndex, setSubIndex] = useState(0);

  useDismissOnEscape(videoOpen, () => setVideoOpen(false));

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

    setSubIndex(0);

    const slideTimer = setTimeout(() => {
      setActiveSlide(next => (next + 1) % heroSlides.length);
    }, duration);

    /**
     * Two timeouts, not a poll.
     *
     * This used to be a `setInterval` firing every 100ms that recomputed the
     * elapsed time and called `setSubIndex` on every tick — around 200 wake-ups
     * per slide to perform two transitions, each one re-entering React only to
     * be discarded by the bailout on an unchanged value.
     */
    const subTimers =
      activeSlide === 1
        ? [
            setTimeout(() => setSubIndex(1), 7000),
            setTimeout(() => setSubIndex(2), 14000),
          ]
        : [];

    return () => {
      clearTimeout(slideTimer);
      subTimers.forEach(clearTimeout);
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
      // No `filter: blur()` here any more. Animating a blur forces a full
      // repaint plus a GPU blur pass every frame, and this runs on the largest
      // text on the page (`text-8xl`) every time the phrase changes. Opacity
      // and transform give the same impression on the compositor alone.
      gsap.fromTo(phraseRef.current,
        { opacity: 0, scale: 0.88, y: 18 },
        { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: 'back.out(1.6)' }
      );
    }
    if (descRef.current) {
      gsap.fromTo(descRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, [currentPhrase, currentDescription]);

  /**
   * Submitting with an empty or malformed address used to do nothing at all --
   * no navigation and no message -- so the button looked broken. It now says
   * what is wrong instead of silently swallowing the click.
   */
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();

    if (!value) {
      setEmailError('Enter your email address to start your free trial.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setEmailError('That does not look like an email address.');
      return;
    }

    setEmailError('');
    navigate('signup');
  };

  return (
    /*
     * The hero stays dark in both themes.
     *
     * Its headline, stats and badges sit directly on a video, and the slide is
     * legible only because three dark overlays sit between the two. Letting
     * those overlays follow a light theme turned them white, which washed the
     * video out to almost nothing and left dark text on a pale, moving image.
     *
     * `data-theme="dark"` re-declares the whole token set for this subtree, so
     * every child resolves dark values without caring what the page is set to.
     */
    <>
      <section
        data-theme="dark"
        className="relative flex flex-col items-center justify-center overflow-hidden bg-[var(--surface-sunken)] text-primary"
      >
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
                    <HeroVideo src={s.mediaSrc} isActive={isActive} />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-b from-[var(--surface-base)]/30 via-[var(--surface-base)]/50 to-[var(--surface-base)]" />
                  <div className="absolute inset-0 bg-[var(--surface-base)]/15" />
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FFBD2E]/40 bg-[#FFBD2E]/10 text-[var(--brand-yellow-ink)] text-sm font-medium mb-8 backdrop-blur-sm shadow-lg shadow-yellow-500/10 hover:border-[#FFBD2E]/70 hover:bg-[#FFBD2E]/20 hover:scale-105 transition duration-300 cursor-pointer group"
            >
              <Sparkles size={14} className="text-[var(--brand-yellow-ink)] group-hover:rotate-12 transition-transform" />
              <span>Every plan starts with a 14-day free trial</span>
              <ArrowRight size={12} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition" />
            </button>

            {/* GSAP Main headline with Morphing Phrase */}
            <h1 ref={mainTitleRef} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-primary leading-[1.05] tracking-tight mb-6">
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
              className="text-lg sm:text-xl md:text-2xl text-secondary max-w-3xl mx-auto mb-8 leading-relaxed"
            >
              {currentDescription}
            </p>

            {/* GSAP Email CTA Form */}
            <form ref={heroFormRef} onSubmit={handleEmailSubmit} noValidate className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mb-2">
              <input aria-label="Enter your email address"
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? 'hero-email-error' : undefined}
                placeholder="Enter your email address"
                className={cn(
                  'flex-1 form-input text-base h-14 rounded-xl',
                  emailError && 'border-[#FF5F56] focus:border-[#FF5F56]'
                )}
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

            {/* role=alert so the message is announced the moment it appears. */}
            <p
              id="hero-email-error"
              role="alert"
              className={cn(
                'text-sm font-medium text-[var(--brand-red-ink)] mb-2 min-h-5',
                !emailError && 'sr-only'
              )}
            >
              {emailError}
            </p>

            <p className="text-xs text-muted mb-8">
              14-day free trial · No credit card required · Cancel anytime
            </p>

            {/* Watch demo button */}
            <button
              onClick={() => setVideoOpen(true)}
              className="inline-flex items-center gap-3 text-sm text-secondary hover:text-primary transition-colors group mb-10 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--ink)]/10 border border-[var(--ink)]/20 flex items-center justify-center group-hover:bg-[#FF5F56]/20 group-hover:border-[#FF5F56]/40 transition-colors">
                <Play size={14} className="text-primary ml-0.5" fill="currentColor" />
              </div>
              Watch 2-min product demo
            </button>

            {/* GSAP Staggered Stats Grid */}
            <div ref={heroStatsRef} className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map(stat => (
                <div key={stat.label} className="glass rounded-2xl p-5 text-center card-hover hover:border-[#FFBD2E]/40 transition-colors">
                  <div className="flex items-center justify-center gap-1.5 text-[var(--brand-yellow-ink)] mb-2 opacity-80 text-xs">
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                  <div className="text-xs text-muted">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <img
                      key={i}
                      src={getAssetUrl(`/images/avatar-${i}.jpg`)}
                      alt=""
                      className="w-7 h-7 rounded-full border-2 border-[var(--surface-base)] object-cover"
                    />
                  ))}
                </div>
                <span>Joined by 12,000+ merchants this month</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} size={14} className="text-[var(--brand-yellow-ink)]" fill="currentColor" />
                ))}
                <span className="ml-1">4.9/5 from 14,200 reviews</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*
        * The dashboard mockup sits outside the dark island on purpose.
        *
        * Only the hero itself has to stay dark — its text is on a video. This
        * is a framed image on the page, so it follows the theme like every
        * other section and the page does not carry a dark band below the fold
        * in light mode.
        */}
      <div className="relative z-10 mt-12 max-w-5xl mx-auto px-4 sm:px-6 w-full pb-16">
        <div className="relative rounded-2xl overflow-hidden border border-[var(--ink)]/10 shadow-2xl shadow-black/15 dark:shadow-black/50 hover:border-[#27C93F]/40 transition-colors">
          {/* Fades the bottom edge into the page, so the frame does not end on
              a hard line. Keyed to the page's own surface, not the hero's. */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-sunken)] via-transparent to-transparent z-10 h-32 bottom-0 top-auto" />
          <img
            src={getAssetUrl('/images/dashboard-preview.jpg')}
            alt="Nexus Commerce Dashboard"
            className="w-full object-cover rounded-2xl opacity-100 dark:opacity-80"
          />
          <div className="absolute top-4 left-4 flex gap-1.5 z-20">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
          </div>
        </div>
      </div>

      {/* Video modal */}
      {/* A full-screen video player: dark in both themes, like any lightbox. */}
      {videoOpen && (
        <div data-theme="dark" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setVideoOpen(false)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-4xl aspect-video bg-[var(--surface-base)] border border-[var(--ink)]/10 rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setVideoOpen(false)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 text-body hover:text-primary border border-[var(--ink)]/10 transition-colors"
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
    </>
  );
}
