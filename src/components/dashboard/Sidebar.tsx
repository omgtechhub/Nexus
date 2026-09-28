import { 
  LayoutDashboard, ShoppingBag, Users, Package, 
  BarChart3, Settings, Bell, Zap, Store,
  CreditCard, Tag, ChevronLeft, ChevronRight,
  HelpCircle, LogOut
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

const navSections = [
  {
    label: 'Main',
    items: [
      { icon: <LayoutDashboard size={18} />, label: 'Overview', id: 'overview' },
      { icon: <BarChart3 size={18} />, label: 'Analytics', id: 'analytics' },
      { icon: <ShoppingBag size={18} />, label: 'Orders', id: 'orders', badge: '12' },
      { icon: <Package size={18} />, label: 'Products', id: 'products' },
      { icon: <Users size={18} />, label: 'Customers', id: 'customers' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { icon: <Store size={18} />, label: 'Storefront', id: 'storefront' },
      { icon: <CreditCard size={18} />, label: 'Payments', id: 'payments' },
      { icon: <Tag size={18} />, label: 'Discounts', id: 'discounts' },
    ],
  },
  {
    label: 'Account',
    items: [
      { icon: <Bell size={18} />, label: 'Notifications', id: 'notifications', badge: '2' },
      { icon: <Settings size={18} />, label: 'Settings', id: 'settings' },
    ],
  },
];

export function Sidebar() {
  const { dashboardSection, setDashboardSection, user, logout, sidebarOpen, setSidebarOpen, unreadCount } = useApp();

  const handleNavClick = (id: string) => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    const target = id === 'overview' ? 'dashboard' : id;
    setDashboardSection(target);
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
        'dashboard-sidebar fixed top-0 left-0 h-full z-50 md:z-30 flex flex-col transition-all duration-300 bg-[#0D0F1F]',
        sidebarOpen 
          ? 'w-64 md:w-56 translate-x-0' 
          : '-translate-x-full md:translate-x-0 md:w-16'
      )}>
      {/* Logo */}
      <Link 
        to="/seller/dashboard"
        onClick={() => handleNavClick('overview')}
        className="w-full flex items-center gap-3 px-4 h-16 border-b border-white/5 text-left hover:bg-white/5 transition-colors cursor-pointer relative z-10"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-900/40">
          <Zap size={16} className="text-white" fill="currentColor" />
        </div>
        {sidebarOpen && (
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-white truncate block">Nexus</span>
            <span className="text-xs text-white/30 truncate block">Seller Portal</span>
          </div>
        )}
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide relative z-10">
        {navSections.map(section => (
          <div key={section.label} className="mb-4">
            {sidebarOpen && (
              <div className="px-4 mb-2">
                <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">
                  {section.label}
                </span>
              </div>
            )}
            {section.items.map(item => {
              const isActive = dashboardSection === item.id || (item.id === 'overview' && (dashboardSection === 'dashboard' || !dashboardSection));
              const badgeCount = item.id === 'notifications' ? unreadCount : parseInt(item.badge || '0');
              const targetPath = item.id === 'overview' ? '/seller/dashboard' : `/seller/${item.id}`;

              return (
                <Link
                  key={item.id}
                  to={targetPath}
                  onClick={() => handleNavClick(item.id)}
                  title={!sidebarOpen ? item.label : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all relative group cursor-pointer pointer-events-auto',
                    isActive
                      ? 'text-[#FFBD2E] bg-[#FFBD2E]/10 font-semibold'
                      : 'text-white/40 hover:text-white/80 hover:bg-white/5',
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
                    <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
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
      <div className="border-t border-white/5 p-3 space-y-1 relative z-10">
        {/* User profile */}
        <Link
          to="/seller/settings"
          onClick={() => handleNavClick('settings')}
          className={cn(
            'w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer',
            !sidebarOpen && 'justify-center'
          )}
        >
          <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden flex-shrink-0 pointer-events-none">
            {user?.avatar ? (
              <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0 text-left pointer-events-none">
              <p className="text-xs font-medium text-white truncate">{user?.name || 'Seller User'}</p>
              <p className="text-[10px] text-white/30 truncate">{user?.email || 'seller@nexus.io'}</p>
            </div>
          )}
        </Link>

        <div className={cn('flex gap-1', !sidebarOpen && 'flex-col items-center')}>
          <Link
            to="/seller/settings"
            onClick={() => handleNavClick('settings')}
            className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer"
            title="Help"
          >
            <HelpCircle size={15} className="pointer-events-none" />
            {sidebarOpen && <span className="text-xs pointer-events-none">Help</span>}
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut size={15} className="pointer-events-none" />
            {sidebarOpen && <span className="text-xs pointer-events-none">Sign out</span>}
          </button>
        </div>

        {/* Toggle collapse */}
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-center p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors cursor-pointer"
        >
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>
    </aside>
  </>
  );
}
