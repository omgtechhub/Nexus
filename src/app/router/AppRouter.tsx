import { Routes, Route, Navigate } from 'react-router-dom';
import { MarketingPage } from '../../pages/MarketingPage';
import { OnlineStorePage } from '../../pages/OnlineStorePage';
import { POSPage } from '../../pages/POSPage';
import { PaymentsPage } from '../../pages/PaymentsPage';
import { AIAssistantPage } from '../../pages/AIAssistantPage';
import { StartupsPage } from '../../pages/StartupsPage';
import { EnterprisesPage } from '../../pages/EnterprisesPage';
import { D2CBrandsPage } from '../../pages/D2CBrandsPage';
import { B2BWholesalePage } from '../../pages/B2BWholesalePage';
import { PricingPage } from '../../pages/PricingPage';
import { ResourcesPage } from '../../pages/ResourcesPage';
import { CapitalPage } from '../../pages/CapitalPage';
import { ShippingPage } from '../../pages/ShippingPage';
import { MarketsPage } from '../../pages/MarketsPage';
import { ShopPayPage } from '../../pages/ShopPayPage';
import { SmallBusinessPage } from '../../pages/SmallBusinessPage';
import { MarketplacesSolutionPage } from '../../pages/MarketplacesSolutionPage';
import { RetailSolutionPage } from '../../pages/RetailSolutionPage';
import { InternationalSolutionPage } from '../../pages/InternationalSolutionPage';
import { DocumentationPage } from '../../pages/DocumentationPage';
import { BlogPage } from '../../pages/BlogPage';
import { HelpCenterPage } from '../../pages/HelpCenterPage';
import { PartnersPage } from '../../pages/PartnersPage';
import { AppStorePage } from '../../pages/AppStorePage';
import { ChangelogPage } from '../../pages/ChangelogPage';
import { StatusPage } from '../../pages/StatusPage';
import { CommunityPage } from '../../pages/CommunityPage';
import { PrivacyPolicyPage } from '../../pages/PrivacyPolicyPage';
import { TermsOfServicePage } from '../../pages/TermsOfServicePage';
import { CookiePolicyPage } from '../../pages/CookiePolicyPage';
import { SitemapPage } from '../../pages/SitemapPage';
import { AboutUsPage } from '../../pages/AboutUsPage';
import { CareersPage } from '../../pages/CareersPage';
import { PressPage } from '../../pages/PressPage';
import { InvestorsPage } from '../../pages/InvestorsPage';
import { ContactPage } from '../../pages/ContactPage';
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
      {/* PUBLIC MARKETING & PRODUCT ROUTES */}
      <Route path="/" element={<MarketingPage />} />
      <Route path="/marketing" element={<MarketingPage />} />
      <Route path="/online-store" element={<OnlineStorePage />} />
      <Route path="/pos" element={<POSPage />} />
      <Route path="/payments" element={<PaymentsPage />} />
      <Route path="/capital" element={<CapitalPage />} />
      <Route path="/shipping" element={<ShippingPage />} />
      <Route path="/markets" element={<MarketsPage />} />
      <Route path="/ai-assistant" element={<AIAssistantPage />} />
      <Route path="/shop-pay" element={<ShopPayPage />} />
      
      {/* SOLUTIONS & COMPANY */}
      <Route path="/startups" element={<StartupsPage />} />
      <Route path="/small-business" element={<SmallBusinessPage />} />
      <Route path="/enterprises" element={<EnterprisesPage />} />
      <Route path="/d2c" element={<D2CBrandsPage />} />
      <Route path="/b2b" element={<B2BWholesalePage />} />
      <Route path="/marketplaces" element={<MarketplacesSolutionPage />} />
      <Route path="/retail" element={<RetailSolutionPage />} />
      <Route path="/international" element={<InternationalSolutionPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/resources" element={<ResourcesPage />} />
      <Route path="/docs" element={<DocumentationPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/help-center" element={<HelpCenterPage />} />
      <Route path="/partners" element={<PartnersPage />} />
      <Route path="/app-store" element={<AppStorePage />} />
      <Route path="/changelog" element={<ChangelogPage />} />
      <Route path="/status-page" element={<StatusPage />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/cookies" element={<CookiePolicyPage />} />
      <Route path="/sitemap" element={<SitemapPage />} />
      <Route path="/about" element={<AboutUsPage />} />
      <Route path="/careers" element={<CareersPage />} />
      <Route path="/press" element={<PressPage />} />
      <Route path="/investors" element={<InvestorsPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* PUBLIC STOREFRONT ROUTE */}
      <Route path="/storefront" element={<StorefrontView storeSlug={store?.id} />} />
      <Route path="/storefront/:storeSlug" element={<StorefrontView />} />

      {/* PORTAL SPECIFIC ROUTES */}
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
