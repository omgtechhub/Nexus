import React, { useState, useEffect } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Activity, Store, Layers, FileText, CreditCard, LogOut, Menu, X, ShieldCheck } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { cn } from '../../../utils/cn';

const NAV_ITEMS = [
  { label: 'Overview', path: '/admin/dashboard', icon: Activity },
  { label: 'Merchants', path: '/admin/merchants', icon: Store },
  { label: 'Plans', path: '/admin/plans', icon: Layers },
  { label: 'Invoices', path: '/admin/invoices', icon: FileText },
  { label: 'Transactions', path: '/admin/transactions', icon: CreditCard },
];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[#060813]';

export function AdminLayout({ children }: { children?: React.ReactNode }) {
  const { user, platformRole, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

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
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#060813] text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#FFBD2E] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-[#222642] bg-[#060813]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <Link to="/admin/dashboard" className={cn('flex flex-shrink-0 items-center gap-2 rounded', focusRing)}>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">
                <ShieldCheck size={16} className="text-slate-950" aria-hidden="true" />
              </span>
              <span className="text-lg font-bold">
                Nexus
                <span className="ml-1 rounded-full bg-[#FFBD2E]/15 px-2 py-0.5 text-xs font-medium text-[#FFBD2E]">
                  Platform
                </span>
              </span>
            </Link>

            <nav aria-label="Admin" className="hidden items-center gap-1 lg:flex">
              {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      focusRing,
                      isActive ? 'bg-white/10 font-semibold text-white' : 'text-secondary hover:bg-white/5 hover:text-white'
                    )
                  }
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden items-center gap-3 border-l border-white/10 pl-3 lg:flex">
                <div className="text-right">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-[#FFBD2E]">{platformRole?.replace('PLATFORM_', '') ?? 'ADMIN'}</div>
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
              aria-controls="admin-mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className={cn(
                '-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-body transition-colors hover:bg-white/5 hover:text-white lg:hidden',
                focusRing
              )}
            >
              {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="admin-mobile-nav" className="border-t border-[#222642] lg:hidden">
            <nav aria-label="Admin" className="space-y-1 px-4 py-4 sm:px-6">
              {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
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
              <div className="border-t border-white/10 pt-4">
                {user && (
                  <p className="px-3 pb-2 text-xs text-muted">
                    {user.email} · <span className="text-[#FFBD2E]">{platformRole?.replace('PLATFORM_', '')}</span>
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className={cn('w-full rounded-lg border border-white/15 px-3 py-3 text-center text-base font-medium', focusRing)}
                >
                  Sign out
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children || <Outlet />}
      </main>
    </div>
  );
}
