import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MarketingPage } from '../../pages/MarketingPage';
import { useApp } from '../../context/AppContext';
import { RouteFallback } from './RouteFallback';

/**
 * Route-level code splitting.
 *
 * The homepage is the common entry point, so it stays in the entry chunk —
 * lazy-loading it would put a network round-trip in front of the first paint.
 * Everything else is fetched on navigation.
 *
 * The three portals are the reason this matters. Before this, a visitor reading
 * the marketing page downloaded the entire seller dashboard, the platform
 * console and the customer portal — including `recharts`, which only two
 * dashboard components use — before anything rendered.
 *
 * `React.lazy` wants a default export and these modules are all named, hence
 * the `.then` unwrapping.
 */

// Portals: the bulk of the application, all behind a login.
const SellerRoutes = lazy(() =>
  import('../../portals/seller/routes/SellerRoutes').then(m => ({ default: m.SellerRoutes }))
);
const CustomerRoutes = lazy(() =>
  import('../../portals/customer/routes/CustomerRoutes').then(m => ({ default: m.CustomerRoutes }))
);
const AdminRoutes = lazy(() =>
  import('../../portals/admin/routes/AdminRoutes').then(m => ({ default: m.AdminRoutes }))
);

// Public storefront: a separate audience from the marketing site.
const StorefrontView = lazy(() =>
  import('../../components/storefront/StorefrontView').then(m => ({ default: m.StorefrontView }))
);

// Marketing pages past the homepage.
const PricingPage = lazy(() =>
  import('../../pages/PricingPage').then(m => ({ default: m.PricingPage }))
);
const ContactPage = lazy(() =>
  import('../../pages/ContactPage').then(m => ({ default: m.ContactPage }))
);
const TrackOrderPage = lazy(() =>
  import('../../pages/TrackOrderPage').then(m => ({ default: m.TrackOrderPage }))
);

// Legal: rarely read, and never on the path to anything else.
const PrivacyPolicyPage = lazy(() =>
  import('../../pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage }))
);
const TermsOfServicePage = lazy(() =>
  import('../../pages/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage }))
);
const CookiePolicyPage = lazy(() =>
  import('../../pages/CookiePolicyPage').then(m => ({ default: m.CookiePolicyPage }))
);

// Account recovery: reached from an emailed link, once.
const ForgotPasswordPage = lazy(() =>
  import('../../pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('../../pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage }))
);
const VerifyEmailPage = lazy(() =>
  import('../../pages/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage }))
);

const AuthPage = lazy(() =>
  import('../../components/auth/AuthPage').then(m => ({ default: m.AuthPage }))
);

export function AppRouter() {
  const { store } = useApp();

  return (
    // One boundary around the table rather than one per route: only ever a
    // single route is resolving, and nesting them would not change what the
    // user sees.
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* PUBLIC MARKETING — only pages backed by something that exists. */}
        <Route path="/" element={<MarketingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Order tracking is deliberately public: a guest checkout has no account,
            and the order number plus its email is what proves entitlement. */}
        <Route path="/track" element={<TrackOrderPage />} />

        {/* LEGAL */}
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/cookies" element={<CookiePolicyPage />} />

        {/* PUBLIC STOREFRONT */}
        <Route path="/storefront" element={<StorefrontView storeSlug={store?.id} />} />
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

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
