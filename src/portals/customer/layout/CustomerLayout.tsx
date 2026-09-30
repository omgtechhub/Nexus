import React, { useState, useEffect } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, User, Package, MapPin, LogOut, Store, Menu, X, Truck } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { cn } from '../../../utils/cn';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/account/dashboard', icon: ShoppingBag },
  { label: 'Orders', path: '/account/orders', icon: Package },
  { label: 'Addresses', path: '/account/addresses', icon: MapPin },
  { label: 'Profile', path: '/account/profile', icon: User },
];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27C93F] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D1B]';

export function CustomerLayout({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigating within the portal should dismiss the drawer.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    const onResize = () => setMenuOpen(false);
    window.addEventListener('keydown', onEscape);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onEscape);
      window.removeEventListener('resize', onResize);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/account/login');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
      focusRing,
      isActive ? 'bg-white/10 font-semibold text-white' : 'text-secondary hover:bg-white/5 hover:text-white'
    );

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#0B0D1B] text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#27C93F] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        Skip to content
      </a>

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
          scrolled || menuOpen
            ? 'border-b border-[#222642] bg-[#0B0D1B]/95 backdrop-blur-xl'
            : 'border-b border-white/10 bg-[#0B0D1B]/60 backdrop-blur-md'
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <Link to="/account/dashboard" className={cn('flex flex-shrink-0 items-center gap-2 rounded', focusRing)}>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] text-sm font-bold text-black">
                N
              </span>
              <span className="text-lg font-bold text-white">
                Nexus
                <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-normal text-muted">
                  Account
                </span>
              </span>
            </Link>

            <nav aria-label="Account" className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
                <NavLink key={path} to={path} end={path === '/account/orders'} className={navClass}>
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/storefront"
              className={cn(
                'hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-body transition-colors hover:bg-white/10 hover:text-white sm:flex',
                focusRing
              )}
            >
              <Store size={14} aria-hidden="true" />
              Browse storefront
            </Link>

            {user && (
              <div className="hidden items-center gap-3 border-l border-white/10 pl-3 md:flex">
                <div className="text-right">
                  <div className="text-sm font-medium text-white">{user.name}</div>
                  <div className="text-xs text-muted">{user.email}</div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Sign out"
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-secondary transition-colors hover:bg-[#FF5F56]/20 hover:text-[#FF5F56]',
                    focusRing
                  )}
                >
                  <LogOut size={16} aria-hidden="true" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen(open => !open)}
              aria-expanded={menuOpen}
              aria-controls="account-mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className={cn(
                '-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-body transition-colors hover:bg-white/5 hover:text-white md:hidden',
                focusRing
              )}
            >
              {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="account-mobile-nav" className="border-t border-[#222642] bg-[#0B0D1B] md:hidden">
            <nav aria-label="Account" className="space-y-1 px-4 py-4 sm:px-6">
              {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/account/orders'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors',
                      focusRing,
                      isActive ? 'bg-white/5 text-white' : 'text-body hover:bg-white/5 hover:text-white'
                    )
                  }
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}

              <Link
                to="/track"
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-body transition-colors hover:bg-white/5 hover:text-white',
                  focusRing
                )}
              >
                <Truck size={18} aria-hidden="true" />
                Track an order
              </Link>

              <div className="space-y-2 border-t border-white/10 pt-4">
                {user && (
                  <p className="px-3 text-xs text-muted">
                    Signed in as <span className="text-body">{user.email}</span>
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className={cn(
                    'w-full rounded-lg border border-white/15 px-3 py-3 text-center text-base font-medium text-white',
                    focusRing
                  )}
                >
                  Sign out
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8 pt-24 sm:px-6">
        {children || <Outlet />}
      </main>

      <footer className="border-t border-white/10 bg-[#0B0D1B] py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-muted sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Nexus Commerce, Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/track" className={cn('rounded transition-colors hover:text-white', focusRing)}>Track an order</Link>
            <Link to="/privacy" className={cn('rounded transition-colors hover:text-white', focusRing)}>Privacy</Link>
            <Link to="/terms" className={cn('rounded transition-colors hover:text-white', focusRing)}>Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
