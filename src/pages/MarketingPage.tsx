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
    <div className="min-h-screen bg-[var(--surface-sunken)]">
      <Navbar overlaysDarkHero />
      {/* The Navbar's skip link targets #main, and a page needs one main
          landmark regardless. */}
      <main id="main" tabIndex={-1}>
        <Hero />
        <Stats />
        <Features />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
