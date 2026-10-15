import { useState } from 'react';
import { 
  FileText, Shield, CreditCard, Scale, Clock, AlertCircle, 
  CheckCircle2, ChevronRight, Zap, RefreshCw
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { useApp } from '../context/AppContext';

export function TermsOfServicePage() {
  const { navigate } = useApp();
  const [activeTab, setActiveTab] = useState('agreement');

  // Interactive SLA Credit Calculator State
  const [monthlyFee, setMonthlyFee] = useState<number>(299);
  const [downtimeMinutes, setDowntimeMinutes] = useState<number>(45);

  // SLA Calculation (99.99% monthly commitment = ~4.3 minutes downtime allowed)
  let slaCreditPercentage = 0;
  if (downtimeMinutes > 240) slaCreditPercentage = 50; // >4 hours
  else if (downtimeMinutes > 60) slaCreditPercentage = 25; // >1 hour
  else if (downtimeMinutes > 15) slaCreditPercentage = 10; // >15 mins

  const slaCreditAmount = ((monthlyFee * slaCreditPercentage) / 100).toFixed(2);

  const sections = [
    { id: 'agreement', title: '1. Master Services Agreement' },
    { id: 'acceptable-use', title: '2. Acceptable Use & Prohibited Goods' },
    { id: 'billing-plans', title: '3. Subscriptions & Billing Terms' },
    { id: 'nexus-payments', title: '4. Nexus Payments & Chargeback Terms' },
    { id: 'sla-uptime', title: '5. 99.99% Uptime SLA & Credit Remedies' },
    { id: 'ip-ownership', title: '6. Intellectual Property Ownership' },
    { id: 'termination', title: '7. Account Cancellation & Data Export' },
    { id: 'liability', title: '8. Liability Limits & Arbitration' },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-primary flex flex-col font-sans">
      <Navbar />

      <main id="main" tabIndex={-1} className="flex-1 pt-24 pb-16">
        {/* Header Hero */}
        <section className="relative overflow-hidden py-16 border-b border-[var(--line)]/60">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-[#FF5F56]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-[#27C93F]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-xs font-semibold tracking-wide text-[var(--brand-yellow-ink)] mb-6">
                <Scale size={14} /> Merchant Terms of Service • Effective September 2026
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary mb-6 leading-tight">
                Nexus Commerce <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">Terms of Service</span>
              </h1>
              <p className="text-lg text-secondary leading-relaxed mb-6">
                These Terms of Service govern your access to and use of the Nexus marketplace, its seller dashboard, its APIs and its payment processing services. Please review these legal terms carefully before you list products or place an order.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5"><Shield size={12} className="text-[var(--brand-green-ink)]" /> Binding Merchant Contract</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><Clock size={12} className="text-[var(--brand-yellow-ink)]" /> 99.99% Uptime Commitment</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><FileText size={12} className="text-[var(--brand-red-ink)]" /> Version 5.0</span>
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
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider px-3 mb-3">Terms Navigation</h3>
                {sections.map(s => (
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

                {/* Quick Support Callout */}
                <div className="pt-4 border-t border-[var(--ink)]/10 mt-4">
                  <div className="p-4 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 text-xs">
                    <p className="text-strong font-medium mb-1">Legal or Enterprise SLA Questions?</p>
                    <button onClick={() => navigate('contact')} className="text-[var(--brand-green-ink)] font-bold hover:underline">
                      Contact us →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms Main Content */}
            <div className="lg:col-span-8 space-y-12">
              {/* Section 1 */}
              <div id="agreement" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/30 flex items-center justify-center text-[var(--brand-red-ink)]">
                    <FileText size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">1. Master Services Agreement</h2>
                </div>
                <p className="text-body leading-relaxed text-sm">
                  By registering a seller account on Nexus Commerce, or by buying through the Nexus marketplace, you agree to enter into a legally binding contract with Nexus Commerce Inc. If you are accepting these terms on behalf of a corporate entity, you represent and warrant that you have full legal authority to bind that entity.
                </p>
                <p className="text-body leading-relaxed text-sm">
                  Nexus grants you a limited, non-exclusive, non-transferable, revocable license to access the Nexus marketplace, its seller dashboard and its APIs during your paid subscription term, for the purpose of listing and selling your own products.
                </p>
              </div>

              {/* Section 2 */}
              <div id="acceptable-use" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 flex items-center justify-center text-[var(--brand-yellow-ink)]">
                    <AlertCircle size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">2. Acceptable Use & Prohibited Goods Policy</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  Merchants are strictly prohibited from utilizing Nexus platform tools, checkout infrastructure, or payment services for illegal or deceptive commercial activities:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-1">
                    <strong className="text-[var(--brand-red-ink)] block">Prohibited Items</strong>
                    <p className="text-secondary">Counterfeit designer goods, unauthorized pharmaceuticals, unlicensed firearms, deceptive get-rich-quick courses, or stolen gift cards.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-1">
                    <strong className="text-[var(--brand-yellow-ink)] block">Platform Abuse</strong>
                    <p className="text-secondary">Automated scraping of other sellers&apos; listings, DDoS attacks, credit card testing scripts, or transmitting malware through the platform.</p>
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div id="billing-plans" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[var(--brand-green-ink)]">
                    <CreditCard size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">3. Subscriptions, Fees & Billing Terms</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  Subscription plans (Starter, Growth, Pro, Enterprise) are billed on a recurring monthly or annual basis. Payment method on file will be charged automatically at the start of each billing cycle:
                </p>
                <ul className="space-y-2 text-xs text-strong list-disc list-inside">
                  <li><strong className="text-primary">Transaction Fees:</strong> If you use Nexus Payments, third-party transaction fees are waived. If using external payment gateways, a 0.5% to 2.0% transaction fee applies.</li>
                  <li><strong className="text-primary">14-Day Money-Back Guarantee:</strong> Annual plan signups qualify for a full refund within 14 days of initial platform activation.</li>
                  <li><strong className="text-primary">Late Payments:</strong> Accounts with past-due balances exceeding 15 days may have their listings temporarily withdrawn from the shopfront.</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div id="nexus-payments" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 flex items-center justify-center text-[var(--brand-yellow-ink)]">
                    <Shield size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">4. Nexus Payments & Chargeback Regulations</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  Merchants processing customer transactions through Nexus Payments agree to PCI-DSS compliance standards and chargeback dispute resolution protocols:
                </p>
                <div className="p-4 rounded-xl bg-[var(--ink)]/5 border border-[var(--ink)]/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-primary font-semibold">
                    <span>Chargeback Dispute Fee</span>
                    <span className="text-[var(--brand-yellow-ink)]">$15.00 per disputed transaction</span>
                  </div>
                  <p className="text-secondary">
                    If a buyer files a payment chargeback, Nexus automatically submits digital delivery logs, carrier tracking numbers, and IP audit trails to the card issuing bank on your behalf.
                  </p>
                </div>
              </div>

              {/* Section 5: Interactive SLA Credit Simulator */}
              <div id="sla-uptime" className="glass p-8 rounded-2xl border border-[#27C93F]/40 bg-gradient-to-br from-[#27C93F]/5 to-transparent space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/20 border border-[#27C93F]/40 flex items-center justify-center text-[var(--brand-green-ink)]">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-primary">5. 99.99% Uptime SLA & Credit Calculator</h2>
                    <p className="text-xs text-[var(--brand-green-ink)] font-semibold">Contractual Service Level Guarantee</p>
                  </div>
                </div>
                <p className="text-strong text-sm leading-relaxed">
                  Nexus guarantees 99.99% monthly uptime for the marketplace shopfront and its checkout. In the rare event of unannounced core platform downtime, sellers are eligible for SLA credit refunds:
                </p>

                {/* Interactive SLA Calculator Widget */}
                <div className="p-6 rounded-xl bg-[var(--surface-3)] border border-[var(--ink)]/10 space-y-4">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                    <RefreshCw size={16} className="text-[var(--brand-green-ink)]" /> Calculate Your Outage Credit Remedy
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="termsofservicepage-monthly-platform-plan-1" className="block text-xs text-secondary mb-2">Monthly Platform Plan ($)</label>
                      <input id="termsofservicepage-monthly-platform-plan-1"
                        type="number"
                        value={monthlyFee}
                        onChange={(e) => setMonthlyFee(Number(e.target.value))}
                        className="w-full px-3.5 py-2 rounded-lg bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-primary text-xs"
                      />
                    </div>
                    <div>
                      <label htmlFor="termsofservicepage-unscheduled-outage-duration-minu-2" className="block text-xs text-secondary mb-2">Unscheduled Outage Duration (Minutes)</label>
                      <input id="termsofservicepage-unscheduled-outage-duration-minu-2"
                        type="number"
                        value={downtimeMinutes}
                        onChange={(e) => setDowntimeMinutes(Number(e.target.value))}
                        className="w-full px-3.5 py-2 rounded-lg bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-primary text-xs"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-[var(--ink)]/5 border border-[var(--ink)]/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted block">Eligible SLA Refund Credit</span>
                      <span className="text-xl font-extrabold text-[var(--brand-green-ink)]">${slaCreditAmount} USD</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted block">Credit Rate</span>
                      <span className="text-sm font-bold text-[var(--brand-yellow-ink)]">{slaCreditPercentage}% Credit</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 6 */}
              <div id="ip-ownership" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/30 flex items-center justify-center text-[var(--brand-red-ink)]">
                    <CheckCircle2 size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">6. Intellectual Property & Brand Ownership</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  You retain 100% sole ownership of all product images, brand trademarks and listing copy you upload to Nexus. Nexus retains ownership of the platform&apos;s own source code, the marketplace shopfront and the NexusIQ models.
                </p>
              </div>

              {/* Section 7 */}
              <div id="termination" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 flex items-center justify-center text-[var(--brand-yellow-ink)]">
                    <Clock size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">7. Account Cancellation & Data Export Rights</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  You may cancel your subscription at any time directly through the merchant admin settings. Upon cancellation, Nexus provides a 60-day grace period allowing you to export your full customer database, order history, and product catalogs in standard CSV and JSON formats.
                </p>
              </div>

              {/* Section 8 */}
              <div id="liability" className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[var(--brand-green-ink)]">
                    <Scale size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">8. Limitation of Liability & Binding Arbitration</h2>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  To the maximum extent permitted by applicable law, Nexus Commerce&apos;s total aggregate liability for any claims arising out of these Terms shall not exceed the total fees paid by the seller to Nexus in the twelve (12) months preceding the incident. These Terms are governed by the laws of the Federal Republic of Nigeria, and any legal disputes shall be settled via binding individual arbitration in Abuja, FCT.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
