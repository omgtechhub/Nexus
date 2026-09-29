import { useState } from 'react';
import { 
  Briefcase, ArrowRight, Download, Building, Package
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function B2BWholesalePage() {
  const { navigate } = useApp();
  const [quantity, setQuantity] = useState<number>(250);
  const [creditTerms, setCreditTerms] = useState<'net30' | 'net60' | 'prepaid'>('net30');
  const [downloadedQuote, setDownloadedQuote] = useState(false);

  const getUnitPrice = (qty: number) => {
    if (qty >= 1000) return 25.00;
    if (qty >= 250) return 32.00;
    if (qty >= 50) return 40.00;
    return 50.00;
  };

  const unitPrice = getUnitPrice(quantity);
  const totalAmount = quantity * unitPrice;
  const savingsVsRetail = (quantity * 50.00) - totalAmount;

  const handleDownloadQuote = () => {
    setDownloadedQuote(true);
    setTimeout(() => setDownloadedQuote(false), 2500);
  };

  const erpIntegrations = [
    { name: 'SAP S/4HANA', type: 'Enterprise ERP Sync' },
    { name: 'Salesforce Commerce B2B', type: 'CRM & Order Portal' },
    { name: 'Oracle NetSuite', type: 'Cloud ERP & Inventory' },
    { name: 'QuickBooks Enterprise', type: 'Accounting & Invoicing' },
    { name: 'Microsoft Dynamics 365', type: 'Enterprise ERP' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[380px] bg-[#FFBD2E]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-80 h-80 bg-[#27C93F]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FFBD2E]/40 bg-[#FFBD2E]/10 text-[#FFBD2E] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <Briefcase size={16} />
            <span>Nexus B2B Wholesale Commerce</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-white/60">Bulk trade made easy</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Modern B2B wholesale, <br />
            <span className="text-gradient">simplified for high volume.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Automate wholesale ordering, custom customer price schedules, Net-30 credit terms, minimum order quantities (MOQ), and bulk SKU matrix purchasing into one self-serve B2B portal.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl bg-gradient-to-r from-[#FFBD2E] via-[#FF5F56] to-[#27C93F] text-black font-bold"
              onClick={() => navigate('signup')}
              icon={<ArrowRight size={18} />}
              iconPosition="right"
            >
              Build B2B Wholesale Portal
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl border-white/20 hover:border-white/40"
              onClick={() => {
                document.getElementById('b2b-tier-simulator')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<Package size={18} />}
            >
              Test Volume Tier Simulator
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FFBD2E]">85%</div>
              <div className="text-xs text-white/50">Faster Wholesale Checkout</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">Net-30/60</div>
              <div className="text-xs text-white/50">Automated Terms Approval</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#27C93F]">10,000+</div>
              <div className="text-xs text-white/50">Bulk SKU Matrix Uploads</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FF5F56]">100%</div>
              <div className="text-xs text-white/50">ERP Integration Sync</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Wholesale Tier Pricing Simulator */}
      <section id="b2b-tier-simulator" className="py-20 bg-[#0B0D1B]/90 border-t border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Interactive Wholesale Volume Pricing Simulator
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Adjust wholesale order quantities to see automatic tier discounts and Net credit terms calculate in real time.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-white/80">Wholesale Order Quantity:</label>
                    <span className="text-xl font-bold text-[#FFBD2E]">
                      {quantity.toLocaleString()} units
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={2000}
                    step={10}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFBD2E]"
                  />
                  <div className="flex justify-between text-[11px] text-white/40 mt-1 font-mono">
                    <span>10 (Retail)</span>
                    <span>250 (Wholesale Tier 2)</span>
                    <span>1,000+ (Enterprise Bulk)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Payment Credit Terms:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'net30', label: 'Net 30 Days' },
                      { id: 'net60', label: 'Net 60 Days' },
                      { id: 'prepaid', label: 'Prepaid (2% Disc)' },
                    ].map((term) => (
                      <button
                        key={term.id}
                        onClick={() => setCreditTerms(term.id as any)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          creditTerms === term.id
                            ? 'bg-[#FFBD2E]/20 border-[#FFBD2E]/60 text-white'
                            : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {term.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                  <div className="flex justify-between text-white/60">
                    <span>Active Unit Wholesale Rate:</span>
                    <span className="font-bold text-white">${unitPrice.toFixed(2)} / unit</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Volume Discount Saved:</span>
                    <span className="font-bold text-[#27C93F]">${savingsVsRetail.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 glass rounded-2xl p-6 border border-[#FFBD2E]/40 bg-[#090b16] text-center flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-xs">
                    <span className="font-bold text-white">Proforma Invoice #B2B-881</span>
                    <span className="text-[#FFBD2E] font-mono uppercase">{creditTerms}</span>
                  </div>
                  <div className="text-xs text-white/40 mb-1">Total Wholesale Invoice</div>
                  <div className="text-3xl font-extrabold text-white mb-2">
                    ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-white/50 mb-6">
                    Approved for Net credit terms with instant automated underwriting.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FFBD2E] to-[#27C93F] text-black font-bold flex items-center justify-center gap-2"
                  onClick={handleDownloadQuote}
                >
                  <Download size={16} />
                  <span>{downloadedQuote ? 'Quote Saved!' : 'Download Proforma Quote'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ERP Integrations Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
              Seamless ERP & Accounting Integrations
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-base">
              Sync orders, inventory, credit lines, and customer price rules automatically with your backend ERP stack.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {erpIntegrations.map((erp, idx) => (
              <div key={idx} className="glass rounded-xl p-5 border border-white/10 text-center hover:border-[#FFBD2E]/40 transition-all">
                <div className="w-10 h-10 rounded-xl bg-white/5 mx-auto mb-3 flex items-center justify-center text-[#FFBD2E]">
                  <Building size={20} />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">{erp.name}</h4>
                <div className="text-[10px] text-white/40">{erp.type}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#FFBD2E]/15 via-[#FF5F56]/10 to-[#27C93F]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Modernize your wholesale B2B operations
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Give your wholesale buyers a fast, self-serve e-commerce portal.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#FFBD2E] via-[#FF5F56] to-[#27C93F] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Create Your B2B Portal
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
