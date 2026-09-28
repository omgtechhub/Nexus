import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { NotificationPanel } from './NotificationPanel';
import { Overview } from './Overview';
import { Orders } from './Orders';
import { Products } from './Products';
import { Customers } from './Customers';
import { Analytics } from './Analytics';
import { Settings } from './Settings';
import { StorefrontSection } from './StorefrontSection';
import { PaymentsSection } from './PaymentsSection';
import { DiscountsSection } from './DiscountsSection';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/cn';
import { Bell } from 'lucide-react';
import { useParams } from 'react-router-dom';

export function DashboardLayout() {
  const { dashboardSection, sidebarOpen } = useApp();
  const { section: urlSection } = useParams<{ section?: string }>();

  const currentSection = (urlSection && urlSection !== 'dashboard') ? urlSection : dashboardSection;
  const activeSection = currentSection || 'overview';

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
      case 'dashboard':
        return <Overview />;
      case 'analytics':
        return <Analytics />;
      case 'orders':
        return <Orders />;
      case 'products':
        return <Products />;
      case 'customers':
        return <Customers />;
      case 'settings':
        return <Settings />;
      case 'storefront':
        return <StorefrontSection />;
      case 'payments':
        return <PaymentsSection />;
      case 'discounts':
        return <DiscountsSection />;
      case 'notifications':
        return (
          <div className="space-y-3">
            <p className="text-white/40 text-sm">Notification center</p>
            {/* Inline notifications view */}
            <div className="stat-card p-4">
              <div className="flex items-center gap-3 mb-4">
                <Bell size={18} className="text-white/50" />
                <h3 className="text-sm font-semibold text-white">All Notifications</h3>
              </div>
              <p className="text-sm text-white/40 text-center py-8">Notification center — check the bell icon in the top bar for real-time updates.</p>
            </div>
          </div>
        );
      default:
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <TopBar />
      <NotificationPanel />

      {/* Main content */}
      <main className={cn(
        'transition-all duration-300 pt-16 min-h-screen',
        sidebarOpen ? 'ml-0 md:ml-56' : 'ml-0 md:ml-16'
      )}>
        <div className="p-3 sm:p-5 lg:p-6 max-w-full overflow-hidden">
          {renderSection()}
        </div>
      </main>
    </div>
  );
}
