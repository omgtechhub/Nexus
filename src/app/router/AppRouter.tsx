import { lazy, Suspense, ComponentType } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MarketingPage } from '../../pages/MarketingPage';
import { useApp } from '../../context/AppContext';
import { RequireCustomer } from '../auth/guards';
import { RouteFallback } from './RouteFallback';
import { ErrorBoundary } from '../../components/ErrorBoundary';

/**
 * Route-level code splitting.
 *
 * The marketing homepage is the common entry point, so it stays in the entry
 * chunk — lazy-loading it would put a network round-trip in front of the first
 * paint. Everything else is fetched on navigation.
 *
 * The three portals are the reason this matters. Before this, a visitor reading
 * the marketing page downloaded the entire seller dashboard, the platform
 * console and the customer portal — including `recharts`, which only two
 * dashboard components use — before anything rendered.
 *
 * `React.lazy` wants a default export and these modules are all named, hence
 * the `.then` unwrapping.
 */

/** Unwrap a named export into the default shape `React.lazy` expects. */
function lazyNamed<T extends string>(
  loader: () => Promise<Record<T, ComponentType<any>>>,
  name: T
) {
  return lazy(() => loader().then(m => ({ default: m[name] })));
}

// Portals: the bulk of the application, all behind a login.
const SellerRoutes = lazyNamed(() => import('../../portals/seller/routes/SellerRoutes'), 'SellerRoutes');
const CustomerRoutes = lazyNamed(() => import('../../portals/customer/routes/CustomerRoutes'), 'CustomerRoutes');
const AdminRoutes = lazyNamed(() => import('../../portals/admin/routes/AdminRoutes'), 'AdminRoutes');

// The shop. Its own layout (search, categories, bag) wraps every shopping page.
const MarketplaceLayout = lazyNamed(() => import('../../marketplace/layout/MarketplaceLayout'), 'MarketplaceLayout');
const MarketplaceHome = lazyNamed(() => import('../../marketplace/pages/MarketplaceHome'), 'MarketplaceHome');
const ProductsPage = lazyNamed(() => import('../../marketplace/pages/ProductsPage'), 'ProductsPage');
const ProductDetailPage = lazyNamed(() => import('../../marketplace/pages/ProductDetailPage'), 'ProductDetailPage');
const CartPage = lazyNamed(() => import('../../marketplace/pages/CartPage'), 'CartPage');
const CheckoutPage = lazyNamed(() => import('../../marketplace/pages/CheckoutPage'), 'CheckoutPage');
const CheckoutCompletePage = lazyNamed(() => import('../../marketplace/pages/CheckoutCompletePage'), 'CheckoutCompletePage');

// A single merchant's own storefront: a separate audience from the marketplace.
const StorefrontView = lazyNamed(() => import('../../components/storefront/StorefrontView'), 'StorefrontView');

// Marketing pages past the homepage.
const PricingPage = lazyNamed(() => import('../../pages/PricingPage'), 'PricingPage');
const ContactPage = lazyNamed(() => import('../../pages/ContactPage'), 'ContactPage');
const TrackOrderPage = lazyNamed(() => import('../../pages/TrackOrderPage'), 'TrackOrderPage');

// Legal: rarely read, and never on the path to anything else.
const PrivacyPolicyPage = lazyNamed(() => import('../../pages/PrivacyPolicyPage'), 'PrivacyPolicyPage');
const TermsOfServicePage = lazyNamed(() => import('../../pages/TermsOfServicePage'), 'TermsOfServicePage');
const CookiePolicyPage = lazyNamed(() => import('../../pages/CookiePolicyPage'), 'CookiePolicyPage');

// Account recovery: reached from an emailed link, once.
const ForgotPasswordPage = lazyNamed(() => import('../../pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyNamed(() => import('../../pages/ResetPasswordPage'), 'ResetPasswordPage');
const VerifyEmailPage = lazyNamed(() => import('../../pages/VerifyEmailPage'), 'VerifyEmailPage');

const AuthPage = lazyNamed(() => import('../../components/auth/AuthPage'), 'AuthPage');

// The catch-all. Small, and reached from anywhere, so it is worth the chunk.
const NotFoundPage = lazyNamed(() => import('../../pages/NotFoundPage'), 'NotFoundPage');

export function AppRouter() {
  const { store } = useApp();
  const location = useLocation();

  return (
    /**
     * An error boundary around the route table.
     *
     * Keyed on the pathname, so navigating away from a page that threw clears
     * the error instead of leaving the user stuck on it until they reload.
     * Inside the shell rather than around it, so the header, footer and bag
     * survive — a failing product page should not cost the shopper their cart.
     */
    <ErrorBoundary scope="route" resetKey={location.pathname}>
      {/* One Suspense boundary around the table rather than one per route:
          only ever a single route is resolving, and nesting them would not
          change what the user sees. */}
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* PUBLIC MARKETING — only pages backed by something that exists.
              The landing page is the root route; Shop, Pricing and Contact are
              the whole of the public navigation. Anything else falls through to
              the catch-all below. */}
          <Route path="/" element={<MarketingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* THE SHOP.

              `/products` is the storefront: a shopper browses, searches and fills
              a bag here without an account, and only checkout asks who they are.
              Every page below shares the shop's own header and footer. */}
          <Route element={<MarketplaceLayout />}>
            <Route path="/products" element={<MarketplaceHome />} />
            {/* A static segment, so it is never confused with a store id — which
                is why the detail route below needs two segments to match. */}
            <Route path="/products/browse" element={<ProductsPage />} />
            <Route path="/products/:storeId/:productSlug" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />

            {/* Checkout is the first thing that needs an identity. The guard
                sends a guest to the customer sign-in and carries this location,
                so they come back here instead of to a dashboard. */}
            <Route
              path="/checkout"
              element={
                <RequireCustomer>
                  <CheckoutPage />
                </RequireCustomer>
              }
            />
            {/* Deliberately public: this is where the payment gateway returns the
                customer, and a lapsed session must not hide the outcome of a
                charge behind a login form. It verifies server-side and shows
                only what the server reports. */}
            <Route path="/checkout/complete" element={<CheckoutCompletePage />} />
          </Route>

          {/* Order tracking is deliberately public: a guest checkout has no account,
              and the order number plus its email is what proves entitlement. */}
          <Route path="/track" element={<TrackOrderPage />} />

          {/* LEGAL */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />

          {/* PUBLIC STOREFRONT — one merchant's own shop.

              A storefront belongs to a store, so the slugged route is the real
              one. The bare path only means anything to a signed-in merchant
              previewing their own shop; for everyone else — including every
              signed-in *customer*, whose `store` is always undefined — it
              rendered "No storefront specified", so it sent shoppers to a dead
              end. It now falls through to the marketplace instead. */}
          <Route
            path="/storefront"
            element={
              store?.id
                ? <StorefrontView storeSlug={store.id} />
                : <Navigate to="/products" replace />
            }
          />
          <Route path="/storefront/:storeSlug" element={<StorefrontView />} />

          {/* PORTALS */}
          <Route path="/account/*" element={<CustomerRoutes />} />
          <Route path="/customer-portal" element={<Navigate to="/account/dashboard" replace />} />

          <Route path="/seller/*" element={<SellerRoutes />} />
          <Route path="/dashboard/*" element={<Navigate to="/seller/dashboard" replace />} />

          <Route path="/admin/*" element={<AdminRoutes />} />

          {/* ACCOUNT RECOVERY — reachable signed out; the token is the credential */}
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* LEGACY AUTH DIRECT PATH ALIASES */}
          <Route path="/login" element={<AuthPage mode="login" portal="seller" />} />
          <Route path="/signup" element={<AuthPage mode="signup" portal="seller" />} />

          {/* FALLBACK — a real 404, not a silent redirect home.

              This was `<Navigate to="/" replace />`, so a mistyped or
              truncated URL quietly became the homepage: the visitor thought
              their link had worked, Back did not return them to where they
              came from, and crawlers got a 200 with the homepage's content at
              an address that does not exist. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
