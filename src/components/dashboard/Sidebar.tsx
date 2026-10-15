import {
  LayoutDashboard, ShoppingBag, Users, Package,
  BarChart3, Settings, Bell, Zap,
  CreditCard, ChevronLeft, ChevronRight,
  HelpCircle, LogOut, Boxes, Truck, Sparkles, Star
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

/**
 * Seller navigation.
 *
 * Grouped by the job a seller came to do rather than by our module names:
 * see how the business is doing, keep the catalogue right, move the orders
 * out, handle the money. Nexus IQ sits in Main because it is the reason a
 * seller opens the dashboard between orders.
 *
 * Nexus is a marketplace, not a store builder, so there is no theme editor,
 * no discount-code manager and no shipping-zone configuration here — the
 * platform owns the shopfront, the checkout and the delivery rules.
 */
const navSections = [
  {
    label: 'Main',
    items: [
      { icon: <LayoutDashboard size={18} />, label: 'Overview', id: 'overview' },
      { icon: <BarChart3 size={18} />, label: 'Analytics', id: 'analytics' },
      { icon: <Sparkles size={18} />, label: 'Nexus IQ', id: 'nexus-iq' },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { icon: <Package size={18} />, label: 'Products', id: 'products' },
      { icon: <Star size={18} />, label: 'Reviews', id: 'reviews' },
      { icon: <Boxes size={18} />, label: 'Inventory', id: 'inventory' },
    ],
  },
  {
    label: 'Orders',
    items: [
      { icon: <ShoppingBag size={18} />, label: 'Orders', id: 'orders', badge: '12' },
      { icon: <Truck size={18} />, label: 'Shipments', id: 'shipments' },
      { icon: <Users size={18} />, label: 'Customers', id: 'customers' },
    ],
  },
  {
    label: 'Account',
    items: [
      { icon: <CreditCard size={18} />, label: 'Payments', id: 'payments' },
      { icon: <Bell size={18} />, label: 'Notifications', id: 'notifications', badge: '2' },
      { icon: <Settings size={18} />, label: 'Settings', id: 'settings' },
    ],
  },
];

export function Sidebar() {
  const { dashboardSection, user, logout, sidebarOpen, setSidebarOpen, unreadCount } = useApp();

  // The <Link> performs the navigation; this only collapses the mobile drawer.
  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        'dashboard-sidebar fixed top-0 left-0 h-full z-50 md:z-30 flex flex-col transition-colors duration-300 bg-[var(--surface-2)]',
        sidebarOpen 
          ? 'w-64 md:w-56 translate-x-0' 
          : '-translate-x-full md:translate-x-0 md:w-16'
      )}>
      {/* Logo */}
      {/* Home, not the seller dashboard: pointing it at the dashboard made it
          inert on the dashboard itself. "Overview" in the nav below is the way
          back to the dashboard. */}
      <Link
        to="/"
        aria-label="Nexus home"
        onClick={handleNavClick}
        className="w-full flex items-center gap-3 px-4 h-16 border-b border-[var(--ink)]/5 text-left hover:bg-[var(--ink)]/5 transition-colors cursor-pointer relative z-10"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-900/40">
          <Zap size={16} className="text-white" fill="currentColor" />
        </div>
        {sidebarOpen && (
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-primary truncate block">Nexus</span>
            <span className="text-xs text-muted truncate block">Seller Portal</span>
          </div>
        )}
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide relative z-10">
        {navSections.map(section => (
          <div key={section.label} className="mb-4">
            {sidebarOpen && (
              <div className="px-4 mb-2">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-widest">
                  {section.label}
                </span>
              </div>
            )}
            {section.items.map(item => {
              const isActive = dashboardSection === item.id;
              const badgeCount = item.id === 'notifications' ? unreadCount : parseInt(item.badge || '0');
              const targetPath = item.id === 'overview' ? '/seller/dashboard' : `/seller/${item.id}`;

              return (
                <Link
                  key={item.id}
                  to={targetPath}
                  onClick={handleNavClick}
                  title={!sidebarOpen ? item.label : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors relative group cursor-pointer pointer-events-auto',
                    isActive
                      ? 'text-[var(--brand-yellow-ink)] bg-[#FFBD2E]/10 font-semibold'
                      : 'text-muted hover:text-primary hover:bg-[var(--ink)]/5',
                    !sidebarOpen && 'justify-center px-0'
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] rounded-r-full" />
                  )}
                  <div className="relative flex-shrink-0 pointer-events-none">
                    {item.icon}
                    {badgeCount > 0 && !sidebarOpen && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FF5F56] rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                        {badgeCount}
                      </div>
                    )}
                  </div>
                  <span className={cn('text-sm flex-1 pointer-events-none', !sidebarOpen && 'sr-only')}>
                    {item.label}
                  </span>
                  {badgeCount > 0 && (
                    <span className={cn('text-[10px] font-bold bg-[#FF5F56] text-white w-4 h-4 rounded-full flex items-center justify-center pointer-events-none', !sidebarOpen && 'hidden')}>
                      {badgeCount}
                    </span>
                  )}
                  {/* Tooltip for collapsed sidebar */}
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-[var(--surface-inverse)] border border-[var(--ink)]/10 rounded-lg text-xs text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[var(--ink)]/5 p-3 space-y-1 relative z-10">
        {/* User profile */}
        <Link
          to="/seller/settings"
          onClick={handleNavClick}
          className={cn(
            'w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--ink)]/5 transition-colors cursor-pointer',
            !sidebarOpen && 'justify-center'
          )}
        >
          <div className="w-8 h-8 rounded-full border border-[var(--ink)]/10 overflow-hidden flex-shrink-0 pointer-events-none">
            {user?.avatar ? (
              <img loading="lazy" decoding="async" src={user.avatar} alt={user?.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0 text-left pointer-events-none">
              <p className="text-xs font-medium text-primary truncate">{user?.name || 'Seller User'}</p>
              <p className="text-[10px] text-muted truncate">{user?.email || 'seller@nexus.io'}</p>
            </div>
          )}
        </Link>

        <div className={cn('flex gap-1', !sidebarOpen && 'flex-col items-center')}>
          {/* The help centre, not Settings: a merchant clicking Help has a
              question, and their own API keys answer none of them. */}
          <Link
            to="/seller/help"
            onClick={handleNavClick}
            aria-current={dashboardSection === 'help' ? 'page' : undefined}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 p-2 rounded-lg transition-colors cursor-pointer',
              dashboardSection === 'help'
                ? 'text-[var(--brand-yellow-ink)] bg-[#FFBD2E]/10 font-semibold'
                : 'text-muted hover:text-strong hover:bg-[var(--ink)]/5'
            )}
            title="Help"
          >
            <HelpCircle size={15} className="pointer-events-none" />
            {sidebarOpen && <span className="text-xs pointer-events-none">Help</span>}
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut size={15} className="pointer-events-none" />
            {sidebarOpen && <span className="text-xs pointer-events-none">Sign out</span>}
          </button>
        </div>

        {/* Toggle collapse */}
        <button aria-label="Previous"
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-center p-1.5 rounded-lg text-muted hover:text-body hover:bg-[var(--ink)]/5 transition-colors cursor-pointer"
        >
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>
    </aside>
  </>
  );
}
