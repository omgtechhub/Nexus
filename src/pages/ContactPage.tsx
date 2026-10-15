import { useState } from 'react';
import { 
  Phone, MapPin, MessageSquare, Send, 
  CheckCircle2, Headphones, Building2
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import {
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_HREF,
  SUPPORT_WHATSAPP_ENABLED,
  whatsappLink,
} from '../config/support';

export function ContactPage() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    // Matches the first option below. A default no option carries leaves the
    // select showing a value the form would then submit as empty.
    category: 'listing',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.email && formData.message) {
      setFormSubmitted(true);
    }
  };

  /**
   * One office, because there is one office.
   *
   * This list used to carry four — San Francisco, London, Tokyo, Sydney — each
   * with an address and a phone number nobody answers. Inventing a global
   * footprint on a contact page is worse than inventing it anywhere else: it is
   * the page a person reads when they need to actually reach somebody, and
   * three of the four numbers would have failed them.
   *
   * The phone number comes from the support config, so it is the same number
   * the WhatsApp button opens rather than a second copy to keep in step.
   */
  const offices = [
    {
      city: 'Abuja (Global HQ)',
      address: '12 Gana Street, Maitama, Abuja 900271, FCT, Nigeria',
      phone: SUPPORT_PHONE_DISPLAY,
      href: SUPPORT_PHONE_HREF,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-primary flex flex-col font-sans">
      <Navbar />

      <main id="main" tabIndex={-1} className="flex-1 pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 border-b border-[var(--line)]/60">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#FF5F56]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#FFBD2E]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-xs font-semibold text-[var(--brand-green-ink)] mb-6">
              <Headphones size={14} /> 24/7 Global Support & Sales Assistance
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-primary tracking-tight mb-6 leading-tight max-w-4xl mx-auto">
              Get in touch with <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">Nexus Commerce.</span>
            </h1>
            {/* Nexus is a marketplace: a seller lists products into a shopfront
                the platform runs. This used to open on "launching your store",
                which is the one thing nobody does here — and the first line of
                the contact page is a poor place to describe a different
                product. */}
            <p className="text-lg sm:text-xl text-secondary max-w-2xl mx-auto leading-relaxed">
              Questions about listing your products, what a plan includes, an order on its way, or
              selling at volume? Our team is available 24 hours a day, 7 days a week.
            </p>
          </div>
        </section>

        {/* Content Layout */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Interactive Contact Form */}
            <div className="lg:col-span-7">
              <div className="glass p-8 rounded-2xl border border-[var(--ink)]/10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[var(--brand-green-ink)]">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-primary">Send Us a Message</h2>
                    <p className="text-xs text-muted">Average response time: &lt; 15 minutes</p>
                  </div>
                </div>

                {formSubmitted ? (
                  <div className="p-6 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 text-[var(--brand-green-ink)] space-y-2 text-center">
                    <CheckCircle2 size={32} className="mx-auto" />
                    <h3 className="text-lg font-bold text-primary">Message Received!</h3>
                    <p className="text-xs text-body">
                      Thank you for contacting Nexus. A member of our team has been assigned to your request and will follow up at {formData.email} shortly.
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => setFormSubmitted(false)}>
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contactpage-your-full-name-1" className="block text-xs text-secondary mb-1">Your Full Name</label>
                        <input id="contactpage-your-full-name-1"
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Alex Morgan"
                          className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-primary text-xs focus:outline-none focus:border-[#FFBD2E]"
                        />
                      </div>
                      <div>
                        <label htmlFor="contactpage-work-email-address-2" className="block text-xs text-secondary mb-1">Work Email Address</label>
                        <input id="contactpage-work-email-address-2"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="alex@example.com"
                          className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-primary text-xs focus:outline-none focus:border-[#FFBD2E]"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contactpage-inquiry-category-4" className="block text-xs text-secondary mb-1">Inquiry Category</label>
                      <select id="contactpage-inquiry-category-4"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--input-bg)] border border-[var(--ink)]/10 text-primary text-xs focus:outline-none focus:border-[#FFBD2E]"
                      >
                        <option value="listing">Listing Products & Getting Started</option>
                        <option value="orders">An Order, Delivery or Return</option>
                        <option value="support">Seller Account Support</option>
                        <option value="billing">Billing & Plans</option>
                        <option value="volume">Selling at Volume</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="contactpage-how-can-we-help-you-5" className="block text-xs text-secondary mb-1">How Can We Help You?</label>
                      <textarea id="contactpage-how-can-we-help-you-5"
                        rows={4}
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us what you are listing, or what you need a hand with…"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--ink)]/5 border border-[var(--ink)]/10 text-primary text-xs focus:outline-none focus:border-[#FFBD2E]"
                      />
                    </div>

                    <Button variant="primary" size="md" type="submit" icon={<Send size={16} />}>
                      Send Message Now
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {/* Right Column: Global Office Cards */}
            <div className="lg:col-span-5 space-y-6">
              <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                <Building2 size={20} className="text-[var(--brand-yellow-ink)]" /> Where to Find Us
              </h3>

              <div className="space-y-4">
                {offices.map((office, idx) => (
                  <div key={idx} className="glass p-5 rounded-xl border border-[var(--ink)]/10 space-y-1 text-xs">
                    <span className="font-bold text-primary text-sm block">{office.city}</span>
                    <p className="text-secondary flex items-center gap-1.5"><MapPin size={12} className="text-[var(--brand-red-ink)] flex-shrink-0" /> {office.address}</p>
                    {/* A real number, so it is dialable rather than decorative. */}
                    <p className="font-medium flex items-center gap-1.5">
                      <Phone size={12} className="text-[var(--brand-yellow-ink)] flex-shrink-0" aria-hidden="true" />
                      <a
                        href={office.href}
                        className="text-[var(--brand-yellow-ink)] rounded underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
                      >
                        {office.phone}
                      </a>
                    </p>
                  </div>
                ))}
              </div>

              {/* Instant channels. Both of these are real: WhatsApp opens the
                  same conversation as the floating button in the corner, and
                  Nexus IQ is the assistant docked above it. */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-[#FF5F56]/10 via-[#FFBD2E]/10 to-[#27C93F]/10 border border-[var(--ink)]/10 space-y-3">
                <h4 className="font-bold text-primary text-base">Need instant answers?</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  Message our support team on WhatsApp, or ask Nexus IQ — the assistant in the
                  corner of this page. On here you can use it without signing in, by typing or out
                  loud in any voice.
                </p>
                {SUPPORT_WHATSAPP_ENABLED && (
                  <a
                    href={whatsappLink('the Nexus contact page')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#25D366] text-white text-xs font-bold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]"
                  >
                    <MessageSquare size={14} aria-hidden="true" />
                    Chat on WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
