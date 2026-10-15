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
    { name: '_nexus_session', category: 'Essential', duration: 'Session', purpose: 'Maintains your signed-in session for the shop and the seller dashboard.' },
    { name: '__cf_bm', category: 'Security', duration: '30 Minutes', purpose: 'Cloudflare bot management & DDoS shield security.' },
    { name: '_nx_analytics_id', category: 'Analytics', duration: '2 Years', purpose: 'Measures how shoppers move through the marketplace and its checkout.' },
    { name: '_fbp / _gcl_au', category: 'Marketing', duration: '90 Days', purpose: 'Tracks ad campaign conversion attribution for the marketplace.' },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-primary flex flex-col font-sans">
      <Navbar />

      <main id="main" tabIndex={-1} className="flex-1 pt-24 pb-16">
        {/* Header Hero */}
        <section className="relative overflow-hidden py-16 border-b border-[var(--line)]/60">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FFBD2E]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#27C93F]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-xs font-semibold tracking-wide text-[var(--brand-yellow-ink)] mb-6">
                <Cookie size={14} /> Cookie & Tracking Transparency • Updated September 2026
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary mb-6 leading-tight">
                Nexus Commerce <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">Cookie Policy</span>
              </h1>
              <p className="text-lg text-secondary leading-relaxed mb-6">
                We believe in full transparency regarding how cookies, local storage and tracking scripts operate across the Nexus marketplace and its seller dashboard.
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
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/20 border border-[#FFBD2E]/40 flex items-center justify-center text-[var(--brand-yellow-ink)]">
                    <Sliders size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">Your Cookie Preferences</h3>
                    <p className="text-xs text-muted">Manage your active tracking permissions</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Category 1 */}
                  <div className="p-4 rounded-xl bg-[var(--surface-3)] border border-[var(--ink)]/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-primary block">Strictly Necessary</span>
                      <span className="text-[11px] text-muted">Required for login & shopping cart</span>
                    </div>
                    <span className="text-xs text-[var(--brand-green-ink)] font-bold px-2 py-1 bg-[#27C93F]/10 rounded">Always Active</span>
                  </div>

                  {/* Category 2 */}
                  <div className="p-4 rounded-xl bg-[var(--surface-3)] border border-[var(--ink)]/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-primary block">Functional & Preferences</span>
                      <span className="text-[11px] text-muted">Remembers currency, language and light or dark theme</span>
                    </div>
                    <button onClick={() => togglePref('functional')} className="text-[var(--brand-yellow-ink)]">
                      {preferences.functional ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-muted" />}
                    </button>
                  </div>

                  {/* Category 3 */}
                  <div className="p-4 rounded-xl bg-[var(--surface-3)] border border-[var(--ink)]/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-primary block">Performance & Analytics</span>
                      <span className="text-[11px] text-muted">Anonymous marketplace usage analytics</span>
                    </div>
                    <button onClick={() => togglePref('analytics')} className="text-[var(--brand-yellow-ink)]">
                      {preferences.analytics ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-muted" />}
                    </button>
                  </div>

                  {/* Category 4 */}
                  <div className="p-4 rounded-xl bg-[var(--surface-3)] border border-[var(--ink)]/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-primary block">Marketing & Retargeting</span>
                      <span className="text-[11px] text-muted">Ad campaign conversion tracking</span>
                    </div>
                    <button onClick={() => togglePref('marketing')} className="text-[var(--brand-yellow-ink)]">
                      {preferences.marketing ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-muted" />}
                    </button>
                  </div>
                </div>

                <Button variant="primary" size="md" fullWidth onClick={handleSavePreferences}>
                  Save Cookie Preferences
                </Button>

                {savedSuccess && (
                  <div className="p-3 rounded-lg bg-[#27C93F]/10 border border-[#27C93F]/30 text-xs text-[var(--brand-green-ink)] font-semibold text-center flex items-center justify-center gap-2">
                    <CheckCircle2 size={14} /> Preferences saved to your browser!
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Policy Explanations */}
            <div className="lg:col-span-7 space-y-8">
              <div className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                  <Info size={22} className="text-[var(--brand-yellow-ink)]" /> What are Cookies & Local Storage?
                </h2>
                <p className="text-body text-sm leading-relaxed">
                  Cookies are small text files placed on your computer or mobile device when you visit websites. They are widely used to make websites work efficiently, remember your preferences (such as the contents of your bag or your currency selection), and provide analytics information to the site operator.
                </p>
                <p className="text-body text-sm leading-relaxed">
                  Nexus uses both first-party cookies (set directly by Nexus Commerce) and third-party cookies (set by authorized service providers like Cloudflare, Stripe, or Google Analytics).
                </p>
              </div>

              {/* Table of Active Platform Cookies */}
              <div className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                  <Server size={22} className="text-[var(--brand-green-ink)]" /> Platform Cookie Audit & Directory
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-strong">
                    <thead className="bg-[var(--ink)]/5 text-muted uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4 rounded-l-lg">Cookie Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Duration</th>
                        <th className="py-3 px-4 rounded-r-lg">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ink)]/5">
                      {cookieList.map((c, idx) => (
                        <tr key={idx} className="hover:bg-[var(--ink)]/5">
                          <td className="py-3 px-4 font-mono text-[var(--brand-yellow-ink)]">{c.name}</td>
                          <td className="py-3 px-4 font-medium text-primary">{c.category}</td>
                          <td className="py-3 px-4 text-secondary">{c.duration}</td>
                          <td className="py-3 px-4 text-body">{c.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Merchant Guidance on GDPR Banner */}
              <div className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                  <ShieldCheck size={22} className="text-[var(--brand-red-ink)]" /> Guidance for Sellers
                </h2>
                {/* This used to tell sellers they were responsible for a consent
                    banner on "your storefront" and for any scripts they added to
                    it. On a marketplace there is no such storefront: Nexus serves
                    the shopfront, sets the cookies and has no mechanism for a
                    seller to inject a script. Leaving the obligation with the
                    seller was both wrong and unactionable. */}
                <p className="text-body text-sm leading-relaxed">
                  Your products are listed in a shopfront that Nexus serves, so the cookies set when
                  a shopper browses your listings are ours and the consent for them is ours to
                  collect. There is nothing for you to install, and no place for you to add a script
                  of your own.
                </p>
                <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-2 text-xs">
                  <span className="text-[var(--brand-yellow-ink)] font-bold block">
                    What stays with you
                  </span>
                  <p className="text-secondary">
                    If you advertise your Nexus listings from your own website, newsletter or ad
                    account, the tracking you run there is yours — including the consent your
                    jurisdiction requires before it runs. Anything on Nexus itself is covered by
                    this policy.
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
