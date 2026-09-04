import { useState } from 'react';
import { 
  TrendingUp, ShieldCheck, DollarSign, FileText, Download, 
  BarChart3, Globe, Building2, CheckCircle2, ArrowRight
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function InvestorsPage() {
  const { navigate } = useApp();
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const fundingRounds = [
    { round: 'Series D', amount: '$150M', valuation: '$4.2B', lead: 'Sequoia Capital', date: 'Q3 2026' },
    { round: 'Series C', amount: '$85M', valuation: '$2.1B', lead: 'Andreessen Horowitz (a16z)', date: 'Q2 2025' },
    { round: 'Series B', amount: '$40M', valuation: '$900M', lead: 'Accel Partners', date: 'Q1 2024' },
    { round: 'Series A', amount: '$15M', valuation: '$250M', lead: 'Y Combinator Continuity', date: 'Q4 2022' },
  ];

  const financialMetrics = [
    { label: 'Annual Gross Merchandise Volume (GMV)', value: '$200B+', note: '+64% YoY growth' },
    { label: 'Net Revenue Retention (NRR)', value: '145%', note: 'Top 1% SaaS benchmark' },
    { label: 'Total Active Storefronts', value: '2.1M+', note: 'Across 175 countries' },
    { label: 'Gross Profit Margin', value: '78%', note: 'High-margin software & payment splits' },
  ];

  const handleDownloadReport = (reportName: string) => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 border-b border-[#222642]/60">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#FFBD2E]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#27C93F]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#FFBD2E] mb-6">
              <TrendingUp size={14} /> Investor Relations & Capital Growth
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight max-w-4xl mx-auto">
              Building the infrastructure for <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">$1 Trillion in global trade.</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto leading-relaxed mb-10">
              Nexus Commerce is backed by world-class venture firms. Explore our financial metrics, institutional funding history, and governance reports.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button variant="primary" size="lg" onClick={() => handleDownloadReport('Annual Financial Report 2026')}>
                Download 2026 Financial Report (.PDF) <Download size={16} />
              </Button>
            </div>

            {downloadSuccess && (
              <div className="mt-4 p-3 rounded-lg bg-[#27C93F]/10 border border-[#27C93F]/30 text-xs text-[#27C93F] font-semibold inline-flex items-center gap-2">
                <CheckCircle2 size={16} /> Report downloaded! PDF saving to your downloads folder.
              </div>
            )}
          </div>
        </section>

        {/* Financial Performance Highlights */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white mb-4">Financial Highlights</h2>
            <p className="text-white/50 text-sm">Key operating and financial performance indicators for FY 2026.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {financialMetrics.map((m, idx) => (
              <div key={idx} className="glass p-6 rounded-2xl border border-white/10 space-y-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#FFBD2E] block">{m.value}</span>
                <h4 className="font-bold text-white text-sm">{m.label}</h4>
                <p className="text-xs text-[#27C93F] font-semibold">{m.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Funding History Table */}
        <section className="py-16 border-t border-white/5 bg-black/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold text-white mb-10 text-center">Institutional Funding History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white/80">
                <thead className="bg-white/5 text-white/40 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 rounded-l-lg">Round</th>
                    <th className="py-3.5 px-4">Capital Raised</th>
                    <th className="py-3.5 px-4">Post-Money Valuation</th>
                    <th className="py-3.5 px-4">Lead Investor</th>
                    <th className="py-3.5 px-4 rounded-r-lg">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {fundingRounds.map((r, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="py-4 px-4 font-bold text-[#FFBD2E]">{r.round}</td>
                      <td className="py-4 px-4 font-semibold text-white">{r.amount}</td>
                      <td className="py-4 px-4 text-[#27C93F] font-bold">{r.valuation}</td>
                      <td className="py-4 px-4 text-white/80">{r.lead}</td>
                      <td className="py-4 px-4 text-white/40">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Investor Relations Contact */}
        <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass p-8 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <Building2 size={20} className="text-[#27C93F]" /> Investor Relations Office
            </h3>
            <p className="text-xs text-white/60 max-w-md mx-auto">
              For institutional investor inquiries, shareholder communications, or SEC compliance requests:
            </p>
            <span className="text-sm font-bold text-[#27C93F] block">ir@nexuscommerce.io</span>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
