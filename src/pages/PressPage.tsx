import { useState } from 'react';
import { 
  FileText, Download, Globe, Sparkles, Image, 
  ExternalLink, Mail, CheckCircle2, Newspaper
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function PressPage() {
  const { navigate } = useApp();
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const mediaCoverage = [
    { outlet: 'TechCrunch', title: 'Nexus Commerce Raises $150M Series D to Challenge Legacy E-Commerce Monopolies', date: 'August 2026' },
    { outlet: 'Forbes', title: 'How NexusIQ AI Is Driving +42% Higher Conversion Rates for Global Retailers', date: 'June 2026' },
    { outlet: 'Wall Street Journal', title: 'Cross-Border E-Commerce Surge: Nexus Powers 175-Country Merchant Trade', date: 'April 2026' },
    { outlet: 'Bloomberg', title: 'The Omnichannel Retail Revolution: Nexus POS & Online Store Integration', date: 'January 2026' },
  ];

  const pressReleases = [
    { title: 'Nexus Commerce Announces 99.99% Uptime Commitment Across Global Edge Network', date: 'August 18, 2026' },
    { title: 'NexusIQ Launch: Bringing Single-Tenant Generative AI to 2.1 Million Store Owners', date: 'May 12, 2026' },
    { title: 'Nexus Payments Reaches $200B Annual Processed Commerce Volume Milestone', date: 'February 28, 2026' },
  ];

  const handleDownloadAsset = (assetName: string) => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 border-b border-[#222642]/60">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF5F56]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#FFBD2E]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#FF5F56] mb-6">
              <Newspaper size={14} /> Press & Media Relations
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight max-w-4xl mx-auto">
              Nexus Commerce <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">Press Room & Media Kit</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto leading-relaxed mb-10">
              Download official brand assets, access high-resolution executive photos, and review recent press releases about our global commerce cloud.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button variant="primary" size="lg" onClick={() => handleDownloadAsset('Full Press Kit Zip')}>
                Download Full Media Kit (.ZIP) <Download size={16} />
              </Button>
            </div>

            {downloadSuccess && (
              <div className="mt-4 p-3 rounded-lg bg-[#27C93F]/10 border border-[#27C93F]/30 text-xs text-[#27C93F] font-semibold inline-flex items-center gap-2">
                <CheckCircle2 size={16} /> Download started! Media kit zip file saving to your device.
              </div>
            )}
          </div>
        </section>

        {/* Media Highlights */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white mb-4">In The News</h2>
            <p className="text-white/50 text-sm">Feature coverage of Nexus Commerce in leading business & tech publications.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mediaCoverage.map((item, idx) => (
              <div key={idx} className="glass p-6 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#FFBD2E] uppercase tracking-wider">{item.outlet}</span>
                  <span className="text-xs text-white/40">{item.date}</span>
                </div>
                <h4 className="font-bold text-white text-lg leading-snug">{item.title}</h4>
                <div className="pt-2">
                  <span className="text-xs text-[#27C93F] font-semibold inline-flex items-center gap-1">
                    Read Article Coverage <ExternalLink size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Press Releases Timeline */}
        <section className="py-16 border-t border-white/5 bg-black/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold text-white mb-10 text-center">Official Press Releases</h2>
            <div className="space-y-4">
              {pressReleases.map((pr, idx) => (
                <div key={idx} className="glass p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-white/40 block">{pr.date}</span>
                    <h3 className="text-base font-bold text-white">{pr.title}</h3>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => handleDownloadAsset(pr.title)}>
                    Download PDF Release
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Media Contact Box */}
        <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass p-8 rounded-2xl border border-[#FFBD2E]/40 space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <Mail size={20} className="text-[#FFBD2E]" /> Press & Media Contact
            </h3>
            <p className="text-xs text-white/60 max-w-md mx-auto">
              For press inquiries, executive interview requests, or custom high-res logo formats, contact our PR communications team:
            </p>
            <span className="text-sm font-bold text-[#FFBD2E] block">press@nexuscommerce.io</span>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
