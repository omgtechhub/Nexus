import { useState } from 'react';
import { 
  Users, MessageSquare, Heart, ArrowRight, Sparkles, Globe, MapPin, Award
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function CommunityPage() {
  const { navigate } = useApp();

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden text-center">
        <div className="absolute top-20 left-1/3 w-[550px] h-[380px] bg-[#FFBD2E]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FFBD2E]/40 bg-[#FFBD2E]/10 text-[#FFBD2E] text-xs font-medium mb-8 backdrop-blur-md">
            <Users size={16} />
            <span>Nexus Merchant Community Hub</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Connect with 85,000+ <br />
            <span className="text-gradient">e-commerce store founders.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Share growth strategies, discuss conversion rate optimizations, meet local store owners, and learn from top-performing e-commerce brand builders.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#FFBD2E] via-[#FF5F56] to-[#27C93F] text-black font-bold"
              onClick={() => navigate('signup')}
              icon={<ArrowRight size={18} />}
              iconPosition="right"
            >
              Join Merchant Community
            </Button>
          </div>
        </div>
      </section>

      {/* Community Channels */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass rounded-2xl p-8 border border-white/10 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/20 text-[#FFBD2E] flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Merchant Discord & Slack</h3>
            <p className="text-xs text-white/60">Live chat channels for daily e-commerce Q&A, CRO feedback, and app recommendations.</p>
          </div>

          <div className="glass rounded-2xl p-8 border border-white/10 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/20 text-[#27C93F] flex items-center justify-center mx-auto mb-4">
              <MapPin size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Local Founder Meetups</h3>
            <p className="text-xs text-white/60">Monthly in-person networking events hosted in 40+ cities worldwide.</p>
          </div>

          <div className="glass rounded-2xl p-8 border border-white/10 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/20 text-[#FF5F56] flex items-center justify-center mx-auto mb-4">
              <Award size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Annual Commerce Summit</h3>
            <p className="text-xs text-white/60">Keynote presentations, growth masterclasses, and hands-on merchant workshops.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
