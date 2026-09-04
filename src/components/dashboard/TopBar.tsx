import { Bell, Search, Plus, Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/cn';

const sectionTitles: Record<string, string> = {
  overview: 'Dashboard Overview',
  analytics: 'Analytics & Reports',
  orders: 'Orders',
  products: 'Products',
  customers: 'Customers',
  storefront: 'Storefront',
  payments: 'Payments',
  discounts: 'Discounts & Coupons',
  notifications: 'Notifications',
  settings: 'Account Settings',
};

export function TopBar() {
  const {
    user, dashboardSection, sidebarOpen,
    unreadCount, setNotificationPanelOpen, notificationPanelOpen,
    setSidebarOpen
  } = useApp();

  const title = sectionTitles[dashboardSection] || 'Dashboard';

  return (
    <header className={cn(
      'fixed top-0 right-0 left-0 h-16 bg-[#0D0F1F] border-b border-[#1E2238] z-10 flex items-center justify-between px-4 gap-4 transition-all duration-300',
      sidebarOpen ? 'md:left-56' : 'md:left-16'
    )}>
      <div className="flex items-center gap-3">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-base font-semibold text-white">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 h-9 px-3 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:border-white/20 transition-colors cursor-pointer min-w-[180px]">
          <Search size={14} />
          <span className="text-sm">Search everything...</span>
          <span className="ml-auto text-xs bg-white/10 px-1.5 py-0.5 rounded">⌘K</span>
        </div>

        {/* Add button */}
        <button className="flex items-center gap-1.5 h-9 px-3 bg-gradient-to-r from-[#FF5F56] to-[#FFBD2E] hover:brightness-110 text-white text-sm font-semibold rounded-lg transition-all shadow-md shadow-red-900/30">
          <Plus size={15} />
          <span className="hidden sm:inline">Add</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
            className="relative w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-all"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF5F56] border-2 border-[#0D0F1F] rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Avatar */}
        <button className="w-9 h-9 rounded-full border-2 border-white/10 hover:border-[#FFBD2E]/60 transition-colors overflow-hidden flex-shrink-0">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0)}
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
