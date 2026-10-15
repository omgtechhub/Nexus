import { lazy, Suspense } from 'react';

/**
 * The dashboard shell loads eagerly; its sections do not.
 *
 * Shipping every section in one chunk meant a seller opening Overview also
 * downloaded Analytics, Settings and everything else — including `recharts`,
 * which only Overview and Analytics use. Each section is now fetched when it
 * is first opened.
 *
 * Sections are the ten a marketplace seller account actually needs. The
 * storefront theme editor, discount codes and shipping-zone configuration are
 * gone: those belong to a seller who owns their own shop, and on Nexus the
 * platform owns the shopfront, the checkout and the delivery rules.
 */
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { NotificationPanel } from './NotificationPanel';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/cn';
import { Bell } from 'lucide-react';

const Overview = lazy(() => import('./Overview').then(m => ({ default: m.Overview })));
const Orders = lazy(() => import('./Orders').then(m => ({ default: m.Orders })));
const Products = lazy(() => import('./Products').then(m => ({ default: m.Products })));
const Customers = lazy(() => import('./Customers').then(m => ({ default: m.Customers })));
const Analytics = lazy(() => import('./Analytics').then(m => ({ default: m.Analytics })));
const Settings = lazy(() => import('./Settings').then(m => ({ default: m.Settings })));
const PaymentsSection = lazy(() => import('./PaymentsSection').then(m => ({ default: m.PaymentsSection })));
const InventorySection = lazy(() => import('./InventorySection').then(m => ({ default: m.InventorySection })));
const ShipmentsSection = lazy(() => import('./ShipmentsSection').then(m => ({ default: m.ShipmentsSection })));
const NexusIqSection = lazy(() => import('./NexusIqSection').then(m => ({ default: m.NexusIqSection })));
const ReviewsSection = lazy(() => import('./ReviewsSection').then(m => ({ default: m.ReviewsSection })));
const HelpSection = lazy(() => import('./HelpSection').then(m => ({ default: m.HelpSection })));

/** Shown while a section chunk arrives. The shell around it is already painted,
 *  so this sits in the content area rather than covering the screen. */
function SectionFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
      <span className="sr-only">Loading section…</span>
      <div className="w-7 h-7 rounded-full border-2 border-[var(--ink)]/15 border-t-[#FFBD2E] animate-spin" aria-hidden="true" />
    </div>
  );
}

export function DashboardLayout() {
  // `dashboardSection` is derived from the URL, so it already reflects :section.
  const { dashboardSection: activeSection, sidebarOpen } = useApp();

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview />;
      case 'analytics':
        return <Analytics />;
      case 'orders':
        return <Orders />;
      case 'products':
        return <Products />;
      case 'reviews':
        return <ReviewsSection />;
      case 'customers':
        return <Customers />;
      case 'settings':
        return <Settings />;
      case 'payments':
        return <PaymentsSection />;
      case 'inventory':
        return <InventorySection />;
      case 'shipments':
        return <ShipmentsSection />;
      case 'nexus-iq':
        return <NexusIqSection />;
      case 'help':
        return <HelpSection />;
      case 'notifications':
        return (
          <div className="space-y-3">
            <p className="text-muted text-sm">Notification center</p>
            {/* Inline notifications view */}
            <div className="stat-card p-4">
              <div className="flex items-center gap-3 mb-4">
                <Bell size={18} className="text-muted" />
                <h3 className="text-sm font-semibold text-primary">All Notifications</h3>
              </div>
              <p className="text-sm text-muted text-center py-8">Notification center — check the bell icon in the top bar for real-time updates.</p>
            </div>
          </div>
        );
      default:
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-sunken)]">
      <Sidebar />
      <TopBar />
      <NotificationPanel />

      {/* Main content */}
      <main className={cn(
        'transition-colors duration-300 pt-16 min-h-screen',
        sidebarOpen ? 'ml-0 md:ml-56' : 'ml-0 md:ml-16'
      )}>
        <div className="p-3 sm:p-5 lg:p-6 max-w-full overflow-hidden">
          {/* Keyed on the section so switching sections shows the fallback again
              rather than holding the previous section on screen while the next
              chunk downloads. */}
          <Suspense key={activeSection} fallback={<SectionFallback />}>
            {renderSection()}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
