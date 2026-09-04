import { useState } from 'react';
import { 
  FileText, Code, Terminal, Search, BookOpen, Layers, Zap, 
  ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, Copy, Check
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function DocumentationPage() {
  const { navigate } = useApp();
  const [activeSection, setActiveSection] = useState<'storefront' | 'admin-api' | 'webhooks' | 'themes'>('storefront');
  const [copied, setCopied] = useState(false);

  const docsNav = [
    { id: 'storefront', title: 'Storefront GraphQL API', category: 'APIs' },
    { id: 'admin-api', title: 'Admin REST API v2.4', category: 'APIs' },
    { id: 'webhooks', title: 'Real-time Webhook Events', category: 'Integrations' },
    { id: 'themes', title: 'Liquid Theme Architecture', category: 'Store Design' },
  ];

  const codeExamples = {
    storefront: `query GetStorefrontCatalog {
  products(first: 5, sortKey: PRICE, reverse: true) {
    edges {
      node {
        id
        title
        handle
        priceRange {
          minVariantPrice { amount currencyCode }
        }
      }
    }
  }
}`,
    'admin-api': `POST /v1/orders HTTP/1.1
Host: api.nexus.commerce
Authorization: Bearer nex_live_994812
Content-Type: application/json

{
  "order": {
    "line_items": [{ "variant_id": 88102, "quantity": 1 }],
    "shipping_address": { "city": "San Francisco", "zip": "94103" }
  }
}`,
    webhooks: `POST /webhooks/nexus HTTP/1.1
X-Nexus-Hmac-SHA256: 7f83b1657ff1...
Content-Type: application/json

{
  "event": "order.created",
  "data": {
    "order_id": "NEX-89102",
    "total": 125.00,
    "financial_status": "paid"
  }
}`,
    themes: `{% for product in collections.frontpage.products %}
  <div class="product-card">
    <img src="{{ product.featured_image | img_url: 'medium' }}" alt="{{ product.title }}" />
    <h3>{{ product.title }}</h3>
    <span>{{ product.price | money }}</span>
    <button class="btn-add-to-cart" data-id="{{ product.id }}">Add to Cart</button>
  </div>
{% endfor %}`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExamples[activeSection]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute top-20 left-1/3 w-[550px] h-[380px] bg-[#FFBD2E]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FFBD2E]/40 bg-[#FFBD2E]/10 text-[#FFBD2E] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <Code size={16} />
            <span>Nexus Merchant Developer Documentation</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-white/60">APIs, SDKs & Themes</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Build custom e-commerce apps, <br />
            <span className="text-gradient">integrate with Nexus APIs.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Everything you need to extend your storefront, integrate custom ERP systems, build custom payment apps, and customize Liquid themes.
          </p>
        </div>
      </section>

      {/* Docs Interactive Explorer */}
      <section className="py-16 bg-[#0B0D1B]/90 border-t border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-4 space-y-2">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Documentation Topics</h3>
              {docsNav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl text-left border transition-all ${
                    activeSection === item.id
                      ? 'bg-[#FFBD2E]/20 border-[#FFBD2E]/60 text-white font-bold'
                      : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="text-xs text-[#FFBD2E] font-mono mb-1">{item.category}</div>
                    <div className="text-sm font-semibold">{item.title}</div>
                  </div>
                  <ChevronRight size={16} className={activeSection === item.id ? 'text-[#FFBD2E]' : 'opacity-40'} />
                </button>
              ))}
            </div>

            {/* Code & Reference View */}
            <div className="lg:col-span-8 glass rounded-3xl p-6 border border-white/10 bg-[#090b16] shadow-2xl">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <span className="font-mono text-xs text-[#27C93F]">
                  Active Schema: {activeSection.toUpperCase()}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-[#FFBD2E] hover:text-white transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied Code!' : 'Copy Snippet'}</span>
                </button>
              </div>

              <pre className="font-mono text-xs sm:text-sm text-white/90 whitespace-pre-wrap overflow-x-auto p-4 bg-black/50 rounded-xl border border-white/10">
                {codeExamples[activeSection]}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#FFBD2E]/15 via-[#FF5F56]/10 to-[#27C93F]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Start building with Nexus APIs
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Get your developer API keys inside your merchant dashboard.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#FFBD2E] via-[#FF5F56] to-[#27C93F] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Get API Keys
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
