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
    <div className="min-h-screen bg-[#0B0D1B] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        {/* Header Hero */}
        <section className="relative overflow-hidden py-16 border-b border-[#222642]/60">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#FF5F56]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#FFBD2E]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-wide text-[#27C93F] mb-6">
                <ShieldCheck size={14} /> Global E-Commerce Data Standard • Effective September 2026
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                Nexus Commerce <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">Privacy Policy</span>
              </h1>
              <p className="text-lg text-secondary leading-relaxed mb-6">
                Protecting merchant business data and buyer personal information is foundational to our mission. This document outlines how Nexus Commerce collects, processes, encrypts, and safeguards your store data across our global commerce cloud.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5"><Lock size={12} className="text-[#27C93F]" /> AES-256 Encrypted</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><Globe size={12} className="text-[#FFBD2E]" /> EU-US Data Privacy Framework Certified</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><FileText size={12} className="text-[#FF5F56]" /> Version 4.2</span>
              </div>
            </div>
          </div>
        </section>

        {/* Content Layout */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-4">
              <div className="sticky top-28 glass p-5 rounded-2xl border border-white/10 space-y-2">
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
                        ? 'bg-gradient-to-r from-[#FF5F56]/20 to-[#FFBD2E]/20 text-white border border-[#FFBD2E]/40 font-semibold'
                        : 'text-secondary hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{s.title}</span>
                    <ChevronRight size={14} className={activeSection === s.id ? 'text-[#FFBD2E]' : 'opacity-0'} />
                  </button>
                ))}

                <div className="pt-4 border-t border-white/10 mt-4">
                  <div className="p-4 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/30">
                    <p className="text-xs text-strong font-medium mb-2">Need a Data Processing Addendum (DPA)?</p>
                    <button aria-label="Forward"
                      onClick={() => navigate('contact')}
                      className="text-xs text-[#FF5F56] font-bold hover:underline flex items-center gap-1"
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
              <div id="overview" className="glass p-8 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/30 flex items-center justify-center text-[#FF5F56]">
                    <ShieldCheck size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">1. Overview & Scope</h2>
                </div>
                <p className="text-body leading-relaxed">
                  Nexus Commerce Inc. ("Nexus", "we", "us", or "our") operates the Nexus AI-powered e-commerce platform, including our storefront builder, Point of Sale (POS) applications, Nexus Payments infrastructure, NexusIQ artificial intelligence models, and developer APIs.
                </p>
                <p className="text-body leading-relaxed">
                  This Privacy Policy applies to all store merchants, agency partners, platform developers, and end-consumer buyers interacting with stores hosted on the Nexus platform. By accessing or using Nexus services, you acknowledge the data processing practices described in this policy.
                </p>
              </div>

              {/* Section 2: Merchant vs Customer Data */}
              <div id="merchant-vs-customer" className="glass p-8 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 flex items-center justify-center text-[#FFBD2E]">
                    <Database size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">2. Merchant vs Customer Data (Controller & Processor Roles)</h2>
                </div>
                <p className="text-body leading-relaxed">
                  Under global data protection legislation including the European Union General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <h4 className="font-bold text-[#FFBD2E] text-sm">Nexus as Data Controller</h4>
                    <p className="text-xs text-secondary leading-relaxed">
                      We act as the Data Controller for your Nexus merchant account information, billing details, staff logins, and technical telemetry collected when you manage your store.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <h4 className="font-bold text-[#27C93F] text-sm">Nexus as Data Processor</h4>
                    <p className="text-xs text-secondary leading-relaxed">
                      You (the Merchant) are the Data Controller for your end-customers' personal data (names, shipping addresses, order histories). Nexus acts strictly as a Data Processor under your explicit direction.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Data We Collect */}
              <div id="data-collected" className="glass p-8 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[#27C93F]">
                    <Eye size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">3. Data We Collect & Method of Collection</h2>
                </div>
                <div className="space-y-4 text-body text-sm">
                  <p className="leading-relaxed">
                    We collect personal and transactional data through direct merchant input, automated storefront cookies, API webhooks, and integrated payment terminals:
                  </p>
                  <ul className="space-y-2.5 list-disc list-inside text-strong">
                    <li><strong className="text-white">Merchant Account Profile:</strong> Full name, corporate email address, phone number, store domain, tax identification number, and bank settlement details.</li>
                    <li><strong className="text-white">Store Buyer Information:</strong> Customer billing & shipping address, recipient phone number, items purchased, cart history, and order notes.</li>
                    <li><strong className="text-white">Financial & Payment Data:</strong> Credit card tokenized numbers, bank routing tokens, Shop Pay 1-click credentials, and transaction risk scores.</li>
                    <li><strong className="text-white">Device & Technical Telemetry:</strong> IP addresses, browser fingerprint, device type, geo-location, and session cookies for fraud prevention.</li>
                  </ul>
                </div>
              </div>

              {/* Section 4: AI Privacy Guarantee */}
              <div id="ai-privacy" className="glass p-8 rounded-2xl border border-[#FFBD2E]/40 bg-gradient-to-br from-[#FFBD2E]/5 to-transparent space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/20 border border-[#FFBD2E]/50 flex items-center justify-center text-[#FFBD2E]">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">4. NexusIQ AI Privacy Guarantee</h2>
                    <p className="text-xs text-[#FFBD2E] font-semibold">Strict Tenant Isolation & Zero Model Training</p>
                  </div>
                </div>
                <p className="text-strong leading-relaxed text-sm">
                  NexusIQ powers automated product descriptions, customer support chatbots, sales forecasting, and inventory optimization. We maintain strict ethical AI standards:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-[#27C93F] text-xs font-bold">
                      <CheckCircle2 size={14} /> Zero Public LLM Training
                    </div>
                    <p className="text-xs text-secondary">
                      Your store's proprietary sales numbers, catalog data, and customer chat logs are NEVER used to train shared public foundation models.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-[#27C93F] text-xs font-bold">
                      <CheckCircle2 size={14} /> Encrypted Vector Storage
                    </div>
                    <p className="text-xs text-secondary">
                      All embeddings generated for NexusIQ store searches are encrypted in single-tenant vector stores isolated by merchant ID.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 5: GDPR & CCPA */}
              <div id="gdpr-ccpa" className="glass p-8 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/30 flex items-center justify-center text-[#FF5F56]">
                    <Globe size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">5. Global Compliance (GDPR, CCPA & International Transfers)</h2>
                </div>
                <p className="text-body leading-relaxed text-sm">
                  Nexus maintains full compliance with the European Union General Data Protection Regulation (GDPR), UK GDPR, California Consumer Privacy Act (CCPA/CPRA), and Brazil LGPD:
                </p>
                <div className="space-y-3 text-xs text-body">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <strong className="text-white text-sm block mb-1">Standard Contractual Clauses (SCCs)</strong>
                    Cross-border transfers of European buyer data to US data centers are executed under approved EU Standard Contractual Clauses with supplemental encryption measures.
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <strong className="text-white text-sm block mb-1">Do Not Sell My Personal Information (CCPA)</strong>
                    Nexus does not sell or rent merchant or customer personal data to third-party data brokers under any circumstances.
                  </div>
                </div>
              </div>

              {/* Section 6: Approved Sub-Processors */}
              <div id="subprocessors" className="glass p-8 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[#27C93F]">
                    <Server size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">6. Approved Sub-Processors</h2>
                </div>
                <p className="text-body text-sm">
                  To deliver seamless store hosting, payments, and shipping, Nexus engages vetted third-party sub-processors bound by data processing agreements:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-strong">
                    <thead className="bg-white/5 text-muted uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4 rounded-l-lg">Sub-Processor Name</th>
                        <th className="py-3 px-4">Service Provided</th>
                        <th className="py-3 px-4 rounded-r-lg">Data Processing Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {subprocessors.map((sp, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="py-3 px-4 font-semibold text-white">{sp.name}</td>
                          <td className="py-3 px-4 text-secondary">{sp.role}</td>
                          <td className="py-3 px-4 text-[#FFBD2E] font-medium">{sp.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 7: Security & Data Retention */}
              <div id="security-retention" className="glass p-8 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 flex items-center justify-center text-[#FFBD2E]">
                    <Key size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">7. Security Safeguards & Data Retention</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  We implement enterprise-grade technical and organizational security standards across all systems:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[#27C93F] font-bold block">TLS 1.3 & AES-256</span>
                    <p className="text-muted">All data in transit is encrypted using TLS 1.3. Databases are encrypted at rest with AES-256 keys.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[#FFBD2E] font-bold block">SOC 2 Type II</span>
                    <p className="text-muted">Audited annually by independent cybersecurity firms for security, availability, and confidentiality.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[#FF5F56] font-bold block">7-Year Retention</span>
                    <p className="text-muted">Financial transaction logs are retained for 7 years to satisfy statutory tax obligations, then purged.</p>
                  </div>
                </div>
              </div>

              {/* Section 8: Your Rights & DSAR Portal */}
              <div id="merchant-rights" className="glass p-8 rounded-2xl border border-white/10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[#27C93F]">
                    <UserCheck size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">8. Your Data Rights & Data Subject Request Portal</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  As a merchant or customer, you have the right to request access to, correction of, or permanent deletion of your personal data stored on Nexus servers.
                </p>

                {/* DSAR Interactive Form */}
                <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Mail size={16} className="text-[#FFBD2E]" /> Submit a Data Privacy Request (DSAR)
                  </h3>

                  {dsarSubmitted ? (
                    <div className="p-4 rounded-lg bg-[#27C93F]/10 border border-[#27C93F]/30 text-[#27C93F] text-xs font-semibold flex items-center gap-2">
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
                            placeholder="merchant@yourstore.com"
                            className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#FFBD2E]"
                          />
                        </div>
                        <div>
                          <label htmlFor="privacypolicypage-request-type-2" className="block text-xs text-secondary mb-1">Request Type</label>
                          <select id="privacypolicypage-request-type-2"
                            value={dsarRequestType}
                            onChange={(e) => setDsarRequestType(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-lg bg-[#15182b] border border-white/10 text-white text-xs focus:outline-none focus:border-[#FFBD2E]"
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

                <div className="text-xs text-muted pt-4 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span>Data Protection Officer (DPO): dpo@nexuscommerce.io</span>
                  <span>Nexus Legal HQ: 100 Commerce Way, San Francisco, CA 94105</span>
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
