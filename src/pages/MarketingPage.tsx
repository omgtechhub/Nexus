import { Navbar } from '../components/marketing/Navbar';
import { Hero } from '../components/marketing/Hero';
import { Stats } from '../components/marketing/Stats';
import { Features } from '../components/marketing/Features';
import { Testimonials } from '../components/marketing/Testimonials';
import { Pricing } from '../components/marketing/Pricing';
import { FAQ } from '../components/marketing/FAQ';
import { CTA } from '../components/marketing/CTA';
import { Footer } from '../components/marketing/Footer';

export function MarketingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
