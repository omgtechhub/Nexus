import { useState } from 'react';
import { 
  Briefcase, Sparkles, 
  MapPin, CheckCircle2
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';

export function CareersPage() {
  const [selectedDept, setSelectedDept] = useState('all');
  const [appliedRole, setAppliedRole] = useState<string | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [appSubmitted, setAppSubmitted] = useState(false);

  const openRoles = [
    { id: 'eng-1', title: 'Senior Distributed Systems Engineer (Rust / Go)', dept: 'Engineering', location: 'Remote (US/EU)', type: 'Full-time', desc: 'Build low-latency edge checkout infrastructure handling 100k+ concurrent requests/sec.' },
    { id: 'ai-1', title: 'Staff Machine Learning Engineer (AI Commerce)', dept: 'AI Research', location: 'Remote (Global)', type: 'Full-time', desc: 'Train fine-tuned models for automated catalog copywriting, CRO, and merchant predictive analytics.' },
    { id: 'prod-1', title: 'Lead Product Manager — Nexus Payments', dept: 'Product', location: 'San Francisco / Remote', type: 'Full-time', desc: 'Own end-to-end payment gateway integrations, fraud protection engines, and Shop Pay expansion.' },
    { id: 'cs-1', title: 'Enterprise Merchant Success Manager', dept: 'Merchant Success', location: 'Remote (US/APAC)', type: 'Full-time', desc: 'Guide $50M+ ARR enterprise retail clients through multi-storefront migrations and custom API setups.' },
    { id: 'eng-2', title: 'Frontend Systems Specialist (React / Liquid / WASM)', dept: 'Engineering', location: 'Remote (Global)', type: 'Full-time', desc: 'Develop ultra-fast Liquid theme rendering engines and responsive storefront UI components.' },
  ];

  const benefits = [
    { title: '100% Remote-First Culture', desc: 'Work from anywhere in the world. We equip you with high-speed internet and flexible work hours.' },
    { title: 'Unlimited PTO & Paid Wellness', desc: 'Minimum 4 weeks mandatory vacation, plus monthly wellness stipends and mental health days.' },
    { title: 'Top-Tier Compensation & Equity', desc: 'Competitive salary packages with early-stage stock options and annual performance bonuses.' },
    { title: '$3,500 Workstation Stipend', desc: 'Custom MacBook Pro, ergonomic desk, 4K monitors, and home office budget provided on day one.' },
  ];

  const filteredRoles = selectedDept === 'all' 
    ? openRoles 
    : openRoles.filter(r => r.dept.toLowerCase() === selectedDept.toLowerCase());

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (applicantEmail && applicantName) {
      setAppSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 border-b border-[#222642]/60">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#27C93F]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#FFBD2E]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#27C93F] mb-6">
              <Briefcase size={14} /> We Are Hiring Global Talent
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight max-w-4xl mx-auto">
              Help us power the next generation of <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">global commerce.</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto leading-relaxed mb-10">
              Join a high-velocity, remote-first team building the universal e-commerce cloud for 2.1M+ store owners across 175 countries.
            </p>
          </div>
        </section>

        {/* Culture & Benefits */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white mb-4">Why Work at Nexus?</h2>
            <p className="text-white/50 text-sm">We invest heavily in our team so everyone can do the best work of their careers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, idx) => (
              <div key={idx} className="glass p-6 rounded-2xl border border-white/10 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[#27C93F]">
                  <Sparkles size={20} />
                </div>
                <h4 className="font-bold text-white text-base">{b.title}</h4>
                <p className="text-xs text-white/50 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Open Roles Section */}
        <section className="py-16 border-t border-white/5 bg-black/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-extrabold text-white">Open Positions ({openRoles.length})</h2>
                <p className="text-xs text-white/50">Filter by department to find your match</p>
              </div>

              {/* Department Filters */}
              <div className="flex flex-wrap gap-2">
                {['all', 'Engineering', 'AI Research', 'Product', 'Merchant Success'].map(dept => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDept(dept)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedDept === dept
                        ? 'bg-gradient-to-r from-[#FF5F56] to-[#FFBD2E] text-white shadow-lg'
                        : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                    }`}
                  >
                    {dept === 'all' ? 'All Roles' : dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Roles List */}
            <div className="space-y-4">
              {filteredRoles.map(role => (
                <div key={role.id} className="glass p-6 rounded-2xl border border-white/10 hover:border-[#FFBD2E]/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#FFBD2E] bg-[#FFBD2E]/10 px-2.5 py-0.5 rounded-full">{role.dept}</span>
                      <span className="text-xs text-white/40 flex items-center gap-1"><MapPin size={12} /> {role.location}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{role.title}</h3>
                    <p className="text-xs text-white/60 leading-relaxed">{role.desc}</p>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => setAppliedRole(role.title)}>
                    Apply Now
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Modal / Application Form */}
        {appliedRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setAppliedRole(null); setAppSubmitted(false); }} />
            <div className="relative z-10 w-full max-w-lg glass p-8 rounded-2xl border border-white/10 space-y-6">
              <h3 className="text-xl font-bold text-white">Apply for {appliedRole}</h3>

              {appSubmitted ? (
                <div className="p-4 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 text-[#27C93F] text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={18} /> Application submitted successfully! Our recruiting team will review your resume within 48 hours.
                </div>
              ) : (
                <form onSubmit={handleApplySubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={applicantEmail}
                      onChange={(e) => setApplicantEmail(e.target.value)}
                      placeholder="jane@domain.com"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">LinkedIn / Portfolio URL</label>
                    <input
                      type="url"
                      required
                      placeholder="https://linkedin.com/in/janedoe"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="primary" size="sm" type="submit">Submit Application</Button>
                    <Button variant="ghost" size="sm" type="button" onClick={() => setAppliedRole(null)}>Cancel</Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
