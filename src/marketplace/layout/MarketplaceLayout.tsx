import { Outlet } from 'react-router-dom';
import { MarketplaceHeader } from './MarketplaceHeader';
import { MiniCart } from './MiniCart';
import { Footer } from '../../components/marketing/Footer';

/**
 * The public shopping shell: header, page, footer, and the slide-over bag.
 *
 * The cart provider is not here — it lives above the router in `App`, so the
 * bag survives navigation into the sign-in page and back out to checkout.
 *
 * Nor is the shopping assistant: it moved into the app-wide `AssistantDock`,
 * where it shares a corner with the WhatsApp button and is reachable from the
 * marketing pages and the seller console too, rather than only from here.
 */
export function MarketplaceLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-base)]">
      <MarketplaceHeader />
      <main id="main" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <MiniCart />
    </div>
  );
}
