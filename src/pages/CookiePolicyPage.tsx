import { useState } from 'react';
import { 
  Cookie, ShieldCheck, ToggleLeft, ToggleRight, CheckCircle2, 
  Sliders, Server, Info
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';

export function CookiePolicyPage() {
  // Interactive Cookie Preferences State
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true
    functional: true,
    analytics: true,
    marketing: false,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const togglePref = (key: keyof typeof preferences) => {
    if (key === 'necessary') return; // Cannot disable
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePreferences = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const cookieList = [
    { name: '_nexus_session', category: 'Essential', duration: 'Session', purpose: 'Maintains merchant dashboard session and cart items.' },
    { name: '_shop_pay_token', category: 'Essential', duration: '1 Year', purpose: 'Enables 1-click accelerated checkout for remembered buyers.' },
    { name: '__cf_bm', category: 'Security', duration: '30 Minutes', purpose: 'Cloudflare bot management & DDoS shield security.' },
    { name: '_nx_analytics_id', category: 'Analytics', duration: '2 Years', purpose: 'Measures store visitor conversion rates & sales funnel steps.' },
    { name: '_fbp / _gcl_au', category: 'Marketing', duration: '90 Days', purpose: 'Tracks ad campaign conversion attribution for store merchants.' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        {/* Header Hero */}
        <section className="relative overflow-hidden py-16 border-b border-[#222642]/60">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FFBD2E]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#27C93F]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-wide text-[#FFBD2E] mb-6">
                <Cookie size={14} /> Cookie & Tracking Transparency • Updated September 2026
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                Nexus Commerce <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">Cookie Policy</span>
              </h1>
              <p className="text-lg text-secondary leading-relaxed mb-6">
                We believe in full transparency regarding how cookies, local storage, and tracking scripts operate across Nexus platform administration tools and merchant storefronts.
              </p>
            </div>
          </div>
        </section>

        {/* Content Layout */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Interactive Preference Manager */}
            <div className="lg:col-span-5 space-y-6">
              <div className="sticky top-28 glass p-6 rounded-2xl border border-[#FFBD2E]/40 bg-gradient-to-b from-[#FFBD2E]/5 to-transparent space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/20 border border-[#FFBD2E]/40 flex items-center justify-center text-[#FFBD2E]">
                    <Sliders size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Your Cookie Preferences</h3>
                    <p className="text-xs text-muted">Manage your active tracking permissions</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Category 1 */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Strictly Necessary</span>
                      <span className="text-[11px] text-muted">Required for login & shopping cart</span>
                    </div>
                    <span className="text-xs text-[#27C93F] font-bold px-2 py-1 bg-[#27C93F]/10 rounded">Always Active</span>
                  </div>

                  {/* Category 2 */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Functional & Preferences</span>
                      <span className="text-[11px] text-muted">Remembers currency & store language</span>
                    </div>
                    <button onClick={() => togglePref('functional')} className="text-[#FFBD2E]">
                      {preferences.functional ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-muted" />}
                    </button>
                  </div>

                  {/* Category 3 */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Performance & Analytics</span>
                      <span className="text-[11px] text-muted">Anonymous store usage analytics</span>
                    </div>
                    <button onClick={() => togglePref('analytics')} className="text-[#FFBD2E]">
                      {preferences.analytics ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-muted" />}
                    </button>
                  </div>

                  {/* Category 4 */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Marketing & Retargeting</span>
                      <span className="text-[11px] text-muted">Ad campaign conversion tracking</span>
                    </div>
                    <button onClick={() => togglePref('marketing')} className="text-[#FFBD2E]">
                      {preferences.marketing ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-muted" />}
                    </button>
                  </div>
                </div>

                <Button variant="primary" size="md" fullWidth onClick={handleSavePreferences}>
                  Save Cookie Preferences
                </Button>

                {savedSuccess && (
                  <div className="p-3 rounded-lg bg-[#27C93F]/10 border border-[#27C93F]/30 text-xs text-[#27C93F] font-semibold text-center flex items-center justify-center gap-2">
                    <CheckCircle2 size={14} /> Preferences saved to your browser!
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Policy Explanations */}
            <div className="lg:col-span-7 space-y-8">
              <div className="glass p-8 rounded-2xl border border-white/10 space-y-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Info size={22} className="text-[#FFBD2E]" /> What are Cookies & Local Storage?
                </h2>
                <p className="text-body text-sm leading-relaxed">
                  Cookies are small text files placed on your computer or mobile device when you visit websites. They are widely used to make websites work efficiently, remember your preferences (such as shopping cart contents or currency selection), and provide analytics information to store owners.
                </p>
                <p className="text-body text-sm leading-relaxed">
                  Nexus uses both first-party cookies (set directly by Nexus Commerce) and third-party cookies (set by authorized service providers like Cloudflare, Stripe, or Google Analytics).
                </p>
              </div>

              {/* Table of Active Platform Cookies */}
              <div className="glass p-8 rounded-2xl border border-white/10 space-y-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Server size={22} className="text-[#27C93F]" /> Platform Cookie Audit & Directory
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-strong">
                    <thead className="bg-white/5 text-muted uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4 rounded-l-lg">Cookie Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Duration</th>
                        <th className="py-3 px-4 rounded-r-lg">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {cookieList.map((c, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="py-3 px-4 font-mono text-[#FFBD2E]">{c.name}</td>
                          <td className="py-3 px-4 font-medium text-white">{c.category}</td>
                          <td className="py-3 px-4 text-secondary">{c.duration}</td>
                          <td className="py-3 px-4 text-body">{c.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Merchant Guidance on GDPR Banner */}
              <div className="glass p-8 rounded-2xl border border-white/10 space-y-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={22} className="text-[#FF5F56]" /> Guidance for Merchant Storefront Owners
                </h2>
                <p className="text-body text-sm leading-relaxed">
                  If you run an e-commerce store on Nexus selling to buyers in the European Union, United Kingdom, or California, you are required by law to display a compliant Cookie Consent Banner.
                </p>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
                  <span className="text-[#FFBD2E] font-bold block">Consent on your storefront</span>
                  <p className="text-secondary">
                    Nexus does not yet ship a consent banner for merchant storefronts. If
                    you add marketing or analytics scripts to your storefront, you are
                    responsible for collecting the consent your jurisdiction requires
                    before those scripts run.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
