import { useState } from 'react';
import {
  FileText, Shield, CreditCard, Scale, Clock, AlertCircle,
  CheckCircle2, ChevronRight, Zap, Wallet,
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { useApp } from '../context/AppContext';
import { CONTACT, LEGAL_ENTITY, POSTAL_ADDRESS } from '../config/contact';

/**
 * These are contract terms, so each one has to be a promise the platform can
 * actually keep. The previous version made several it could not:
 *
 *  - **"Nexus guarantees 99.99% monthly uptime"**, with an interactive
 *    calculator computing a specific refund. 99.99% allows about four and a
 *    half minutes of downtime a month. Nexus runs as a single application
 *    instance against a single database with no failover, and the deployment
 *    has no redundancy to deliver that number. A published SLA is a
 *    contractual commitment; one the architecture cannot meet converts every
 *    ordinary outage into an owed refund, and the calculator quantified it
 *    for the claimant. Replaced with an honest availability statement.
 *  - **"Payment method on file will be charged automatically at the start of
 *    each billing cycle."** Nexus stores no card and has no mechanism to take
 *    a renewal payment; a period that lapses goes past-due and waits. The
 *    terms described an auto-renewal that does not exist — and auto-renewal
 *    is separately regulated in several jurisdictions.
 *  - **Transaction fees of "0.5% to 2.0%" for "external payment gateways"**,
 *    waived for Nexus Payments. There are no external gateways: this is a
 *    single marketplace on one payment provider. The commission rate is set
 *    by configuration and is currently zero, so the terms both described a
 *    fee that is never charged and failed to reserve the right to charge the
 *    one that might be.
 *  - **"$15.00 per disputed transaction"** chargeback fee, and a claim that
 *    Nexus "automatically submits digital delivery logs, carrier tracking
 *    numbers and IP audit trails to the card issuing bank on your behalf."
 *    No chargeback subsystem exists, and the sum was in dollars on a naira
 *    platform.
 *  - **A 60-day grace period to export "your full customer database, order
 *    history and product catalogs in standard CSV and JSON formats."** The
 *    product exports orders and transactions to CSV. There is no customer or
 *    catalogue export, no JSON export and no grace-period mechanism.
 *
 * Where a term is a commercial decision rather than a fact about the code —
 * the commission rate, the refund window — it is written to match what the
 * code does today and to reserve the right to change it on notice.
 */

export function TermsOfServicePage() {
  const { navigate } = useApp();
  const [activeTab, setActiveTab] = useState('agreement');

  const sections = [
    { id: 'agreement', title: '1. The agreement' },
    { id: 'acceptable-use', title: '2. Acceptable use' },
    { id: 'billing-plans', title: '3. Subscriptions and billing' },
    { id: 'payments', title: '4. Payments, commission and payouts' },
    { id: 'availability', title: '5. Availability and support' },
    { id: 'ip-ownership', title: '6. Intellectual property' },
    { id: 'termination', title: '7. Ending your account' },
    { id: 'liability', title: '8. Liability and disputes' },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-primary flex flex-col font-sans">
      <Navbar />

      <main id="main" tabIndex={-1} className="flex-1 pt-24 pb-16">
        <section className="relative overflow-hidden py-16 border-b border-[var(--line)]/60">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF5F56]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#27C93F]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-xs font-semibold tracking-wide text-[var(--brand-red-ink)] mb-6">
                <Scale size={14} /> Terms of Service • Last updated 18 October 2026
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary mb-6 leading-tight">
                Nexus Commerce{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">
                  Terms of Service
                </span>
              </h1>
              <p className="text-lg text-secondary leading-relaxed mb-6">
                The agreement between you and Nexus Commerce, for both selling on the marketplace
                and buying from it.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <Shield size={12} className="text-[var(--brand-green-ink)]" /> Binding agreement
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Scale size={12} className="text-[var(--brand-yellow-ink)]" /> Governed by Nigerian law
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
              <nav aria-label="Terms sections" className="sticky top-28 glass p-5 rounded-2xl border border-[var(--ink)]/10 space-y-2">
                <h2 className="text-xs font-bold text-muted uppercase tracking-wider px-3 mb-3">
                  Terms navigation
                </h2>
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveTab(s.id);
                      document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-between ${
                      activeTab === s.id
                        ? 'bg-gradient-to-r from-[#FF5F56]/20 to-[#FFBD2E]/20 text-primary border border-[#FFBD2E]/40 font-semibold'
                        : 'text-secondary hover:text-primary hover:bg-[var(--ink)]/5'
                    }`}
                  >
                    <span>{s.title}</span>
                    <ChevronRight size={14} className={activeTab === s.id ? 'text-[var(--brand-yellow-ink)]' : 'opacity-0'} />
                  </button>
                ))}

                <div className="pt-4 border-t border-[var(--ink)]/10 mt-4">
                  <div className="p-4 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30">
                    <p className="text-xs text-strong font-medium mb-2">A question about these terms?</p>
                    <button
                      onClick={() => navigate('contact')}
                      className="text-xs text-[var(--brand-yellow-ink)] font-bold hover:underline flex items-center gap-1"
                    >
                      Contact us <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </nav>
            </div>

            <div className="lg:col-span-8 space-y-12">
              {/* 1 */}
              <div id="agreement" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/30 flex items-center justify-center text-[var(--brand-red-ink)]">
                    <FileText size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">1. The agreement</h2>
                </div>
                <p className="text-body leading-relaxed">
                  By registering an account on Nexus Commerce, or by buying through the Nexus
                  marketplace, you enter a binding agreement with {LEGAL_ENTITY}, of{' '}
                  {POSTAL_ADDRESS}. If you accept on behalf of a business, you
                  confirm you are authorised to bind it.
                </p>
                <p className="text-body leading-relaxed">
                  Nexus grants you a limited, non-exclusive, non-transferable and revocable right
                  to use the marketplace, the seller dashboard and our APIs — for sellers, to list
                  and sell your own products; for shoppers, to browse and buy. You must be old
                  enough to enter a contract where you live.
                </p>
                <p className="text-body leading-relaxed">
                  We may change these terms. For a change that materially affects sellers we will
                  give at least 30 days&apos; notice by email before it takes effect, and
                  continuing to use Nexus after that date means you accept it. If you do not, you
                  may close your account under section 7.
                </p>
              </div>

              {/* 2 */}
              <div id="acceptable-use" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 flex items-center justify-center text-[var(--brand-yellow-ink)]">
                    <AlertCircle size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">2. Acceptable use</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  You are responsible for what you list and what you do on the platform, including
                  holding any licence your products require.
                </p>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10">
                    <strong className="text-primary text-sm block mb-1">You may not list</strong>
                    <p className="text-xs text-secondary leading-relaxed">
                      Counterfeit or infringing goods; unlicensed pharmaceuticals, drugs or drug
                      paraphernalia; weapons or ammunition you are not licensed to sell; stolen
                      property or stolen gift cards; anything whose sale is unlawful in Nigeria or
                      in the buyer&apos;s country; or anything you cannot actually supply.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10">
                    <strong className="text-primary text-sm block mb-1">You may not</strong>
                    <p className="text-xs text-secondary leading-relaxed">
                      Scrape or bulk-harvest other sellers&apos; listings; attempt to access an
                      account, merchant or record that is not yours; probe or attack the platform;
                      test stolen card numbers; upload malware; or use the platform to send
                      unsolicited messages.
                    </p>
                  </div>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  We may remove a listing, suspend an account or end this agreement where we
                  reasonably believe this section has been breached. Except where the breach is
                  serious or we are legally required to act immediately, we will tell you why and
                  give you a chance to respond.
                </p>
              </div>

              {/* 3 */}
              <div id="billing-plans" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[var(--brand-green-ink)]">
                    <CreditCard size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">3. Subscriptions and billing</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  Seller plans (Starter, Growth, Pro and Enterprise) are sold on a monthly or
                  annual term at the prices shown on the{' '}
                  <a href="/pricing" className="text-[var(--brand-yellow-ink)] font-semibold hover:underline">
                    pricing page
                  </a>
                  , which are the authoritative figures.
                </p>
                <ul className="space-y-2.5 list-disc list-outside pl-5 text-body text-sm">
                  <li>
                    <strong className="text-primary">We do not store your card.</strong> Nexus
                    keeps no payment method on file and takes nothing automatically. Each term is
                    paid by a payment you make.
                  </li>
                  <li>
                    <strong className="text-primary">What happens at the end of a term.</strong> If
                    a term ends without a renewal payment, the subscription becomes past due. Your
                    data is not deleted and your account stays open, but plan features and limits
                    revert until it is paid. We will email you before the term ends.
                  </li>
                  <li>
                    <strong className="text-primary">Changing plan.</strong> You can move between
                    plans at any time from your dashboard. An upgrade applies immediately; a
                    downgrade applies from the next term.
                  </li>
                  <li>
                    <strong className="text-primary">Refunds.</strong> If you cancel an annual plan
                    within 14 days of first paying for it, and you have not used the platform to
                    take orders in that time, write to us and we will refund it in full. After
                    that, fees already paid for the current term are not refundable, except where
                    the law gives you a right we cannot exclude.
                  </li>
                  <li>
                    <strong className="text-primary">Price changes.</strong> We may change plan
                    prices on 30 days&apos; notice. A change never applies to a term you have
                    already paid for.
                  </li>
                </ul>
              </div>

              {/* 4 */}
              <div id="payments" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/30 flex items-center justify-center text-[var(--brand-red-ink)]">
                    <Wallet size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">4. Payments, commission and payouts</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  Nexus is a single marketplace. Buyers pay Nexus at a shared checkout, through our
                  payment provider, and Nexus then owes the seller the proceeds of their sales.
                  Card details are entered with the payment provider and never reach Nexus.
                </p>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30">
                    <strong className="text-primary text-sm block mb-1">Commission</strong>
                    <p className="text-xs text-secondary leading-relaxed">
                      Nexus currently charges{' '}
                      <strong className="text-[var(--brand-green-ink)]">no commission</strong> on
                      sales: subscription fees are how the platform is funded, and you are owed
                      100% of each sale less the payment provider&apos;s own charges. We may
                      introduce a commission on 30 days&apos; written notice. Any rate is fixed
                      against each sale at the moment it settles, so a change can never apply
                      retrospectively to orders already taken.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10">
                    <strong className="text-primary text-sm block mb-1">Payouts</strong>
                    <p className="text-xs text-secondary leading-relaxed">
                      Your balance is calculated from settled payments, less refunds and payouts
                      already made, and is visible in your dashboard. Payouts are made to the bank
                      account you have given us and verified. We may hold a payout where an order
                      is disputed, where we are investigating suspected fraud, or where we are
                      required to by law — and we will tell you why.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10">
                    <strong className="text-primary text-sm block mb-1">Refunds and disputes</strong>
                    <p className="text-xs text-secondary leading-relaxed">
                      Where a buyer is refunded, or a payment is reversed by the provider or the
                      buyer&apos;s bank, the amount is deducted from the seller&apos;s balance,
                      along with any fee the provider charges us for the reversal. If your balance
                      does not cover it, you owe us the difference. We pass on the provider&apos;s
                      actual charge and add nothing of our own.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10">
                    <strong className="text-primary text-sm block mb-1">Taxes</strong>
                    <p className="text-xs text-secondary leading-relaxed">
                      Prices are shown in the platform&apos;s trading currency. You are responsible
                      for your own tax position on what you earn through Nexus, including
                      registering and accounting for any tax you owe.
                    </p>
                  </div>
                </div>
              </div>

              {/* 5 */}
              <div id="availability" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 flex items-center justify-center text-[var(--brand-yellow-ink)]">
                    <Zap size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">5. Availability and support</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  We work to keep Nexus available at all times and we monitor it, but{' '}
                  <strong className="text-primary">
                    we do not offer a contractual uptime guarantee or service credits
                  </strong>{' '}
                  on current plans. The service is provided on a commercially reasonable
                  best-effort basis.
                </p>
                <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-xs text-secondary leading-relaxed space-y-2">
                  <p>
                    We will give advance notice of planned maintenance where we reasonably can, and
                    schedule it outside peak trading hours.
                  </p>
                  <p>
                    Support is by email at{' '}
                    <a href={`mailto:${CONTACT.support}`} className="text-[var(--brand-yellow-ink)] font-semibold hover:underline">
                      {CONTACT.support}
                    </a>
                    . We aim to respond to sellers within one business day.
                  </p>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  If we introduce a plan carrying a formal service level agreement, its terms will
                  be published and will apply only to that plan.
                </p>
              </div>

              {/* 6 */}
              <div id="ip-ownership" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[var(--brand-green-ink)]">
                    <CheckCircle2 size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">6. Intellectual property</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  You keep full ownership of everything you upload — your product images, listing
                  copy, brand names and trade marks. Nexus owns the platform: its source code, the
                  marketplace shopfront and the Nexus IQ models.
                </p>
                <p className="text-body text-sm leading-relaxed">
                  So that we can actually run the marketplace, you grant Nexus a non-exclusive,
                  worldwide, royalty-free licence to host, reproduce, resize and display your
                  listing content for the purpose of operating and promoting the marketplace and
                  your listings on it. The licence lasts while your content is on Nexus and ends
                  when you remove it, except for copies kept in backups or in records we must
                  retain by law.
                </p>
                <p className="text-body text-sm leading-relaxed">
                  You confirm that you own or are licensed to use everything you upload, and that
                  it does not infringe anyone else&apos;s rights. If you believe content on Nexus
                  infringes yours, write to{' '}
                  <a href={`mailto:${CONTACT.legal}`} className="text-[var(--brand-yellow-ink)] font-semibold hover:underline">
                    {CONTACT.legal}
                  </a>{' '}
                  with enough detail to identify the listing and your right.
                </p>
              </div>

              {/* 7 */}
              <div id="termination" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 flex items-center justify-center text-[var(--brand-yellow-ink)]">
                    <Clock size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">7. Ending your account</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  You can cancel your subscription at any time from your dashboard settings. It
                  runs to the end of the term you have paid for, and is not renewed.
                </p>
                <p className="text-body text-sm leading-relaxed">
                  Before you go, you can export your orders and your transaction history to CSV
                  from the dashboard. If you need your catalogue or customer records as well, ask
                  us at{' '}
                  <a href={`mailto:${CONTACT.support}`} className="text-[var(--brand-yellow-ink)] font-semibold hover:underline">
                    {CONTACT.support}
                  </a>{' '}
                  while your account is still open and we will put them together for you.
                </p>
                <p className="text-body text-sm leading-relaxed">
                  Closing your account does not cancel orders already placed: you must still fulfil
                  them or refund the buyer. We keep order and payment records for the period set
                  out in the{' '}
                  <a href="/privacy" className="text-[var(--brand-yellow-ink)] font-semibold hover:underline">
                    Privacy Policy
                  </a>
                  , because tax law requires it.
                </p>
              </div>

              {/* 8 */}
              <div id="liability" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/30 flex items-center justify-center text-[var(--brand-red-ink)]">
                    <Scale size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">8. Liability and disputes</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  Nothing in these terms limits liability for death or personal injury caused by
                  negligence, for fraud, or for anything else that cannot be limited by law —
                  including a consumer&apos;s rights under the Federal Competition and Consumer
                  Protection Act.
                </p>
                <p className="text-body text-sm leading-relaxed">
                  Subject to that, Nexus is not liable for indirect or consequential loss, or for
                  lost profits, lost sales or lost data, and our total liability for all claims
                  arising in any twelve-month period is limited to the fees you paid us in the
                  twelve months before the claim arose. The platform is otherwise provided as is,
                  without warranties beyond those these terms give.
                </p>
                <p className="text-body text-sm leading-relaxed">
                  These terms are governed by the laws of the Federal Republic of Nigeria. We would
                  rather resolve a problem directly, so please contact us first. If we cannot
                  settle it, the courts of the Federal Capital Territory, Abuja have jurisdiction.
                </p>
                <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-xs text-secondary leading-relaxed">
                  {LEGAL_ENTITY} · {POSTAL_ADDRESS} ·{' '}
                  <a href={`mailto:${CONTACT.legal}`} className="text-[var(--brand-yellow-ink)] font-semibold hover:underline">
                    {CONTACT.legal}
                  </a>
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
