import { Routes, Route, Navigate } from 'react-router-dom';
import { MarketingPage } from '../../pages/MarketingPage';
import { PricingPage } from '../../pages/PricingPage';
import { ContactPage } from '../../pages/ContactPage';
import { PrivacyPolicyPage } from '../../pages/PrivacyPolicyPage';
import { TermsOfServicePage } from '../../pages/TermsOfServicePage';
import { CookiePolicyPage } from '../../pages/CookiePolicyPage';
import { StorefrontView } from '../../components/storefront/StorefrontView';
import { ForgotPasswordPage } from '../../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../../pages/ResetPasswordPage';
import { VerifyEmailPage } from '../../pages/VerifyEmailPage';

import { CustomerRoutes } from '../../portals/customer/routes/CustomerRoutes';
import { SellerRoutes } from '../../portals/seller/routes/SellerRoutes';
import { AdminRoutes } from '../../portals/admin/routes/AdminRoutes';
import { useApp } from '../../context/AppContext';
import { AuthPage } from '../../components/auth/AuthPage';

export function AppRouter() {
  const { store } = useApp();

  return (
    <Routes>
      {/* PUBLIC MARKETING — only pages backed by something that exists. */}
      <Route path="/" element={<MarketingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/contact" element={<ContactPage />} />

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
  );
}
