import { useState } from 'react';
import { 
  Sparkles, Zap, Brain, MessageSquare, TrendingUp, Copy, Check, 
  ArrowRight, ShoppingBag
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function AIAssistantPage() {
  const { navigate } = useApp();
  const [activePreset, setActivePreset] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputResult, setOutputResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const promptPresets = [
    {
      title: 'Generate Product Copy & SEO',
      prompt: 'Write an SEO-optimized product title, description, and bullet points for an "Organic Ceramic Tea Set".',
      category: 'Store Merchandising',
      result: `🍵 Title: Artisan Handcrafted Ceramic Tea Set (4 Cups & Teapot)

Description:
Elevate your daily tea ritual with our sustainable ceramic tea set. Hand-finished by master artisans, each piece features heat-retentive stoneware and a drip-free spout.

Key Highlights:
• Includes 24oz Teapot & 4 Matching 6oz Stoneware Cups
• Lead-Free, Non-Toxic Glaze & Dishwasher Safe
• Keeps Tea Warm 35% Longer Than Glass
• Eco-Friendly Recyclable Gift Packaging

Meta SEO Keywords: ceramic tea set, artisanal teapot, organic stoneware gift set`,
    },
    {
      title: 'Forecast Inventory Demand',
      prompt: 'Analyze sales data from the past 30 days and predict reorder dates for top-selling SKUs.',
      category: 'Inventory Management',
      result: `📊 NexusIQ Inventory Reorder Forecast
Store Analysis (Last 30 Days):

• Top SKU: "Vintage Leather Tote" (Stock Remaining: 14 units)
• Predicted Stockout Date: October 12th (in 6 days)
• Reorder Recommendation: Order 200 units immediately from Supplier B to maintain zero inventory downtime.
• Projected Sales Gain: +$17,800 revenue preserved during peak weekend.`,
    },
    {
      title: 'Draft Flash Sale Email & SMS',
      prompt: 'Create a high-converting 24-hour promotional email & SMS campaign for VIP store subscribers.',
      category: 'Customer Marketing',
      result: `📱 SMS Campaign:
VIP ALERT ⚡ 24 Hours Only: Get 25% OFF your entire order with code VIP25. Tap to shop before stock runs out: nexus.store/vip

📧 Email Subject: VIP Access: 25% OFF Everything (24 Hours Only)

Hey [Customer Name],
As a valued VIP buyer, you get exclusive early access to our storewide weekend sale. Enjoy 25% OFF all collections today!

[Claim 25% Off My Cart]`,
    },
    {
      title: 'Dynamic Profit Margin Optimizer',
      prompt: 'Suggest optimal price adjustments for low-stock high-demand items to maximize profit margin.',
      category: 'Store Profitability',
      result: `💡 NexusIQ Dynamic Margin Suggestion
Target Item: Wireless ANC Earbuds (Inventory: 8 units left)

• Current Price: $59.00 → Suggested Price: $69.00 (+16.9%)
• Market Signal: High cart addition velocity + zero competitor stock.
• Resulting Profit Impact: +$80 net margin added without impacting conversion rate.`,
    },
  ];

  const handleRunPreset = (index: number) => {
    setActivePreset(index);
    setIsGenerating(true);
    setOutputResult(null);
    setCopied(false);

    setTimeout(() => {
      setIsGenerating(false);
      setOutputResult(promptPresets[index].result);
    }, 1000);
  };

  const handleCopy = () => {
    if (!outputResult) return;
    navigator.clipboard.writeText(outputResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[650px] h-[400px] bg-gradient-to-r from-[#FF5F56]/15 via-[#FFBD2E]/20 to-[#27C93F]/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FFBD2E]/50 bg-[#FFBD2E]/10 text-[#FFBD2E] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <Sparkles size={16} />
            <span>NexusIQ Commerce AI Copilot</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-white/60">Autonomous Store Assistant</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Meet NexusIQ: <br />
            <span className="text-gradient">Your 24/7 E-Commerce Copilot.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Automate tedious e-commerce tasks and grow store profits. Generate SEO product copy, forecast inventory reorders, automate customer support chat, and optimize price margins effortlessly.
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
              Try NexusIQ AI Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl border-white/20 hover:border-white/40"
              onClick={() => {
                document.getElementById('ai-copilot-studio')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<Brain size={18} />}
            >
              Test Live Merchant AI
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FFBD2E]">10x</div>
              <div className="text-xs text-white/50">Faster Product Uploads</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#27C93F]">+34%</div>
              <div className="text-xs text-white/50">Store Conversion Lift</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">85%</div>
              <div className="text-xs text-white/50">Buyer Tickets Automated</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FF5F56]">24/7</div>
              <div className="text-xs text-white/50">Autonomous Assistance</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Merchant AI Copilot Sandbox */}
      <section id="ai-copilot-studio" className="py-20 bg-[#0B0D1B]/90 border-t border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Interactive Merchant AI Studio
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Select an e-commerce task preset below and watch NexusIQ execute live store automation.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative max-w-5xl mx-auto">
            <div className="bg-[#131629] px-4 py-3 rounded-t-2xl border-b border-white/10 flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                <span className="text-xs text-white/50 ml-2 font-mono">NexusIQ Merchant Copilot v4.2</span>
              </div>
              <span className="text-xs text-[#FFBD2E] font-mono">AI Connected to Store</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {promptPresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRunPreset(idx)}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    activePreset === idx
                      ? 'bg-[#FFBD2E]/20 border-[#FFBD2E]/60 text-white shadow-lg'
                      : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-[#FFBD2E] block mb-1">
                    {preset.category}
                  </span>
                  <div className="text-xs font-semibold line-clamp-1">{preset.title}</div>
                </button>
              ))}
            </div>

            <div className="mb-6">
              <div className="text-xs font-semibold text-white/40 uppercase mb-2 flex items-center gap-2">
                <ShoppingBag size={14} className="text-[#FFBD2E]" />
                <span>Merchant Task Instruction:</span>
              </div>
              <div className="bg-black/50 p-4 rounded-xl border border-white/10 text-sm font-mono text-white/80">
                "{promptPresets[activePreset].prompt}"
              </div>
            </div>

            <div className="flex justify-center mb-6">
              <Button
                variant="primary"
                size="md"
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#FFBD2E] via-[#FF5F56] to-[#27C93F] text-black font-bold shadow-xl"
                onClick={() => handleRunPreset(activePreset)}
                disabled={isGenerating}
                icon={<Sparkles size={16} />}
              >
                {isGenerating ? 'NexusIQ Generating...' : 'Run Merchant AI Task'}
              </Button>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/15 bg-[#090b16] relative min-h-[220px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-xs">
                <span className="text-white/40 font-mono">Generated Store Output</span>
                {outputResult && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[#27C93F] hover:text-[#27C93F]/80 transition-colors font-medium"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Copied to Store!' : 'Copy Result'}</span>
                  </button>
                )}
              </div>

              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-10 h-10 rounded-full border-2 border-[#FFBD2E] border-t-transparent animate-spin mb-4" />
                  <span className="text-xs font-mono text-[#FFBD2E]">Analyzing store data & drafting output...</span>
                </div>
              ) : outputResult ? (
                <div className="space-y-4">
                  <pre className="text-sm font-sans text-white/90 whitespace-pre-wrap leading-relaxed">
                    {outputResult}
                  </pre>
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40 font-mono">
                    <span>⚡ Processing Speed: 1.1s</span>
                    <span className="text-[#27C93F]">Relevance Score: 99.4%</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-white/30 text-xs font-mono">
                  Click "Run Merchant AI Task" above to generate store content.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Merchant Capabilities */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
              4 Pillars of NexusIQ Merchant Intelligence
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-base">
              Automate daily store operations and make data-driven decisions that grow net profits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass rounded-2xl p-6 border border-white/10 hover:border-[#FFBD2E]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#FFBD2E]/10 border border-[#FFBD2E]/20 flex items-center justify-center text-[#FFBD2E] mb-6">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Automated Merchandising</h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                Generate high-converting product descriptions, ad headlines, and Meta tags tailored to your brand voice.
              </p>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/10 hover:border-[#27C93F]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#27C93F]/10 border border-[#27C93F]/20 flex items-center justify-center text-[#27C93F] mb-6">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Demand Forecasting</h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                Predict stockouts before they happen and receive automated inventory reorder alerts for top-selling SKUs.
              </p>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/10 hover:border-[#FF5F56]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/20 flex items-center justify-center text-[#FF5F56] mb-6">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">24/7 Buyer Concierge</h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                Deploy an AI storefront chatbot that answers buyer questions, checks order tracking, and processes returns.
              </p>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/10 hover:border-purple-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Dynamic Pricing Engine</h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                Automatically optimize prices based on competitor stock levels and demand velocity to maximize store margins.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#FFBD2E]/20 via-[#FF5F56]/10 to-[#27C93F]/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Put AI to work for your e-commerce store
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Experience the power of NexusIQ with a 14-day free trial.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#FFBD2E] via-[#FF5F56] to-[#27C93F] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Get Started with NexusIQ
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
