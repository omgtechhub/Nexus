import { 
  LayoutDashboard, ShoppingBag, Users, Package, 
  BarChart3, Settings, Bell, Zap, Store,
  CreditCard, Tag, ChevronLeft, ChevronRight,
  HelpCircle, LogOut, Shield
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
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
      { icon: <Shield size={18} />, label: 'Admin Panel', id: 'admin' },
    ],
  },
];

export function Sidebar() {
  const { dashboardSection, navigate, user, logout, sidebarOpen, setSidebarOpen, unreadCount, currentView } = useApp();

  const handleNavClick = (id: string) => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    if (id === 'admin') {
      navigate('admin');
    } else {
      navigate('dashboard', id);
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
        'dashboard-sidebar fixed top-0 left-0 h-full z-50 md:z-20 flex flex-col transition-all duration-300 bg-[#0D0F1F]',
        sidebarOpen 
          ? 'w-64 md:w-56 translate-x-0' 
          : '-translate-x-full md:translate-x-0 md:w-16'
      )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-900/40">
          <Zap size={16} className="text-white" fill="currentColor" />
        </div>
        {sidebarOpen && (
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-white truncate block">Nexus</span>
            <span className="text-xs text-white/30 truncate block">Commerce</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
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
              const isActive = currentView === 'admin' 
                ? item.id === 'admin'
                : currentView === 'dashboard' && dashboardSection === item.id;
              const badgeCount = item.id === 'notifications' ? unreadCount : parseInt(item.badge || '0');

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={!sidebarOpen ? item.label : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all relative group',
                    isActive
                      ? 'text-[#FFBD2E] bg-[#FFBD2E]/10 font-semibold'
                      : 'text-white/40 hover:text-white/80 hover:bg-white/5',
                    !sidebarOpen && 'justify-center px-0'
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] rounded-r-full" />
                  )}
                  <div className="relative flex-shrink-0">
                    {item.icon}
                    {badgeCount > 0 && !sidebarOpen && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FF5F56] rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                        {badgeCount}
                      </div>
                    )}
                  </div>
                  {sidebarOpen && (
                    <>
                      <span className="text-sm flex-1">{item.label}</span>
                      {badgeCount > 0 && (
                        <span className="text-[10px] font-bold bg-[#FF5F56] text-white w-4 h-4 rounded-full flex items-center justify-center">
                          {badgeCount}
                        </span>
                      )}
                    </>
                  )}
                  {/* Tooltip for collapsed sidebar */}
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/5 p-3 space-y-1">
        {/* User profile */}
        <button
          onClick={() => navigate('dashboard', 'settings')}
          className={cn(
            'w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors',
            !sidebarOpen && 'justify-center'
          )}
        >
          <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden flex-shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.charAt(0)}
              </div>
            )}
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-white/30 truncate">{user?.email}</p>
            </div>
          )}
        </button>

        <div className={cn('flex gap-1', !sidebarOpen && 'flex-col items-center')}>
          <button
            className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
            title="Help"
          >
            <HelpCircle size={15} />
            {sidebarOpen && <span className="text-xs">Help</span>}
          </button>
          <button
            onClick={logout}
            className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Sign out"
          >
            <LogOut size={15} />
            {sidebarOpen && <span className="text-xs">Sign out</span>}
          </button>
        </div>

        {/* Toggle collapse */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-center p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors"
        >
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>
    </aside>
  </>
  );
}
