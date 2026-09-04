import { useState } from 'react';
import { 
  Zap, ShoppingBag, ShieldCheck, CheckCircle2, ArrowRight, 
  Sparkles, Lock, CreditCard, Heart, Gift
} from 'lucide-react';
import { Navbar } from '../components/marketing/Navbar';
import { Footer } from '../components/marketing/Footer';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export function ShopPayPage() {
  const { navigate } = useApp();
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsCheckedOut(true);
    }, 600);
  };

  const resetSimulator = () => {
    setIsCheckedOut(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-20 left-1/3 w-[550px] h-[380px] bg-[#FF5F56]/15 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-[#FFBD2E]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FF5F56]/40 bg-[#FF5F56]/10 text-[#FF5F56] text-xs sm:text-sm font-medium mb-8 backdrop-blur-md">
            <Zap size={16} />
            <span>Shop Pay Accelerated Checkout</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
            <span className="text-white/60">Highest converting 1-click checkout</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            Accelerated 1-click checkout, <br />
            <span className="text-gradient">+50% higher conversion.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Give over 100 million buyers an instant 1-click payment experience. Pre-filled shipping addresses, tokenized security, and Shop Cash buyer loyalty rewards.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-black font-bold"
              onClick={() => navigate('signup')}
              icon={<ArrowRight size={18} />}
              iconPosition="right"
            >
              Enable Shop Pay
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-base rounded-xl border-white/20 hover:border-white/40"
              onClick={() => {
                document.getElementById('shoppay-simulator')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<Zap size={18} />}
            >
              Test 1-Click Checkout
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FF5F56]">+50%</div>
              <div className="text-xs text-white/50">Higher Conversion Rate</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">1.91x</div>
              <div className="text-xs text-white/50">Faster Checkout Speed</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#27C93F]">100M+</div>
              <div className="text-xs text-white/50">Active Saved Buyers</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#FFBD2E]">1% Cash Back</div>
              <div className="text-xs text-white/50">Shop Cash Buyer Rewards</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive 1-Click Checkout Simulator */}
      <section id="shoppay-simulator" className="py-20 bg-[#0B0D1B]/90 border-t border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Interactive Shop Pay 1-Click Checkout
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Experience how returning buyers complete purchases in under 1 second with pre-saved payment details.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative max-w-2xl mx-auto bg-[#090b16]">
            {isCheckedOut ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-full bg-[#27C93F]/20 border border-[#27C93F]/40 flex items-center justify-center text-[#27C93F] mx-auto mb-4 animate-bounce">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">Order Confirmed in 0.4 Seconds!</h4>
                <p className="text-xs text-white/60 mb-4">Shipping to: Alex Morgan, 742 Evergreen Terrace, San Francisco, CA</p>
                <div className="inline-block bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 text-[#FFBD2E] text-xs font-bold px-3 py-1 rounded-full mb-6">
                  🎁 You earned $1.15 in Shop Cash Rewards!
                </div>
                <div>
                  <Button variant="secondary" size="md" onClick={resetSimulator}>
                    Test Again
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={20} className="text-[#FF5F56]" />
                    <span className="font-bold text-white">Express Cart Checkout</span>
                  </div>
                  <span className="text-sm font-bold text-white">$115.00</span>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs space-y-2">
                  <div className="text-white/40 font-mono uppercase">Saved Buyer Profile</div>
                  <div className="font-bold text-white">Alex Morgan (alex@example.com)</div>
                  <div className="text-white/60">Visa ending in •••• 4242 · Free Express Delivery</div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-xl bg-[#5A31F4] hover:bg-[#4922db] text-white font-extrabold text-lg transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  <Zap size={20} fill="currentColor" />
                  <span>{isProcessing ? 'Authorizing Shop Pay...' : 'Pay with Shop Pay'}</span>
                </button>

                <div className="text-center text-[11px] text-white/40 flex items-center justify-center gap-1">
                  <Lock size={12} />
                  <span>Encrypted 256-bit tokenized checkout</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#FF5F56]/15 via-[#FFBD2E]/10 to-[#27C93F]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Enable 1-click checkout on your store
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Boost checkout conversion instantly by turning on Shop Pay.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="px-10 py-4 rounded-xl text-base shadow-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-black font-bold"
            onClick={() => navigate('signup')}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            Enable Shop Pay Today
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
