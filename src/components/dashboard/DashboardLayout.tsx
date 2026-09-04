import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { NotificationPanel } from './NotificationPanel';
import { Overview } from './Overview';
import { Orders } from './Orders';
import { Products } from './Products';
import { Customers } from './Customers';
import { Analytics } from './Analytics';
import { Settings } from './Settings';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/cn';
import { Bell, Store, CreditCard, Tag } from 'lucide-react';

function PlaceholderSection({ title, icon, description }: { title: string; icon: React.ReactNode; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mb-4">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
      <p className="text-sm text-white/40 max-w-xs">{description}</p>
    </div>
  );
}

export function DashboardLayout() {
  const { dashboardSection, sidebarOpen } = useApp();

  const renderSection = () => {
    switch (dashboardSection) {
      case 'overview':
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
        return <PlaceholderSection title="Storefront Builder" icon={<Store size={28} />} description="Customize your store design, themes, and layout." />;
      case 'payments':
        return <PlaceholderSection title="Payments" icon={<CreditCard size={28} />} description="Manage payment methods, gateways, and transaction history." />;
      case 'discounts':
        return <PlaceholderSection title="Discounts & Coupons" icon={<Tag size={28} />} description="Create and manage promotional codes and discount campaigns." />;
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
