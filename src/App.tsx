import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';
import { MarketingPage } from './pages/MarketingPage';
import { AuthPage } from './components/auth/AuthPage';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { AdminPanel } from './components/admin/AdminPanel';
import { OnlineStorePage } from './pages/OnlineStorePage';
import { POSPage } from './pages/POSPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { StartupsPage } from './pages/StartupsPage';
import { EnterprisesPage } from './pages/EnterprisesPage';
import { D2CBrandsPage } from './pages/D2CBrandsPage';
import { B2BWholesalePage } from './pages/B2BWholesalePage';
import { PricingPage } from './pages/PricingPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { CapitalPage } from './pages/CapitalPage';
import { ShippingPage } from './pages/ShippingPage';
import { MarketsPage } from './pages/MarketsPage';
import { ShopPayPage } from './pages/ShopPayPage';
import { SmallBusinessPage } from './pages/SmallBusinessPage';
import { MarketplacesSolutionPage } from './pages/MarketplacesSolutionPage';
import { RetailSolutionPage } from './pages/RetailSolutionPage';
import { InternationalSolutionPage } from './pages/InternationalSolutionPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { BlogPage } from './pages/BlogPage';
import { HelpCenterPage } from './pages/HelpCenterPage';
import { PartnersPage } from './pages/PartnersPage';
import { AppStorePage } from './pages/AppStorePage';
import { ChangelogPage } from './pages/ChangelogPage';
import { StatusPage } from './pages/StatusPage';
import { CommunityPage } from './pages/CommunityPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { CookiePolicyPage } from './pages/CookiePolicyPage';
import { SitemapPage } from './pages/SitemapPage';
import { AboutUsPage } from './pages/AboutUsPage';
import { CareersPage } from './pages/CareersPage';
import { PressPage } from './pages/PressPage';
import { InvestorsPage } from './pages/InvestorsPage';
import { ContactPage } from './pages/ContactPage';

function AppContent() {
  const { currentView } = useApp();

  switch (currentView) {
    case 'marketing':
      return <MarketingPage />;
    case 'online-store':
      return <OnlineStorePage />;
    case 'pos':
      return <POSPage />;
    case 'payments':
      return <PaymentsPage />;
    case 'ai-assistant':
      return <AIAssistantPage />;
    case 'capital':
      return <CapitalPage />;
    case 'shipping':
      return <ShippingPage />;
    case 'markets':
      return <MarketsPage />;
    case 'shop-pay':
      return <ShopPayPage />;
    case 'startups':
      return <StartupsPage />;
    case 'small-business':
      return <SmallBusinessPage />;
    case 'enterprises':
      return <EnterprisesPage />;
    case 'd2c':
      return <D2CBrandsPage />;
    case 'b2b':
      return <B2BWholesalePage />;
    case 'marketplaces':
      return <MarketplacesSolutionPage />;
    case 'retail':
      return <RetailSolutionPage />;
    case 'international':
      return <InternationalSolutionPage />;
    case 'pricing':
      return <PricingPage />;
    case 'resources':
      return <ResourcesPage />;
    case 'docs':
      return <DocumentationPage />;
    case 'blog':
      return <BlogPage />;
    case 'help-center':
      return <HelpCenterPage />;
    case 'partners':
      return <PartnersPage />;
    case 'app-store':
      return <AppStorePage />;
    case 'changelog':
      return <ChangelogPage />;
    case 'status-page':
      return <StatusPage />;
    case 'community':
      return <CommunityPage />;
    case 'privacy':
      return <PrivacyPolicyPage />;
    case 'terms':
      return <TermsOfServicePage />;
    case 'cookies':
      return <CookiePolicyPage />;
    case 'sitemap':
      return <SitemapPage />;
    case 'about':
      return <AboutUsPage />;
    case 'careers':
      return <CareersPage />;
    case 'press':
      return <PressPage />;
    case 'investors':
      return <InvestorsPage />;
    case 'contact':
      return <ContactPage />;
    case 'login':
      return <AuthPage mode="login" />;
    case 'signup':
      return <AuthPage mode="signup" />;
    case 'dashboard':
      return <DashboardLayout />;
    case 'admin':
      return <AdminPanel />;
    default:
      return <MarketingPage />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </AppProvider>
  );
}
