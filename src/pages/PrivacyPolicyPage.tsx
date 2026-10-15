import { useState } from 'react';
import { 
  ShieldCheck, Lock, Eye, FileText, Database, Globe, CheckCircle2, 
  UserCheck, Key, Server, Mail, ChevronRight, ArrowRight
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function PrivacyPolicyPage() {
  const { navigate } = useApp();
  const [activeSection, setActiveSection] = useState('overview');
  const [dsarSubmitted, setDsarSubmitted] = useState(false);
  const [dsarEmail, setDsarEmail] = useState('');
  const [dsarRequestType, setDsarRequestType] = useState('access');

  const sections = [
    { id: 'overview', title: '1. Overview & Scope' },
    { id: 'merchant-vs-customer', title: '2. Merchant vs Customer Data' },
    { id: 'data-collected', title: '3. Data We Collect' },
    { id: 'ai-privacy', title: '4. NexusIQ AI Privacy Guarantee' },
    { id: 'gdpr-ccpa', title: '5. GDPR & CCPA Compliance' },
    { id: 'subprocessors', title: '6. Approved Sub-Processors' },
    { id: 'security-retention', title: '7. Security & Data Retention' },
    { id: 'merchant-rights', title: '8. Your Rights & DSAR Portal' },
  ];

  const subprocessors = [
    { name: 'Amazon Web Services (AWS)', role: 'Primary Cloud Infrastructure & Database Hosting', location: 'USA / EU / APAC' },
    { name: 'Cloudflare, Inc.', role: 'Global Edge Content Delivery Network (CDN) & DDoS Shield', location: 'Global' },
    { name: 'Stripe, Inc.', role: 'PCI-DSS Level 1 Payment Processing Gateway', location: 'USA / EU' },
    { name: 'Snowflake & Databricks', role: 'Encrypted Merchant Analytics & Data Warehousing', location: 'USA' },
    { name: 'Twilio & SendGrid', role: 'Transactional SMS & Order Confirmation Email Dispatch', location: 'USA' },
  ];

  const handleDsarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dsarEmail) {
      setDsarSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-primary flex flex-col font-sans">
      <Navbar />

      <main id="main" tabIndex={-1} className="flex-1 pt-24 pb-16">
        {/* Header Hero */}
        <section className="relative overflow-hidden py-16 border-b border-[var(--line)]/60">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#FF5F56]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#FFBD2E]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-xs font-semibold tracking-wide text-[var(--brand-green-ink)] mb-6">
                <ShieldCheck size={14} /> Global E-Commerce Data Standard • Effective September 2026
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary mb-6 leading-tight">
                Nexus Commerce <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">Privacy Policy</span>
              </h1>
              <p className="text-lg text-secondary leading-relaxed mb-6">
                Protecting seller business data and buyer personal information is foundational to our mission. This document outlines how Nexus Commerce collects, processes, encrypts and safeguards that data across the marketplace.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5"><Lock size={12} className="text-[var(--brand-green-ink)]" /> AES-256 Encrypted</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><Globe size={12} className="text-[var(--brand-yellow-ink)]" /> EU-US Data Privacy Framework Certified</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><FileText size={12} className="text-[var(--brand-red-ink)]" /> Version 4.2</span>
              </div>
            </div>
          </div>
        </section>

        {/* Content Layout */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-4">
              <div className="sticky top-28 glass p-5 rounded-2xl border border-[var(--ink)]/10 space-y-2">
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider px-3 mb-3">Policy Navigation</h3>
                {sections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveSection(s.id);
                      document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-between ${
                      activeSection === s.id
                        ? 'bg-gradient-to-r from-[#FF5F56]/20 to-[#FFBD2E]/20 text-primary border border-[#FFBD2E]/40 font-semibold'
                        : 'text-secondary hover:text-primary hover:bg-[var(--ink)]/5'
                    }`}
                  >
                    <span>{s.title}</span>
                    <ChevronRight size={14} className={activeSection === s.id ? 'text-[var(--brand-yellow-ink)]' : 'opacity-0'} />
                  </button>
                ))}

                <div className="pt-4 border-t border-[var(--ink)]/10 mt-4">
                  <div className="p-4 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/30">
                    <p className="text-xs text-strong font-medium mb-2">Need a Data Processing Addendum (DPA)?</p>
                    <button aria-label="Forward"
                      onClick={() => navigate('contact')}
                      className="text-xs text-[var(--brand-red-ink)] font-bold hover:underline flex items-center gap-1"
                    >
                      Request a DPA <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Policy Content */}
            <div className="lg:col-span-8 space-y-12">
              {/* Section 1: Overview */}
              <div id="overview" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/30 flex items-center justify-center text-[var(--brand-red-ink)]">
                    <ShieldCheck size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">1. Overview & Scope</h2>
                </div>
                <p className="text-body leading-relaxed">
                  Nexus Commerce Inc. ("Nexus", "we", "us", or "our") operates the Nexus marketplace, including its shared shopfront and checkout, the seller dashboard, Nexus Payments infrastructure, the NexusIQ assistant and our developer APIs.
                </p>
                <p className="text-body leading-relaxed">
                  This Privacy Policy applies to all sellers, platform developers and shoppers using the Nexus marketplace. By accessing or using Nexus services, you acknowledge the data processing practices described in this policy.
                </p>
              </div>

              {/* Section 2: Merchant vs Customer Data */}
              <div id="merchant-vs-customer" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 flex items-center justify-center text-[var(--brand-yellow-ink)]">
                    <Database size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">2. Merchant vs Customer Data (Controller & Processor Roles)</h2>
                </div>
                <p className="text-body leading-relaxed">
                  Under global data protection legislation including the European Union General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-5 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-2">
                    <h4 className="font-bold text-[var(--brand-yellow-ink)] text-sm">Nexus as Data Controller</h4>
                    <p className="text-xs text-secondary leading-relaxed">
                      We act as the Data Controller for your Nexus seller account information, billing details, team logins, and technical telemetry collected when you manage your listings and orders.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-2">
                    <h4 className="font-bold text-[var(--brand-green-ink)] text-sm">Nexus as Data Processor</h4>
                    <p className="text-xs text-secondary leading-relaxed">
                      You (the Merchant) are the Data Controller for your end-customers' personal data (names, shipping addresses, order histories). Nexus acts strictly as a Data Processor under your explicit direction.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Data We Collect */}
              <div id="data-collected" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[var(--brand-green-ink)]">
                    <Eye size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">3. Data We Collect & Method of Collection</h2>
                </div>
                <div className="space-y-4 text-body text-sm">
                  <p className="leading-relaxed">
                    We collect personal and transactional data through direct seller input, marketplace cookies, API webhooks and our payment partners:
                  </p>
                  <ul className="space-y-2.5 list-disc list-inside text-strong">
                    <li><strong className="text-primary">Seller Account Profile:</strong> Full name, business email address, phone number, business name, tax identification number, and bank settlement details.</li>
                    <li><strong className="text-primary">Shopper Information:</strong> Billing &amp; delivery address, recipient phone number, items purchased, bag contents, and order notes.</li>
                    <li><strong className="text-primary">Financial &amp; Payment Data:</strong> Tokenised card references, bank settlement tokens and transaction risk scores. We never receive or store a full card number.</li>
                    <li><strong className="text-primary">Device & Technical Telemetry:</strong> IP addresses, browser fingerprint, device type, geo-location, and session cookies for fraud prevention.</li>
                  </ul>
                </div>
              </div>

              {/* Section 4: AI Privacy Guarantee */}
              <div id="ai-privacy" className="glass p-8 rounded-2xl border border-[#FFBD2E]/40 bg-gradient-to-br from-[#FFBD2E]/5 to-transparent space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/20 border border-[#FFBD2E]/50 flex items-center justify-center text-[var(--brand-yellow-ink)]">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-primary">4. NexusIQ AI Privacy Guarantee</h2>
                    <p className="text-xs text-[var(--brand-yellow-ink)] font-semibold">Strict Tenant Isolation & Zero Model Training</p>
                  </div>
                </div>
                <p className="text-strong leading-relaxed text-sm">
                  NexusIQ powers automated product descriptions, customer support chatbots, sales forecasting, and inventory optimization. We maintain strict ethical AI standards:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-[var(--surface-3)] border border-[var(--ink)]/10 space-y-2">
                    <div className="flex items-center gap-2 text-[var(--brand-green-ink)] text-xs font-bold">
                      <CheckCircle2 size={14} /> Zero Public LLM Training
                    </div>
                    <p className="text-xs text-secondary">
                      Your own sales numbers, catalogue data and assistant conversations are NEVER used to train shared public foundation models.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface-3)] border border-[var(--ink)]/10 space-y-2">
                    <div className="flex items-center gap-2 text-[var(--brand-green-ink)] text-xs font-bold">
                      <CheckCircle2 size={14} /> Encrypted Vector Storage
                    </div>
                    <p className="text-xs text-secondary">
                      Voice recordings sent to NexusIQ are transcribed within the request and discarded; what is retained is a mathematical voiceprint used only to check that a spoken command came from you.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 5: GDPR & CCPA */}
              <div id="gdpr-ccpa" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/30 flex items-center justify-center text-[var(--brand-red-ink)]">
                    <Globe size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">5. Global Compliance (GDPR, CCPA & International Transfers)</h2>
                </div>
                <p className="text-body leading-relaxed text-sm">
                  Nexus maintains full compliance with the European Union General Data Protection Regulation (GDPR), UK GDPR, California Consumer Privacy Act (CCPA/CPRA), and Brazil LGPD:
                </p>
                <div className="space-y-3 text-xs text-body">
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10">
                    <strong className="text-primary text-sm block mb-1">Standard Contractual Clauses (SCCs)</strong>
                    Cross-border transfers of European buyer data to US data centers are executed under approved EU Standard Contractual Clauses with supplemental encryption measures.
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10">
                    <strong className="text-primary text-sm block mb-1">Do Not Sell My Personal Information (CCPA)</strong>
                    Nexus does not sell or rent merchant or customer personal data to third-party data brokers under any circumstances.
                  </div>
                </div>
              </div>

              {/* Section 6: Approved Sub-Processors */}
              <div id="subprocessors" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[var(--brand-green-ink)]">
                    <Server size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">6. Approved Sub-Processors</h2>
                </div>
                <p className="text-body text-sm">
                  To run the marketplace, its payments and its deliveries, Nexus engages vetted third-party sub-processors bound by data processing agreements:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-strong">
                    <thead className="bg-[var(--ink)]/5 text-muted uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4 rounded-l-lg">Sub-Processor Name</th>
                        <th className="py-3 px-4">Service Provided</th>
                        <th className="py-3 px-4 rounded-r-lg">Data Processing Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ink)]/5">
                      {subprocessors.map((sp, idx) => (
                        <tr key={idx} className="hover:bg-[var(--ink)]/5">
                          <td className="py-3 px-4 font-semibold text-primary">{sp.name}</td>
                          <td className="py-3 px-4 text-secondary">{sp.role}</td>
                          <td className="py-3 px-4 text-[var(--brand-yellow-ink)] font-medium">{sp.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 7: Security & Data Retention */}
              <div id="security-retention" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 flex items-center justify-center text-[var(--brand-yellow-ink)]">
                    <Key size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">7. Security Safeguards & Data Retention</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  We implement enterprise-grade technical and organizational security standards across all systems:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-1">
                    <span className="text-[var(--brand-green-ink)] font-bold block">TLS 1.3 & AES-256</span>
                    <p className="text-muted">All data in transit is encrypted using TLS 1.3. Databases are encrypted at rest with AES-256 keys.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-1">
                    <span className="text-[var(--brand-yellow-ink)] font-bold block">SOC 2 Type II</span>
                    <p className="text-muted">Audited annually by independent cybersecurity firms for security, availability, and confidentiality.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-1">
                    <span className="text-[var(--brand-red-ink)] font-bold block">7-Year Retention</span>
                    <p className="text-muted">Financial transaction logs are retained for 7 years to satisfy statutory tax obligations, then purged.</p>
                  </div>
                </div>
              </div>

              {/* Section 8: Your Rights & DSAR Portal */}
              <div id="merchant-rights" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[var(--brand-green-ink)]">
                    <UserCheck size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">8. Your Data Rights & Data Subject Request Portal</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  As a seller or a shopper, you have the right to request access to, correction of, or permanent deletion of your personal data held on Nexus servers.
                </p>

                {/* DSAR Interactive Form */}
                <div className="p-6 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-4">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <Mail size={16} className="text-[var(--brand-yellow-ink)]" /> Submit a Data Privacy Request (DSAR)
                  </h3>

                  {dsarSubmitted ? (
                    <div className="p-4 rounded-lg bg-[#27C93F]/10 border border-[#27C93F]/30 text-[var(--brand-green-ink)] text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 size={16} /> Request received! Check {dsarEmail} for verification instructions to proceed.
                    </div>
                  ) : (
                    <form onSubmit={handleDsarSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="privacypolicypage-your-email-address-1" className="block text-xs text-secondary mb-1">Your Email Address</label>
                          <input id="privacypolicypage-your-email-address-1"
                            type="email"
                            required
                            value={dsarEmail}
                            onChange={(e) => setDsarEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-primary text-xs focus:outline-none focus:border-[#FFBD2E]"
                          />
                        </div>
                        <div>
                          <label htmlFor="privacypolicypage-request-type-2" className="block text-xs text-secondary mb-1">Request Type</label>
                          <select id="privacypolicypage-request-type-2"
                            value={dsarRequestType}
                            onChange={(e) => setDsarRequestType(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--input-bg)] border border-[var(--ink)]/10 text-primary text-xs focus:outline-none focus:border-[#FFBD2E]"
                          >
                            <option value="access">Download Data Copy (Access)</option>
                            <option value="deletion">Right to Be Forgotten (Delete)</option>
                            <option value="optout">Opt-Out of Data Processing</option>
                          </select>
                        </div>
                      </div>
                      <Button variant="primary" size="sm" type="submit">
                        Submit Privacy Request
                      </Button>
                    </form>
                  )}
                </div>

                <div className="text-xs text-muted pt-4 border-t border-[var(--ink)]/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span>Data Protection Officer (DPO): dpo@nexuscommerce.io</span>
                  {/* The same head office the contact page gives. Two pages naming
                      two different legal addresses is the kind of detail a
                      regulator reads first. */}
                  <span>Nexus Legal HQ: 12 Gana Street, Maitama, Abuja 900271, FCT, Nigeria</span>
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
