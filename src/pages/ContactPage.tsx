import { useState } from 'react';
import { 
  Phone, MapPin, MessageSquare, Send, 
  CheckCircle2, Headphones, Building2
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function ContactPage() {
  const { navigate } = useApp();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    storeUrl: '',
    category: 'sales',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.email && formData.message) {
      setFormSubmitted(true);
    }
  };

  const offices = [
    { city: 'San Francisco (Global HQ)', address: '100 Commerce Way, Suite 800, San Francisco, CA 94105', phone: '+1 (800) 555-NEXUS' },
    { city: 'London (EMEA HQ)', address: '25 Bank Street, Canary Wharf, London E14 5JP, UK', phone: '+44 20 7946 0912' },
    { city: 'Tokyo (APAC HQ)', address: 'Roppongi Hills Mori Tower, 6-10-1 Roppongi, Minato City, Tokyo', phone: '+81 3 5555 0143' },
    { city: 'Sydney (AU/NZ)', address: '100 Barangaroo Avenue, Sydney NSW 2000, Australia', phone: '+61 2 9000 1234' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 border-b border-[#222642]/60">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#FF5F56]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#FFBD2E]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#27C93F] mb-6">
              <Headphones size={14} /> 24/7 Global Support & Sales Assistance
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight max-w-4xl mx-auto">
              Get in touch with <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">Nexus Commerce.</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
              Have questions about launching your store, custom enterprise pricing, or developer APIs? Our team is available 24 hours a day, 7 days a week.
            </p>
          </div>
        </section>

        {/* Content Layout */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Interactive Contact Form */}
            <div className="lg:col-span-7">
              <div className="glass p-8 rounded-2xl border border-white/10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 flex items-center justify-center text-[#27C93F]">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Send Us a Message</h2>
                    <p className="text-xs text-white/50">Average response time: &lt; 15 minutes</p>
                  </div>
                </div>

                {formSubmitted ? (
                  <div className="p-6 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/30 text-[#27C93F] space-y-2 text-center">
                    <CheckCircle2 size={32} className="mx-auto" />
                    <h3 className="text-lg font-bold text-white">Message Received!</h3>
                    <p className="text-xs text-white/70">
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
                        <label className="block text-xs text-white/60 mb-1">Your Full Name</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Alex Morgan"
                          className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#FFBD2E]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/60 mb-1">Work Email Address</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="alex@yourstore.com"
                          className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#FFBD2E]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-white/60 mb-1">Store Domain / URL (Optional)</label>
                        <input
                          type="text"
                          value={formData.storeUrl}
                          onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
                          placeholder="mybrand.com"
                          className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#FFBD2E]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/60 mb-1">Inquiry Category</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-lg bg-[#15182b] border border-white/10 text-white text-xs focus:outline-none focus:border-[#FFBD2E]"
                        >
                          <option value="sales">Sales & Enterprise Pricing</option>
                          <option value="support">Technical Merchant Support</option>
                          <option value="partners">Agency & Developer Partner Program</option>
                          <option value="billing">Billing & Subscription Inquiry</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-white/60 mb-1">How Can We Help You?</label>
                      <textarea
                        rows={4}
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us about your store requirements or question..."
                        className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#FFBD2E]"
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
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 size={20} className="text-[#FFBD2E]" /> Global Office Locations
              </h3>

              <div className="space-y-4">
                {offices.map((office, idx) => (
                  <div key={idx} className="glass p-5 rounded-xl border border-white/10 space-y-1 text-xs">
                    <span className="font-bold text-white text-sm block">{office.city}</span>
                    <p className="text-white/60 flex items-center gap-1.5"><MapPin size={12} className="text-[#FF5F56] flex-shrink-0" /> {office.address}</p>
                    <p className="text-[#FFBD2E] font-medium flex items-center gap-1.5"><Phone size={12} /> {office.phone}</p>
                  </div>
                ))}
              </div>

              {/* Live Chat Box */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-[#FF5F56]/10 via-[#FFBD2E]/10 to-[#27C93F]/10 border border-white/10 space-y-3">
                <span className="text-xs font-bold text-[#27C93F] uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#27C93F] animate-pulse" /> Live Chat Online
                </span>
                <h4 className="font-bold text-white text-base">Need instant answers?</h4>
                <p className="text-xs text-white/60">Chat with a Nexus e-commerce specialist right now inside your browser.</p>
                <Button variant="secondary" size="sm" onClick={() => navigate('contact')}>
                  Send us a message
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
