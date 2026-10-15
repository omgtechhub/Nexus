import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * The hero's ambient glow.
 *
 * It used to be three 550–600px SVGs, each carrying `filter: blur(64px)` and
 * `mix-blend-screen`, whose `path` `d` attribute GSAP morphed on an infinite
 * loop. That combination is close to the most expensive thing a browser can be
 * asked to do every frame: changing path geometry invalidates the rasterised
 * path, which invalidates the 64px blur that has to be recomputed over a
 * ~360,000px² surface, which then has to be re-blended into the stacking
 * context — sixty times a second, forever, whether or not the hero was on
 * screen.
 *
 * Measured on the homepage before this rewrite: **23fps with the hero merely
 * sitting there**, a median frame of 49.9ms and 13 janked frames in four
 * seconds. The video slide then had nowhere to go and spiked to 133ms frames.
 *
 * What it does now:
 *  - The blobs are plain divs with a radial-gradient background. They are
 *    rasterised **once**.
 *  - Only `transform` and `opacity` are animated. Both are composited on the
 *    GPU and neither invalidates the blur raster, so the expensive work
 *    happens at mount rather than per frame.
 *  - `mix-blend-screen` is gone. Against this dark background a screen blend
 *    over a 64px blur is visually almost identical to plain opacity, and it was
 *    forcing the whole stacking context to re-composite.
 *  - Nothing animates while the hero is off screen, and nothing animates at
 *    all under `prefers-reduced-motion` — the CSS block in `index.css` cannot
 *    stop a GSAP tween, because GSAP writes inline styles from JavaScript.
 */

interface Blob {
  className: string;
  gradient: string;
  /** Drift in px, and the duration of one leg in seconds. */
  drift: { x: number; y: number; scale: number; duration: number };
}

const BLOBS: Blob[] = [
  {
    className: 'left-[-10%] top-10 h-[550px] w-[550px] opacity-25',
    gradient:
      'radial-gradient(circle at 35% 35%, rgba(255,95,86,0.8) 0%, rgba(255,189,46,0.45) 45%, rgba(39,201,63,0.12) 70%, transparent 100%)',
    drift: { x: 70, y: -45, scale: 1.12, duration: 13 },
  },
  {
    className: 'right-[-10%] top-1/4 h-[600px] w-[600px] opacity-25',
    gradient:
      'radial-gradient(circle at 60% 40%, rgba(39,201,63,0.75) 0%, rgba(0,229,255,0.4) 45%, rgba(255,189,46,0.15) 70%, transparent 100%)',
    drift: { x: -80, y: 55, scale: 1.16, duration: 16 },
  },
  {
    className:
      'left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 opacity-20',
    gradient:
      'radial-gradient(circle at 50% 50%, rgba(255,189,46,0.7) 0%, rgba(255,95,86,0.3) 55%, transparent 100%)',
    drift: { x: 40, y: 40, scale: 1.1, duration: 19 },
  },
];

export function GsapMorphBg() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = container.current;
    if (!root) return;

    // GSAP writes inline styles, so the CSS reduced-motion block cannot reach
    // it. Honour the preference here instead: render the glow, animate nothing.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const blobs = Array.from(root.querySelectorAll<HTMLElement>('[data-blob]'));

    /**
     * One timeline holding all three loops.
     *
     * The drifts are children of a timeline rather than three loose tweens
     * because a timeline is the thing that can be paused: `gsap.context()` has
     * no `pause`/`resume` — it exists to revert and to scope selectors, and
     * GSAP's own docs say so outright. Calling them on the context threw
     * `ctx.resume is not a function` the first time the hero crossed the
     * viewport edge, which meant the idle-while-off-screen saving below never
     * actually happened and the homepage carried an uncaught error.
     */
    let drift: gsap.core.Timeline | null = null;

    const ctx = gsap.context(() => {
      drift = gsap.timeline();
      blobs.forEach((blob, index) => {
        const { x, y, scale, duration } = BLOBS[index].drift;
        drift!.to(
          blob,
          {
            // Transform only. The browser can run these on the compositor
            // without re-rasterising the blurred gradient underneath.
            xPercent: (x / 550) * 100,
            yPercent: (y / 550) * 100,
            scale,
            duration,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          },
          // Stagger the loops so the three never peak together.
          index * 1.5
        );
      });
    }, root);

    /**
     * Idle while off screen, and while the tab is in the background.
     *
     * Both conditions feed one decision. Treating them as two independent
     * switches is how the previous version would have resumed the animation on
     * tab focus even when the hero was scrolled a page away — it only ever
     * wanted to run when the glow is both on screen and actually being looked
     * at.
     */
    let onScreen = true;
    let tabVisible = !document.hidden;

    const sync = () => {
      if (!drift) return;
      if (onScreen && tabVisible) drift.resume();
      else drift.pause();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: '120px' }
    );
    observer.observe(root);

    const onVisibility = () => {
      tabVisible = !document.hidden;
      sync();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={container}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {BLOBS.map((blob, index) => (
        <div
          key={index}
          data-blob
          className={`absolute rounded-full blur-3xl ${blob.className}`}
          style={{
            backgroundImage: blob.gradient,
            // Promote to its own layer once, so the blurred gradient is
            // rasterised a single time and then only moved.
            willChange: 'transform',
          }}
        />
      ))}
    </div>
  );
}
