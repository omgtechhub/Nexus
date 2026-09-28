import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function GsapMorphBg() {
  const blob1Ref = useRef<SVGPathElement>(null);
  const blob2Ref = useRef<SVGPathElement>(null);
  const blob3Ref = useRef<SVGPathElement>(null);

  // SVG Path Morph Shapes
  const path1Shapes = [
    "M150 50 Q 280 10 350 150 Q 420 300 250 350 Q 80 400 50 250 Q 20 100 150 50 Z",
    "M180 30 Q 320 80 300 220 Q 280 360 140 330 Q 20 300 60 160 Q 100 20 180 30 Z",
    "M120 80 Q 240 20 370 110 Q 400 250 290 370 Q 150 380 40 260 Q 10 140 120 80 Z",
    "M150 50 Q 280 10 350 150 Q 420 300 250 350 Q 80 400 50 250 Q 20 100 150 50 Z"
  ];

  const path2Shapes = [
    "M200 40 Q 340 100 310 240 Q 270 380 130 310 Q 30 240 70 120 Q 110 20 200 40 Z",
    "M160 70 Q 290 30 360 180 Q 390 310 230 360 Q 90 390 40 220 Q 10 90 160 70 Z",
    "M220 50 Q 310 120 280 260 Q 240 370 110 340 Q 40 270 90 150 Q 130 30 220 50 Z",
    "M200 40 Q 340 100 310 240 Q 270 380 130 310 Q 30 240 70 120 Q 110 20 200 40 Z"
  ];

  useEffect(() => {
    // Liquid Morph Blob 1 Animation Loop
    if (blob1Ref.current) {
      const tl1 = gsap.timeline({ repeat: -1, yoyo: true, ease: 'sine.inOut' });
      tl1.to(blob1Ref.current, {
        attr: { d: path1Shapes[1] },
        duration: 6,
      })
      .to(blob1Ref.current, {
        attr: { d: path1Shapes[2] },
        duration: 7,
      })
      .to(blob1Ref.current, {
        attr: { d: path1Shapes[3] },
        duration: 6,
      });

      // Continuous rotation & scale morph
      gsap.to(blob1Ref.current, {
        rotation: 360,
        transformOrigin: '50% 50%',
        duration: 35,
        repeat: -1,
        ease: 'none',
      });
    }

    // Liquid Morph Blob 2 Animation Loop
    if (blob2Ref.current) {
      const tl2 = gsap.timeline({ repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1 });
      tl2.to(blob2Ref.current, {
        attr: { d: path2Shapes[1] },
        duration: 7,
      })
      .to(blob2Ref.current, {
        attr: { d: path2Shapes[2] },
        duration: 8,
      })
      .to(blob2Ref.current, {
        attr: { d: path2Shapes[3] },
        duration: 7,
      });

      gsap.to(blob2Ref.current, {
        rotation: -360,
        transformOrigin: '50% 50%',
        duration: 40,
        repeat: -1,
        ease: 'none',
      });
    }

    // Floating Blob 3 pulsing morph
    if (blob3Ref.current) {
      gsap.to(blob3Ref.current, {
        scale: 1.25,
        y: -30,
        transformOrigin: '50% 50%',
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      });
    }
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* GSAP SVG Morph Blob Left (Coral/Pink Glow) */}
      <svg
        className="absolute top-10 left-[-10%] w-[550px] h-[550px] opacity-25 filter blur-3xl mix-blend-screen"
        viewBox="0 0 450 450"
      >
        <defs>
          <linearGradient id="gsapGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF5F56" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#FFBD2E" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#27C93F" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path ref={blob1Ref} d={path1Shapes[0]} fill="url(#gsapGrad1)" />
      </svg>

      {/* GSAP SVG Morph Blob Right (Emerald/Cyan Glow) */}
      <svg
        className="absolute top-1/4 right-[-10%] w-[600px] h-[600px] opacity-25 filter blur-3xl mix-blend-screen"
        viewBox="0 0 450 450"
      >
        <defs>
          <linearGradient id="gsapGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#27C93F" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#00E5FF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFBD2E" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path ref={blob2Ref} d={path2Shapes[0]} fill="url(#gsapGrad2)" />
      </svg>

      {/* GSAP SVG Center Morph Orb (Amber Glow) */}
      <svg
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-20 filter blur-3xl mix-blend-screen"
        viewBox="0 0 450 450"
      >
        <defs>
          <radialGradient id="gsapGrad3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFBD2E" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#FF5F56" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          ref={blob3Ref}
          d="M 225,225 m -150,0 a 150,150 0 1,0 300,0 a 150,150 0 1,0 -300,0"
          fill="url(#gsapGrad3)"
        />
      </svg>
    </div>
  );
}
