import { useState, useEffect } from 'react';
import { ArrowRight, Play, Star, TrendingUp, Users, ShoppingBag, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';

const phrases = ['sell more.', 'grow faster.', 'scale globally.', 'build smarter.'];

const stats = [
  { value: '2.1M+', label: 'Active merchants', icon: <ShoppingBag size={16} /> },
  { value: '$200B+', label: 'Revenue processed', icon: <TrendingUp size={16} /> },
  { value: '175+', label: 'Countries served', icon: <Users size={16} /> },
  { value: '99.99%', label: 'Uptime guarantee', icon: <Star size={16} /> },
];

export function Hero() {
  const { navigate } = useApp();
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [email, setEmail] = useState('');
  const [animating, setAnimating] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrentPhrase(prev => (prev + 1) % phrases.length);
        setAnimating(false);
      }, 300);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) navigate('signup');
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
      {/* Background layers */}
      <div className="absolute inset-0">
        <img
          src="images/hero-bg.jpg"
          alt=""
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0D1B]/40 via-[#0B0D1B]/60 to-[#0B0D1B]" />
        <div className="absolute inset-0 bg-radial-glow" />
        <div className="absolute inset-0 bg-grid opacity-40" />
      </div>

      {/* Floating orbs */}
      <div className="absolute top-32 left-1/4 w-96 h-96 rounded-full bg-[#FF5F56]/15 blur-3xl animate-pulse-slow pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#FFBD2E]/10 blur-3xl animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-32 right-1/4 w-80 h-80 rounded-full bg-[#27C93F]/15 blur-3xl animate-float-delay pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FFBD2E]/40 bg-[#FFBD2E]/10 text-[#FFBD2E] text-sm font-medium mb-8 backdrop-blur-sm shadow-lg shadow-yellow-500/10">
          <Sparkles size={14} />
          <span>Introducing NexusIQ — AI-powered commerce intelligence</span>
          <ArrowRight size={12} className="opacity-60" />
        </div>

        {/* Main headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
          The platform to
          <br />
          <span
            className={`text-gradient inline-block transition-all duration-300 ${
              animating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
            }`}
            style={{ minWidth: '10ch' }}
          >
            {phrases[currentPhrase]}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl md:text-2xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
          Launch your online store, manage every sale, and grow your brand with the most powerful commerce platform on the planet. Built for ambitious entrepreneurs, scaled for enterprise.
        </p>

        {/* Email CTA */}
        <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mb-6">
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
            className="h-14 px-8 rounded-xl whitespace-nowrap"
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Start free trial
          </Button>
        </form>

        <p className="text-xs text-white/30 mb-10">
          14-day free trial · No credit card required · Cancel anytime
        </p>

        {/* Watch demo */}
        <button
          onClick={() => setVideoOpen(true)}
          className="inline-flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-[#FF5F56]/20 group-hover:border-[#FF5F56]/40 transition-all">
            <Play size={14} className="text-white ml-0.5" fill="currentColor" />
          </div>
          Watch 2-min product demo
        </button>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {stats.map(stat => (
            <div key={stat.label} className="glass rounded-2xl p-5 text-center card-hover">
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
                  src={`images/avatar-${i}.jpg`}
                  alt=""
                  className="w-7 h-7 rounded-full border-2 border-[#0B0D1B] object-cover"
                />
              ))}
            </div>
            <span>Joined by 12,000+ merchants this month</span>
          </div>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={14} className="text-[#FFBD2E]" fill="currentColor" />
            ))}
            <span className="ml-1">4.9/5 from 14,200 reviews</span>
          </div>
        </div>
      </div>

      {/* Dashboard preview */}
      <div className="relative z-10 mt-20 max-w-5xl mx-auto px-4 sm:px-6 w-full">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D1B] via-transparent to-transparent z-10 h-32 bottom-0 top-auto" />
          <img
            src="images/dashboard-preview.jpg"
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setVideoOpen(false)} />
          <div className="relative z-10 w-full max-w-3xl aspect-video glass rounded-2xl flex items-center justify-center border border-white/10">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <Play size={24} className="text-emerald-400 ml-1" fill="currentColor" />
              </div>
              <p className="text-white/60">Demo video would play here</p>
              <button onClick={() => setVideoOpen(false)} className="mt-4 text-sm text-white/40 hover:text-white">Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
