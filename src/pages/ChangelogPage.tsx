import { useState } from 'react';
import { 
  Sparkles, CheckCircle2, Clock, ArrowRight, Tag, Zap
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function ChangelogPage() {
  const { navigate } = useApp();

  const releases = [
    {
      version: 'v4.2.0',
      date: 'September 2026',
      title: 'NexusIQ Merchant Copilot 4.2 & Shop Pay Cash Back',
      features: [
        'Introduced real-time inventory demand reorder forecasting in NexusIQ AI.',
        'Added 1-click Shop Pay cash back rewards integration.',
        'Sub-second landed cost duties (AvaTax) calculation for European Union stores.',
      ],
    },
    {
      version: 'v4.1.0',
      date: 'August 2026',
      title: 'Omnichannel POS Cash Drawer Balancing & Staff PIN Commissions',
      features: [
        'Added end-of-day register cash drawer balancing workflows.',
        'Staff PIN logins now track individual product sales commission rates.',
        'Offline transaction vault queue encryption for POS counter terminals.',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden text-center">
        <div className="absolute top-20 left-1/3 w-[550px] h-[380px] bg-[#FF5F56]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FF5F56]/40 bg-[#FF5F56]/10 text-[#FF5F56] text-xs font-medium mb-8 backdrop-blur-md">
            <Zap size={16} />
            <span>Nexus Platform Product Release Log</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6">
            What’s new in <br />
            <span className="text-gradient">Nexus Commerce.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10">
            See the latest platform features, performance speed improvements, and merchant tools released every month.
          </p>
        </div>
      </section>

      {/* Release Items */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          {releases.map((rel, idx) => (
            <div key={idx} className="glass rounded-3xl p-8 border border-white/10">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <span className="text-xs font-bold font-mono text-[#27C93F] bg-[#27C93F]/10 px-3 py-1 rounded-full border border-[#27C93F]/20">
                  {rel.version}
                </span>
                <span className="text-xs text-white/40">{rel.date}</span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-4">{rel.title}</h3>

              <ul className="space-y-3 text-xs sm:text-sm text-white/70">
                {rel.features.map((feat, fidx) => (
                  <li key={fidx} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-[#27C93F] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
