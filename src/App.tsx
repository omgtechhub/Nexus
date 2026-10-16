import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import { AppRouter } from './app/router/AppRouter';
import { ScrollRestoration } from './app/router/ScrollRestoration';
import { AssistantDock } from './components/assistant/AssistantDock';
import { ErrorBoundary } from './components/ErrorBoundary';

/**
 * The shopping bag lives above the router, so it survives every navigation —
 * including the trip out to the customer sign-in page and back to checkout,
 * which is exactly where a cart mounted inside a page would be lost.
 *
 * It is keyed to the signed-in user. A guest's bag is merged into theirs on
 * sign-in rather than discarded, and signing out does not leave one customer's
 * bag on a shared device for the next person.
 */
function MarketplaceCart({ children }: { children: ReactNode }) {
  const { user } = useApp();
  return (
    <CartProvider scope="marketplace" identityKey={user?.id ?? null}>
      {children}
    </CartProvider>
  );
}

/**
 * Toasts render in a portal outside the React tree's styled surfaces, so they
 * cannot inherit the page background. Reading the theme here keeps them in step
 * instead of leaving a dark toast floating over a light page.
 */
function ThemedToaster() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: isDark ? '#1a1a1a' : '#ffffff',
          color: isDark ? '#fff' : '#0B0D1B',
          border: isDark
            ? '1px solid rgba(255,255,255,0.1)'
            : '1px solid rgba(11,13,27,0.10)',
          borderRadius: '12px',
          fontSize: '14px',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(11,13,27,0.12)',
        },
        success: {
          iconTheme: { primary: isDark ? '#10b981' : '#067647', secondary: '#fff' },
        },
        error: {
          iconTheme: { primary: isDark ? '#ef4444' : '#B42318', secondary: '#fff' },
        },
      }}
    />
  );
}

export default function App() {
  // Derived from Vite's `base`, which is the same value the built asset URLs
  // use. Sniffing window.location for a '/nexus' prefix was a second,
  // independent guess at where the app is deployed, and the two could disagree.
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const basename = base || undefined;

  return (
    /**
     * The root backstop.
     *
     * AppRouter has its own boundary around the route table, which is the one
     * that keeps the shell alive when a page throws. This one catches what
     * that cannot: a provider throwing during its own initialisation, above
     * the router, where there is no shell left to preserve.
     */
    <ErrorBoundary scope="root">
    <BrowserRouter basename={basename}>
      <ThemeProvider>
        {/* Must sit inside the router: it reads the location. */}
        <ScrollRestoration />
        <AppProvider>
          <MarketplaceCart>
            <AppRouter />
            {/* Inside the cart provider: the shopper's assistant proposes
                changes to the same bag the page's buttons do. Above the
                router, so the launchers do not unmount and remount — and the
                panel does not close — on every navigation. */}
            <AssistantDock />
          </MarketplaceCart>
          <ThemedToaster />
        </AppProvider>
      </ThemeProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
