import { 
  Building2, Users, Globe, Award, Sparkles, ShieldCheck, 
  TrendingUp, Zap, Heart, ArrowRight, CheckCircle2
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';
import { getAssetUrl } from '../utils/assetPath';

export function AboutUsPage() {
  const { navigate } = useApp();

  const leadership = [
    { name: 'Elena Rostova', title: 'Co-Founder & CEO', bio: 'Former VP of Commerce at Stripe. 15+ years scaling global merchant payment rails.', image: getAssetUrl('/images/avatar-1.jpg') },
    { name: 'Marcus Vance', title: 'Co-Founder & Chief Architect', bio: 'Distributed systems engineer. Led edge infrastructure at Cloudflare.', image: getAssetUrl('/images/avatar-2.jpg') },
    { name: 'Dr. Aris Thorne', title: 'Head of NexusIQ AI', bio: 'Ph.D. in Machine Learning from Stanford. Former AI Research Director at DeepMind.', image: getAssetUrl('/images/avatar-3.jpg') },
    { name: 'Sarah Lin', title: 'VP of Merchant Success', bio: 'Built customer support operations serving 500k+ global Shopify & BigCommerce merchants.', image: getAssetUrl('/images/avatar-1.jpg') },
  ];

  const milestones = [
    { year: '2020', title: 'Platform Founded', desc: 'Nexus launched with a mission to eliminate merchant platform fees and build high-performance Liquid storefronts.' },
    { year: '2022', title: 'Nexus Payments & POS', desc: 'Introduced 1-click Shop Pay checkout and omnichannel Point of Sale hardware for physical retail stores.' },
    { year: '2024', title: 'NexusIQ AI Engine', desc: 'Pioneered autonomous AI product copywriting, real-time CRO analytics, and merchant chatbots.' },
    { year: '2026', title: 'Universal Commerce Cloud', desc: 'Powering 2.1M+ global store owners with $200B+ in annual processed commerce volume.' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 border-b border-[#222642]/60">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF5F56]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#27C93F]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#FFBD2E] mb-6">
              <Building2 size={14} /> Our Mission & Story
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-6 leading-tight max-w-4xl mx-auto">
              Empowering merchants to <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">build, sell & scale</span> anywhere.
            </h1>
            <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto leading-relaxed mb-10">
              Nexus Commerce was founded on a simple principle: every entrepreneur deserves world-class e-commerce software without high platform transaction fees or complex technical barriers.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button variant="primary" size="lg" onClick={() => navigate('signup')}>
                Start your 14-day free trial <ArrowRight size={16} />
              </Button>
              <Button variant="secondary" size="lg" onClick={() => navigate('careers')}>
                Explore open careers
              </Button>
            </div>
          </div>
        </section>

        {/* Global Impact Stats */}
        <section className="py-16 border-b border-white/5 bg-black/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Active Merchants', value: '2.1M+', color: '#FF5F56' },
                { label: 'Annual GMV Processed', value: '$200B+', color: '#FFBD2E' },
                { label: 'Countries Supported', value: '175+', color: '#27C93F' },
                { label: 'Platform Uptime SLA', value: '99.99%', color: '#FFBD2E' },
              ].map((s, idx) => (
                <div key={idx} className="glass p-6 rounded-2xl text-center border border-white/10">
                  <div className="text-3xl sm:text-4xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-white/50 uppercase tracking-wider font-semibold">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white mb-4">Our Core Operating Values</h2>
            <p className="text-white/50 text-sm">How we build products and support store owners every single day.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-8 rounded-2xl border border-white/10 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/30 flex items-center justify-center text-[#FF5F56]">
                <Heart size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Merchant-First Always</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Every feature we release must directly help merchants sell more, reduce cart drop-off, or save admin time. We never compromise store owner profits.
              </p>
            </div>

            <div className="glass p-8 rounded-2xl border border-white/10 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 flex items-center justify-center text-[#FFBD2E]">
                <Sparkles size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Ethical AI Innovation</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                NexusIQ AI tools provide single-tenant data isolation. Proprietary merchant catalog data is never used to train public foundation models.
              </p>
            </div>

            <div className="glass p-8 rounded-2xl border border-white/10 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[#27C93F]">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Uncompromised Reliability</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Black Friday checkout drops require zero latency. Our global edge infrastructure guarantees 99.99% uptime with SOC 2 & PCI-DSS Level 1 certification.
              </p>
            </div>
          </div>
        </section>

        {/* Company History Timeline */}
        <section className="py-16 border-t border-white/5 bg-black/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold text-white text-center mb-12">Company Milestones</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {milestones.map((m, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-xs font-bold text-[#FFBD2E] bg-[#FFBD2E]/10 px-2.5 py-1 rounded-full">{m.year}</span>
                  <h4 className="font-bold text-white text-base pt-2">{m.title}</h4>
                  <p className="text-xs text-white/50 leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Leadership Team */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white mb-4">Leadership Team</h2>
            <p className="text-white/50 text-sm">Meet the engineers, designers, and e-commerce veterans building Nexus.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {leadership.map((member, idx) => (
              <div key={idx} className="glass p-6 rounded-2xl border border-white/10 text-center space-y-3">
                <img src={member.image} alt={member.name} className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-[#FFBD2E]/40" />
                <div>
                  <h4 className="font-bold text-white text-lg">{member.name}</h4>
                  <p className="text-xs text-[#FFBD2E] font-semibold">{member.title}</p>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
