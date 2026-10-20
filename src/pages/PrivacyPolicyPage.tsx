import { useState } from 'react';
import {
  ShieldCheck, Lock, Eye, FileText, Database, Globe, CheckCircle2,
  UserCheck, Key, Server, Mail, ChevronRight, ArrowRight, Mic, AlertTriangle,
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { useApp } from '../context/AppContext';
import { CONTACT, LEGAL_ENTITY, POSTAL_ADDRESS } from '../config/contact';

/**
 * Every factual claim on this page has to be one the code can support.
 *
 * The previous version asserted a great deal that was not true, and a privacy
 * policy is the document where an untrue assertion is most expensive — it is
 * a representation to data subjects and, for the merchant-facing parts, a
 * contractual term. Removed, with the reason each one mattered:
 *
 *  - **"EU-US Data Privacy Framework Certified"** and **"SOC 2 Type II,
 *    audited annually"**. Both name real certification schemes with public
 *    registers. Claiming either without holding it is a misrepresentation
 *    regulators and enterprise buyers both check directly.
 *  - **The sub-processor table.** It listed AWS, Stripe, Snowflake,
 *    Databricks, Twilio and SendGrid. The platform uses none of them: it
 *    deploys to Oracle Cloud, takes payment through Paystack, and sends mail
 *    through whatever SMTP account is configured. A sub-processor list is a
 *    binding disclosure under GDPR Art. 28 and the NDPA — naming processors
 *    that hold no data, while omitting the ones that do, is the failure mode
 *    that disclosure exists to prevent.
 *  - **"Full compliance with GDPR, UK GDPR, CCPA/CPRA and LGPD."** An
 *    absolute compliance claim is unverifiable and was contradicted on the
 *    same page by a data-subject request form that discarded every request.
 *  - **"Standard Contractual Clauses ... to US data centers."** There are no
 *    US data centres.
 *  - **The DSAR form.** `handleDsarSubmit` set a flag and told the requester
 *    "Request received! Check your email for verification instructions."
 *    Nothing was sent or recorded. A subject access request starts a
 *    statutory clock — one month under both the GDPR and the NDPA — so a form
 *    that silently drops them manufactures a breach every time it is used. It
 *    now composes a real message to the privacy mailbox.
 *  - **The controller/processor split.** It cast the merchant as controller
 *    of shopper data with Nexus "strictly a processor under your direction".
 *    That describes a hosted-shop product. Nexus is a single
 *    marketplace: it runs the shopfront, takes the payment and issues the
 *    receipt, so it is the controller of shopper data. Getting this backwards
 *    pushes obligations onto merchants who have no way to discharge them, and
 *    leaves Nexus's own obligations unclaimed.
 *
 * Added: speaker embeddings. The platform stores a 256-float voiceprint per
 * enrolled user (`VoiceProfile`). That is biometric data for the purpose of
 * uniquely identifying a person — GDPR Art. 9 special category, and sensitive
 * personal data under the NDPA — and it had no lawful basis, retention period
 * or deletion route stated anywhere.
 */

export function PrivacyPolicyPage() {
  const { navigate } = useApp();
  const [activeSection, setActiveSection] = useState('overview');
  const [dsarEmail, setDsarEmail] = useState('');
  const [dsarRequestType, setDsarRequestType] = useState('access');

  const sections = [
    { id: 'overview', title: '1. Who we are and what this covers' },
    { id: 'roles', title: '2. Our role in your data' },
    { id: 'data-collected', title: '3. What we collect' },
    { id: 'legal-basis', title: '4. Why we are allowed to hold it' },
    { id: 'voice', title: '5. Voice and biometric data' },
    { id: 'ai-privacy', title: '6. Nexus IQ and your data' },
    { id: 'subprocessors', title: '7. Who else processes it' },
    { id: 'security-retention', title: '8. Security and retention' },
    { id: 'rights', title: '9. Your rights' },
  ];

  /**
   * The processors that actually hold personal data, and what each one gets.
   * Anything added to the stack belongs in this table in the same change.
   */
  const subprocessors = [
    {
      name: 'Oracle Cloud Infrastructure',
      role: 'Application and database hosting',
      data: 'All platform data, at rest',
      location: 'Chosen OCI region',
    },
    {
      name: 'Cloudflare, Inc.',
      role: 'CDN, TLS termination and bot filtering',
      data: 'IP address and request metadata in transit',
      location: 'Global edge network',
    },
    {
      name: 'Paystack Payments Limited',
      role: 'Payment processing and settlement',
      data: 'Name, email, amount, card details entered on Paystack',
      location: 'Nigeria',
    },
    {
      name: 'Configured SMTP provider',
      role: 'Transactional email — receipts, password resets, invitations',
      data: 'Email address and message contents',
      location: 'Per provider',
    },
  ];

  /**
   * Compose a real message rather than pretend one was filed.
   *
   * A mailto is unglamorous, but it genuinely reaches a monitored address and
   * leaves the requester holding a copy in their sent items — which is a
   * better evidentiary position for them than a form post they cannot see the
   * result of. Replace with a ticketed endpoint when one exists.
   */
  const dsarMailto = () => {
    const labels: Record<string, string> = {
      access: 'Access — send me a copy of my data',
      deletion: 'Erasure — delete my data',
      rectification: 'Rectification — correct my data',
      objection: 'Object to or restrict processing',
    };
    const subject = `Data subject request: ${labels[dsarRequestType] ?? dsarRequestType}`;
    const body = [
      `Request type: ${labels[dsarRequestType] ?? dsarRequestType}`,
      `Account email: ${dsarEmail || '(please fill in)'}`,
      '',
      'Please describe your request, and tell us whether you are writing as a',
      'shopper, a seller, or on behalf of someone else.',
      '',
      '',
      '— Sent from the Nexus Commerce privacy page',
    ].join('\n');
    return `mailto:${CONTACT.privacy}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-primary flex flex-col font-sans">
      <Navbar />

      <main id="main" tabIndex={-1} className="flex-1 pt-24 pb-16">
        <section className="relative overflow-hidden py-16 border-b border-[var(--line)]/60">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#FF5F56]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#FFBD2E]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-xs font-semibold tracking-wide text-[var(--brand-green-ink)] mb-6">
                <ShieldCheck size={14} /> Privacy notice • Last updated 18 October 2026
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary mb-6 leading-tight">
                Nexus Commerce{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">
                  Privacy Policy
                </span>
              </h1>
              <p className="text-lg text-secondary leading-relaxed mb-6">
                How Nexus collects, uses, merchants and shares personal data — written to describe
                what the platform actually does, so that you can hold us to it.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <Lock size={12} className="text-[var(--brand-green-ink)]" /> HTTPS everywhere
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Globe size={12} className="text-[var(--brand-yellow-ink)]" /> Nigeria Data Protection Act 2023
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <FileText size={12} className="text-[var(--brand-red-ink)]" /> No data sold, ever
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
              <nav aria-label="Policy sections" className="sticky top-28 glass p-5 rounded-2xl border border-[var(--ink)]/10 space-y-2">
                <h2 className="text-xs font-bold text-muted uppercase tracking-wider px-3 mb-3">
                  Policy navigation
                </h2>
                {sections.map((s) => (
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
                    <p className="text-xs text-strong font-medium mb-2">
                      Selling on Nexus and need a data processing agreement?
                    </p>
                    <button
                      onClick={() => navigate('contact')}
                      className="text-xs text-[var(--brand-red-ink)] font-bold hover:underline flex items-center gap-1"
                    >
                      Get in touch <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </nav>
            </div>

            <div className="lg:col-span-8 space-y-12">
              {/* 1 */}
              <div id="overview" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/30 flex items-center justify-center text-[var(--brand-red-ink)]">
                    <ShieldCheck size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">1. Who we are and what this covers</h2>
                </div>
                <p className="text-body leading-relaxed">
                  Nexus Commerce (&quot;Nexus&quot;, &quot;we&quot;, &quot;us&quot;) operates the
                  Nexus marketplace: a single shopfront where independent sellers list products,
                  together with the seller dashboard, the checkout, and the Nexus IQ assistant.
                  We are based in Abuja, Nigeria, and our principal data protection law is the
                  Nigeria Data Protection Act 2023 (NDPA).
                </p>
                <p className="text-body leading-relaxed">
                  This notice covers everyone who uses Nexus — shoppers, sellers and their team
                  members — and applies to the marketplace, the dashboard and our email. Where we
                  serve people in the EU or UK, we apply the equivalent GDPR rights described in
                  section 9.
                </p>
                <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-xs text-secondary leading-relaxed">
                  Contact for anything on this page:{' '}
                  <a href={`mailto:${CONTACT.privacy}`} className="text-[var(--brand-yellow-ink)] font-semibold hover:underline">
                    {CONTACT.privacy}
                  </a>
                  . Postal: {POSTAL_ADDRESS}.
                </div>
              </div>

              {/* 2 */}
              <div id="roles" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 flex items-center justify-center text-[var(--brand-yellow-ink)]">
                    <Database size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">2. Our role in your data</h2>
                </div>
                <p className="text-body leading-relaxed">
                  Nexus is a marketplace, not a shop host. We run the shopfront, we take the
                  payment and we issue the receipt. That makes{' '}
                  <strong className="text-primary">Nexus the data controller</strong> for shopper
                  personal data — we decide what is collected at checkout and why — rather than a
                  processor acting on a seller&apos;s instructions.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-5 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-2">
                    <h3 className="font-bold text-[var(--brand-yellow-ink)] text-sm">Shoppers</h3>
                    <p className="text-xs text-secondary leading-relaxed">
                      Nexus is the controller of your account, your orders and your delivery
                      details. Bring any question or request to us directly.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-2">
                    <h3 className="font-bold text-[var(--brand-green-ink)] text-sm">Sellers</h3>
                    <p className="text-xs text-secondary leading-relaxed">
                      Nexus is the controller of your seller account, your listings and your
                      settlement details. We share a buyer&apos;s name and delivery address with
                      you so you can fulfil their order — from that point you are an independent
                      controller of what you do with it, and responsible for your own compliance.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 */}
              <div id="data-collected" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[var(--brand-green-ink)]">
                    <Eye size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">3. What we collect</h2>
                </div>
                <ul className="space-y-2.5 list-disc list-outside pl-5 text-body text-sm">
                  <li>
                    <strong className="text-primary">Account details.</strong> Your name, email
                    address and a hashed password. If you sign in with Google, we receive your
                    name, email address and the provider&apos;s account identifier — never your
                    Google password.
                  </li>
                  <li>
                    <strong className="text-primary">Seller details.</strong> Business name, merchant
                    settings, and the bank account used for payouts.
                  </li>
                  <li>
                    <strong className="text-primary">Orders.</strong> Items bought, amounts,
                    delivery address, recipient name, phone number and any order notes.
                  </li>
                  <li>
                    <strong className="text-primary">Payment references.</strong> The transaction
                    reference, amount, currency and status returned by the payment provider.{' '}
                    <strong className="text-primary">Card details are entered on the payment
                    provider&apos;s own page and never reach Nexus servers</strong> — we neither
                    receive nor merchant a card number.
                  </li>
                  <li>
                    <strong className="text-primary">Session and security records.</strong> For each
                    sign-in we merchant the IP address and browser user-agent alongside a hashed
                    session token, so you can see and revoke your own sessions and so we can
                    investigate abuse. Seller actions on a merchant are written to an audit log.
                  </li>
                  <li>
                    <strong className="text-primary">Support and assistant messages.</strong> What
                    you type or say to Nexus IQ, in order to answer it.
                  </li>
                  <li>
                    <strong className="text-primary">Voice, if you enrol.</strong> See section 5.
                  </li>
                </ul>
                <div className="p-4 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 text-xs text-secondary leading-relaxed">
                  <strong className="text-[var(--brand-green-ink)]">What we do not collect:</strong>{' '}
                  we run no analytics, advertising or fingerprinting scripts, we do not build
                  advertising profiles, we do not track you across other websites, and we do not
                  collect precise geolocation. See the{' '}
                  <a href="/cookies" className="text-[var(--brand-yellow-ink)] font-semibold hover:underline">
                    Cookie Policy
                  </a>{' '}
                  for the complete storage inventory.
                </div>
              </div>

              {/* 4 */}
              <div id="legal-basis" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 flex items-center justify-center text-[var(--brand-yellow-ink)]">
                    <FileText size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">4. Why we are allowed to hold it</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10">
                    <strong className="text-primary block mb-1">Performing our contract with you</strong>
                    <span className="text-secondary text-xs leading-relaxed">
                      Running your account, listing your products, taking payment, delivering
                      orders and paying sellers out.
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10">
                    <strong className="text-primary block mb-1">Our legitimate interests</strong>
                    <span className="text-secondary text-xs leading-relaxed">
                      Keeping accounts secure, preventing fraud and abuse, and keeping the service
                      working — the session, audit and rate-limiting records in section 3.
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10">
                    <strong className="text-primary block mb-1">Legal obligation</strong>
                    <span className="text-secondary text-xs leading-relaxed">
                      Keeping transaction and tax records for the period Nigerian law requires.
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10">
                    <strong className="text-primary block mb-1">Your explicit consent</strong>
                    <span className="text-secondary text-xs leading-relaxed">
                      Voice enrolment, and nothing else. You can withdraw it at any time.
                    </span>
                  </div>
                </div>
              </div>

              {/* 5 */}
              <div id="voice" className="glass p-8 rounded-2xl border border-[#FF5F56]/40 bg-gradient-to-br from-[#FF5F56]/5 to-transparent space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5F56]/20 border border-[#FF5F56]/50 flex items-center justify-center text-[var(--brand-red-ink)]">
                    <Mic size={20} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-primary">5. Voice and biometric data</h2>
                    <p className="text-xs text-[var(--brand-red-ink)] font-semibold">
                      Optional, consent-based, and deletable
                    </p>
                  </div>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  Nexus IQ can take spoken commands. Two different things happen, and they have
                  different privacy consequences.
                </p>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-[var(--surface-3)] border border-[var(--ink)]/10 space-y-1">
                    <strong className="text-primary text-sm block">Transcription</strong>
                    <p className="text-xs text-secondary leading-relaxed">
                      Speech is converted to text on our own servers — the audio is not sent to any
                      third-party speech service. The recording is held in memory for the length of
                      the request and discarded; it is never written to disk.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface-3)] border border-[#FF5F56]/30 space-y-1">
                    <strong className="text-primary text-sm block">
                      Voice enrolment — biometric data
                    </strong>
                    <p className="text-xs text-secondary leading-relaxed">
                      If you choose to enrol your voice so that spoken commands can be checked
                      against it, we merchant a <em>voiceprint</em>: a numerical representation of how
                      your voice sounds, derived from your enrolment recordings. The recordings
                      themselves are not kept, and the voiceprint cannot be played back as audio.
                    </p>
                    <p className="text-xs text-secondary leading-relaxed">
                      A voiceprint identifies you uniquely, so it is{' '}
                      <strong className="text-primary">biometric data</strong>: special category
                      data under the GDPR and sensitive personal data under the NDPA. We therefore
                      process it{' '}
                      <strong className="text-primary">only on your explicit consent</strong>, use
                      it for one purpose — confirming a spoken command came from you — and never
                      share it.
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-xs text-secondary leading-relaxed">
                  <strong className="text-primary">Your control:</strong> voice is off until you
                  enrol. Deleting your voice profile removes the voiceprint, takes effect
                  immediately, and leaves the rest of your account untouched. Closing your account
                  deletes it too. If you never enrol, no biometric data about you exists.
                </div>
              </div>

              {/* 6 */}
              <div id="ai-privacy" className="glass p-8 rounded-2xl border border-[#FFBD2E]/40 bg-gradient-to-br from-[#FFBD2E]/5 to-transparent space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/20 border border-[#FFBD2E]/50 flex items-center justify-center text-[var(--brand-yellow-ink)]">
                    <Lock size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">6. Nexus IQ and your data</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[var(--surface-3)] border border-[var(--ink)]/10 space-y-2">
                    <div className="flex items-center gap-2 text-[var(--brand-green-ink)] text-xs font-bold">
                      <CheckCircle2 size={14} /> Not used to train models
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">
                      Your sales figures, catalogue and assistant conversations are not used to
                      train any machine-learning model, ours or anyone else&apos;s.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface-3)] border border-[var(--ink)]/10 space-y-2">
                    <div className="flex items-center gap-2 text-[var(--brand-green-ink)] text-xs font-bold">
                      <CheckCircle2 size={14} /> Scoped to your own merchant
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">
                      When Nexus IQ answers a seller&apos;s question it reads that seller&apos;s own
                      records. For signed-out visitors it reads only published prices and the
                      public catalogue.
                    </p>
                  </div>
                </div>
              </div>

              {/* 7 */}
              <div id="subprocessors" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[var(--brand-green-ink)]">
                    <Server size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">7. Who else processes it</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  These are the only third parties that handle personal data on our behalf. We do
                  not sell or rent personal data, and we do not share it with advertisers or data
                  brokers.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-strong">
                    <caption className="sr-only">Sub-processors engaged by Nexus Commerce</caption>
                    <thead className="bg-[var(--ink)]/5 text-muted uppercase tracking-wider text-[10px]">
                      <tr>
                        <th scope="col" className="py-3 px-4 rounded-l-lg">Processor</th>
                        <th scope="col" className="py-3 px-4">Purpose</th>
                        <th scope="col" className="py-3 px-4">What it receives</th>
                        <th scope="col" className="py-3 px-4 rounded-r-lg">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ink)]/5">
                      {subprocessors.map((sp) => (
                        <tr key={sp.name} className="hover:bg-[var(--ink)]/5 align-top">
                          <th scope="row" className="py-3 px-4 font-semibold text-left text-primary">{sp.name}</th>
                          <td className="py-3 px-4 text-secondary leading-relaxed">{sp.role}</td>
                          <td className="py-3 px-4 text-secondary leading-relaxed">{sp.data}</td>
                          <td className="py-3 px-4 text-[var(--brand-yellow-ink)] font-medium">{sp.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Where a processor is outside Nigeria, the transfer relies on the adequacy and
                  contractual mechanisms the NDPA provides for. We will update this table before
                  engaging a new processor.
                </p>
              </div>

              {/* 8 */}
              <div id="security-retention" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 flex items-center justify-center text-[var(--brand-yellow-ink)]">
                    <Key size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">8. Security and retention</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-1">
                    <span className="text-[var(--brand-green-ink)] font-bold block">Encrypted in transit</span>
                    <p className="text-muted leading-relaxed">
                      All traffic is served over HTTPS. Session cookies are HttpOnly and
                      Secure, so page scripts cannot read them.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-1">
                    <span className="text-[var(--brand-green-ink)] font-bold block">Credentials never stored in the clear</span>
                    <p className="text-muted leading-relaxed">
                      Passwords are hashed with bcrypt and session tokens are stored only as
                      SHA-256 digests — a copy of our database does not yield a usable session.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-1">
                    <span className="text-[var(--brand-yellow-ink)] font-bold block">Access control</span>
                    <p className="text-muted leading-relaxed">
                      Every record is scoped to the merchant that owns it, seller roles limit what
                      each team member can do, and privileged actions are written to an audit log.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-1">
                    <span className="text-[var(--brand-red-ink)] font-bold block">Retention</span>
                    <p className="text-muted leading-relaxed">
                      Account data is kept while your account is open. Order and payment records
                      are kept for six years after the transaction to meet Nigerian tax and
                      accounting requirements, then deleted. Voiceprints are deleted as soon as
                      you ask.
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/30 text-xs text-secondary leading-relaxed flex gap-3">
                  <AlertTriangle size={16} className="text-[var(--brand-red-ink)] shrink-0 mt-0.5" />
                  <span>
                    No service is immune to compromise. If a breach affects your personal data we
                    will notify the Nigeria Data Protection Commission and, where the risk to you
                    is high, tell you directly — within the statutory 72 hours.
                  </span>
                </div>
              </div>

              {/* 9 */}
              <div id="rights" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[var(--brand-green-ink)]">
                    <UserCheck size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">9. Your rights</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  You can ask for a copy of your data, ask us to correct it, ask us to delete it,
                  object to or restrict how we use it, and withdraw any consent you have given. We
                  answer within one month. There is no charge, and exercising a right never costs
                  you access to the service.
                </p>
                <p className="text-body text-sm leading-relaxed">
                  Some data we must keep even after a deletion request — completed order and
                  payment records, for the statutory period in section 8. We will tell you exactly
                  what was kept and why.
                </p>

                <div className="p-6 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-4">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <Mail size={16} className="text-[var(--brand-yellow-ink)]" /> Make a request
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Fill these in and your email client will open with the message prepared. We
                    may ask you to confirm your identity before we act, so that nobody else can
                    request your data.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="dsar-email" className="block text-xs text-secondary mb-1">
                        Your account email
                      </label>
                      <input
                        id="dsar-email"
                        type="email"
                        value={dsarEmail}
                        onChange={(e) => setDsarEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-primary text-xs focus:outline-none focus:border-[#FFBD2E]"
                      />
                    </div>
                    <div>
                      <label htmlFor="dsar-type" className="block text-xs text-secondary mb-1">
                        Request type
                      </label>
                      <select
                        id="dsar-type"
                        value={dsarRequestType}
                        onChange={(e) => setDsarRequestType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--input-bg)] border border-[var(--ink)]/10 text-primary text-xs focus:outline-none focus:border-[#FFBD2E]"
                      >
                        <option value="access">Access — send me a copy of my data</option>
                        <option value="deletion">Erasure — delete my data</option>
                        <option value="rectification">Rectification — correct my data</option>
                        <option value="objection">Object to or restrict processing</option>
                      </select>
                    </div>
                  </div>
                  {/* An anchor, not a Button: `Button` renders a <button>
                      and takes no href, and a navigation masquerading as a
                      button is also the wrong element for a screen reader. */}
                  <a
                    href={dsarMailto()}
                    className="inline-flex items-center justify-center gap-2 h-8 px-3 text-xs font-bold rounded-lg transition-colors duration-200 bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] hover:brightness-110 text-white shadow-lg shadow-red-900/30 focus:outline-none focus:ring-2 focus:ring-[#FF5F56] focus:ring-offset-2 focus:ring-offset-transparent active:scale-95"
                  >
                    <Mail size={14} />
                    Open a prepared email
                  </a>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Prefer to write it yourself? Email{' '}
                    <a href={`mailto:${CONTACT.privacy}`} className="text-[var(--brand-yellow-ink)] font-semibold hover:underline">
                      {CONTACT.privacy}
                    </a>
                    .
                  </p>
                </div>

                <div className="text-xs text-muted pt-4 border-t border-[var(--ink)]/5 space-y-2 leading-relaxed">
                  <p>
                    If you are not satisfied with how we handle your request, you can complain to
                    the Nigeria Data Protection Commission (NDPC). If you are in the EU or UK, you
                    may complain to your local supervisory authority.
                  </p>
                  <p>{LEGAL_ENTITY} · {POSTAL_ADDRESS}</p>
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
