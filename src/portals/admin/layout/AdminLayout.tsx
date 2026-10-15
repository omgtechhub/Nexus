import React, { useState, useEffect } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Activity, Store, Layers, FileText, CreditCard, LogOut, Menu, ShieldCheck, ShieldAlert } from 'lucide-react';
import { AdminNavDrawer } from './AdminNavDrawer';
import { useApp } from '../../../context/AppContext';
import { cn } from '../../../utils/cn';
import { ThemeToggle } from '../../../components/ui/ThemeToggle';

const NAV_ITEMS = [
  { label: 'Overview', path: '/admin/dashboard', icon: Activity },
  { label: 'Merchants', path: '/admin/merchants', icon: Store },
  { label: 'Monitoring', path: '/admin/monitoring', icon: ShieldAlert },
  { label: 'Plans', path: '/admin/plans', icon: Layers },
  { label: 'Invoices', path: '/admin/invoices', icon: FileText },
  { label: 'Transactions', path: '/admin/transactions', icon: CreditCard },
];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-deep)]';

export function AdminLayout({ children }: { children?: React.ReactNode }) {
  const { user, platformRole, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  /*
   * Close the drawer once the `lg` nav takes over, and only then.
   *
   * This used to close on every `resize` event. On a tablet or phone that
   * fires when the on-screen keyboard appears and when the browser's URL bar
   * collapses on scroll, so the menu shut itself for reasons that had nothing
   * to do with the breakpoint. Escape is handled inside the drawer.
   */
  useEffect(() => {
    if (!menuOpen) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onChange = () => desktop.matches && setMenuOpen(false);
    desktop.addEventListener('change', onChange);
    return () => desktop.removeEventListener('change', onChange);
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-deep)] text-primary">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#FFBD2E] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface-deep)]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-6">
            {/* Home. These three portal logos used to point at their own
                portal's dashboard, which made them do nothing at all on the
                dashboard itself — the page a user is on most of the time. A
                brand mark goes to the site home; each portal's own overview is
                the first item in the nav beside it. */}
            <Link to="/" aria-label="Nexus home" className={cn('flex flex-shrink-0 items-center gap-2 rounded', focusRing)}>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">
                <ShieldCheck size={16} className="text-slate-950" aria-hidden="true" />
              </span>
              <span className="text-lg font-bold">
                Nexus
                <span className="ml-1 rounded-full bg-[#FFBD2E]/15 px-2 py-0.5 text-xs font-medium text-[var(--brand-yellow-ink)]">
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
                      isActive ? 'bg-[var(--ink)]/10 font-semibold text-primary' : 'text-secondary hover:bg-[var(--ink)]/5 hover:text-primary'
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
            <ThemeToggle className="rounded-lg" />

            {user && (
              <div className="hidden items-center gap-3 border-l border-[var(--ink)]/10 pl-3 lg:flex">
                <div className="text-right">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-[var(--brand-yellow-ink)]">{platformRole?.replace('PLATFORM_', '') ?? 'ADMIN'}</div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Sign out"
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ink)]/10 bg-[var(--ink)]/5 text-secondary transition-colors hover:bg-[#FF5F56]/20 hover:text-[var(--brand-red-ink)]',
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
              aria-haspopup="dialog"
              aria-label="Open menu"
              className={cn(
                '-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-body transition-colors hover:bg-[var(--ink)]/5 hover:text-primary lg:hidden',
                focusRing
              )}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

      </header>

      <AdminNavDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={NAV_ITEMS}
        user={user}
        platformRole={platformRole}
        onLogout={handleLogout}
      />

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children || <Outlet />}
      </main>
    </div>
  );
}
