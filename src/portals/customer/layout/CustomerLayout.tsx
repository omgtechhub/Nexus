import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, User, Package, MapPin, Settings, LogOut, Store } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { cn } from '../../../utils/cn';

export function CustomerLayout({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Dashboard', path: '/account/dashboard', icon: ShoppingBag },
    { label: 'My Orders', path: '/account/orders', icon: Package },
    { label: 'Profile', path: '/account/profile', icon: User },
    { label: 'Addresses', path: '/account/addresses', icon: MapPin },
    { label: 'Settings', path: '/account/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/account/login');
  };

  return (
    <div className="min-h-screen bg-[#0B0D1B] text-white flex flex-col justify-between">
      {/* Dedicated Customer Portal Navigation Header */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-[#0B0D1B]/95 backdrop-blur-xl border-b border-[#222642] shadow-2xl'
            : 'bg-[#0B0D1B]/60 backdrop-blur-md border-b border-white/10'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/account/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] flex items-center justify-center font-bold text-black text-sm shadow-md">
                N
              </div>
              <span className="font-bold text-lg text-white">Nexus <span className="text-xs font-normal text-white/50 bg-white/10 px-2 py-0.5 rounded-full ml-1">Customer Portal</span></span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white font-semibold'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/storefront"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium border border-white/10 transition-colors"
            >
              <Store size={14} />
              Browse Storefront
            </Link>

            {user && (
              <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-white">{user.name}</div>
                  <div className="text-xs text-white/40">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg bg-white/5 hover:bg-[#FF5F56]/20 text-white/60 hover:text-[#FF5F56] border border-white/10 transition-colors"
                  title="Sign out of Customer Portal"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-16 py-8">
        {children || <Outlet />}
      </main>

      {/* Customer Footer */}
      <footer className="border-t border-white/10 py-6 bg-[#0B0D1B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <div>© {new Date().getFullYear()} Nexus Commerce Inc. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link to="/storefront" className="hover:text-white transition-colors">Storefront</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
