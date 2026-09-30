import { useState } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { testimonials } from '../../data/marketingContent';
import { cn } from '../../utils/cn';
import { getAssetUrl } from '../../utils/assetPath';

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  const prev = () => setActiveIndex(i => (i - 1 + testimonials.length) % testimonials.length);
  const next = () => setActiveIndex(i => (i + 1) % testimonials.length);

  return (
    <section id="testimonials" className="py-24 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0">
        <img loading="lazy" decoding="async" src={getAssetUrl('/images/testimonial-bg.jpg')} alt="" className="w-full h-full object-cover opacity-5" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
      </div>

      <div className={cn(
        'relative max-w-7xl mx-auto px-4 sm:px-6 transition-colors duration-700',
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      )}>
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#FFBD2E]/30 bg-[#FFBD2E]/10 text-[#FFBD2E] text-xs font-medium mb-5">
            <Star size={12} fill="currentColor" />
            4.9/5 from 14,200+ reviews
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Real merchants,
            <span className="text-gradient"> real results</span>
          </h2>
          <p className="text-muted max-w-xl mx-auto">
            Join over 2 million businesses who have transformed their commerce with Nexus.
          </p>
        </div>

        {/* Main testimonial spotlight */}
        <div className="relative max-w-4xl mx-auto mb-12">
          <div className="glass rounded-3xl p-10 border border-white/10 relative overflow-hidden">
            {/* Decorative quote */}
            <div className="absolute top-6 right-8 opacity-10">
              <Quote size={100} className="text-[#FFBD2E]" fill="currentColor" />
            </div>

            <div className="relative z-10">
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {Array.from({ length: testimonials[activeIndex].stars }).map((_, i) => (
                  <Star key={i} size={18} className="text-[#FFBD2E]" fill="currentColor" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-xl sm:text-2xl font-medium text-white leading-relaxed mb-8">
                "{testimonials[activeIndex].quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={testimonials[activeIndex].avatar}
                      alt={testimonials[activeIndex].author}
                      className="w-14 h-14 rounded-full border-2 border-[#FF5F56]/40 object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#27C93F] border-2 border-[#0B0D1B] flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-white">{testimonials[activeIndex].author}</div>
                    <div className="text-sm text-muted">{testimonials[activeIndex].title}</div>
                    <div className="text-sm text-[#27C93F] font-medium">{testimonials[activeIndex].company}</div>
                  </div>
                </div>
                <div className="glass-green rounded-xl px-4 py-2 text-sm font-semibold text-[#27C93F]">
                  {testimonials[activeIndex].revenue}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button aria-label="Previous"
              onClick={prev}
              className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-muted hover:text-white hover:border-[#FFBD2E]/40 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    'rounded-full transition-colors duration-300',
                    i === activeIndex
                      ? 'w-6 h-2 bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]'
                      : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                  )}
                />
              ))}
            </div>
            <button aria-label="Next"
              onClick={next}
              className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-muted hover:text-white hover:border-[#FFBD2E]/40 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Thumbnail grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {testimonials.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActiveIndex(i)}
              className={cn(
                'p-4 rounded-xl border text-left transition-colors',
                i === activeIndex
                  ? 'glass-green border-[#27C93F]/40'
                  : 'glass border-white/5 hover:border-white/10'
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <img loading="lazy" decoding="async" src={t.avatar} alt={t.author} className="w-9 h-9 rounded-full object-cover" />
                <div>
                  <div className="text-xs font-semibold text-white">{t.author}</div>
                  <div className="text-xs text-muted">{t.company}</div>
                </div>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} size={10} className="text-[#FFBD2E]" fill="currentColor" />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
