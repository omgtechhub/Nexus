import { useState, useEffect } from 'react';
import { Bell, Search, Plus, Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/cn';
import { QuickAddModal } from './QuickAddModal';
import { SearchCommandPalette } from './SearchCommandPalette';
import { ThemeToggle } from '../ui/ThemeToggle';

const sectionTitles: Record<string, string> = {
  overview: 'Dashboard Overview',
  analytics: 'Analytics & Reports',
  'nexus-iq': 'Nexus IQ',
  orders: 'Orders',
  products: 'Products',
  reviews: 'Ratings & Reviews',
  customers: 'Customers',
  payments: 'Payments & Payouts',
  inventory: 'Inventory',
  shipments: 'Shipments',
  notifications: 'Notifications',
  settings: 'Account Settings',
  help: 'Help Centre',
};

export function TopBar() {
  const {
    user, dashboardSection, sidebarOpen,
    unreadCount, setNotificationPanelOpen, notificationPanelOpen,
    setSidebarOpen, navigate
  } = useApp();

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const title = sectionTitles[dashboardSection] || 'Dashboard';

  return (
    <>
      <header className={cn(
        'fixed top-0 right-0 left-0 h-16 bg-[var(--surface-2)] border-b border-[var(--line-subtle)] z-10 flex items-center justify-between px-4 gap-4 transition-colors duration-300',
        sidebarOpen ? 'md:left-56' : 'md:left-16'
      )}>
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle */}
          <button aria-label="Open menu"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-muted hover:text-primary hover:bg-[var(--ink)]/5 transition-colors"
          >
            <Menu size={18} />
          </button>
          <h1 className="text-base font-semibold text-primary">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-2 h-9 px-3 bg-[var(--ink)]/5 border border-[var(--ink)]/10 rounded-lg text-muted hover:border-[var(--ink)]/20 transition-colors min-w-[200px]"
          >
            <Search size={14} />
            <span className="text-sm">Search everything…</span>
            <span className="ml-auto text-xs bg-[var(--ink)]/10 px-1.5 py-0.5 rounded">⌘K</span>
          </button>

          {/* Add button */}
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="flex items-center gap-1.5 h-9 px-3 bg-gradient-to-r from-[#FF5F56] to-[#FFBD2E] hover:brightness-110 text-white text-sm font-semibold rounded-lg transition-colors shadow-md shadow-red-900/30"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Add</span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button aria-label="Notifications"
              onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
              className="relative w-9 h-9 rounded-lg bg-[var(--ink)]/5 border border-[var(--ink)]/10 flex items-center justify-center text-muted hover:text-primary hover:border-[var(--ink)]/20 transition-colors"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF5F56] border-2 border-[var(--surface-2)] rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <ThemeToggle className="rounded-lg" />

          {/* Avatar */}
          <button
            onClick={() => navigate('dashboard', 'settings')}
            className="w-9 h-9 rounded-full border-2 border-[var(--ink)]/10 hover:border-[#FFBD2E]/60 transition-colors overflow-hidden flex-shrink-0"
            title="Account Settings"
          >
            {user?.avatar ? (
              <img loading="lazy" decoding="async" src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
          </button>
        </div>
      </header>

      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
      <SearchCommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
