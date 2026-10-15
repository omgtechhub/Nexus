import { useState, useEffect } from 'react';
import { Menu, X, Zap } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/cn';
import { ThemeToggle } from '../ui/ThemeToggle';

/**
 * Every entry here resolves to a page that exists.
 *
 * Shop first: it is the only link that leads somewhere a buyer cares about,
 * and the product catalogue lives inside it (`/products/browse`) rather than
 * as a separate top-level entry.
 */
const NAV_LINKS = [
  { label: 'Shop', to: '/products' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Contact', to: '/contact' },
];

const linkBase =
  'rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]';

interface NavbarProps {
  /**
   * Set on a page whose first section is the dark hero. While the bar is still
   * transparent it is sitting on that dark artwork, so it has to be dark too —
   * in light mode its links would otherwise be near-black on near-black. Once
   * the page scrolls the bar gets its own background and goes back to the
   * page's own theme.
   */
  overlaysDarkHero?: boolean;
}

export function Navbar({ overlaysDarkHero = false }: NavbarProps) {
  const { isAuthenticated, user, isAdmin, isCustomer } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // A drawer that survives a resize into the desktop layout traps scrolling.
  useEffect(() => {
    if (!mobileOpen) return;
    const close = () => setMobileOpen(false);
    window.addEventListener('resize', close);
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onEscape);
    };
  }, [mobileOpen]);

  const portal = isAdmin
    ? { to: '/admin/dashboard', label: 'Admin portal' }
    : isCustomer
      ? { to: '/account/dashboard', label: 'Your account' }
      : { to: '/seller/dashboard', label: 'Dashboard' };

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#FFBD2E] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        Skip to content
      </a>

      <nav
        aria-label="Main"
        data-theme={overlaysDarkHero && !scrolled && !mobileOpen ? 'dark' : undefined}
        className={cn(
          'fixed inset-x-0 top-0 z-40 transition-colors duration-300',
          scrolled || mobileOpen
            ? 'border-b border-[var(--line)] bg-[var(--surface-base)]/95 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className={cn('flex flex-shrink-0 items-center gap-2.5', linkBase, 'px-0')}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] shadow-lg shadow-red-900/40">
              <Zap size={16} className="text-white" fill="currentColor" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight text-primary">Nexus</span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(linkBase, isActive ? 'text-primary' : 'text-body hover:bg-[var(--ink)]/5 hover:text-primary')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <Link
                  to={portal.to}
                  className={cn(linkBase, 'text-body hover:bg-[var(--ink)]/5 hover:text-primary')}
                >
                  {portal.label}
                </Link>
                <Link
                  to={portal.to}
                  aria-label={`${portal.label} for ${user?.name ?? 'your account'}`}
                  className="rounded-full border border-[var(--ink)]/10 p-0.5 transition-colors hover:border-emerald-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
                >
                  <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-bold text-white">
                    {user?.avatar
                      ? <img loading="lazy" decoding="async" src={user.avatar} alt="" className="h-full w-full object-cover" />
                      : user?.name?.charAt(0)}
                  </span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/seller/login"
                  className={cn(linkBase, 'text-body hover:bg-[var(--ink)]/5 hover:text-primary')}
                >
                  Log in
                </Link>
                <Link
                  to="/seller/register"
                  className={cn(
                    linkBase,
                    'bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] font-semibold text-slate-950 hover:opacity-90'
                  )}
                >
                  Start free trial
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(open => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-body transition-colors hover:bg-[var(--ink)]/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] lg:hidden"
          >
            {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>

        {mobileOpen && (
          <div id="mobile-nav" className="border-t border-[var(--line)] bg-[var(--surface-base)] lg:hidden">
            <div className="space-y-1 px-4 py-4 sm:px-6">
              {NAV_LINKS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-lg px-3 py-3 text-base font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]',
                      isActive ? 'bg-[var(--ink)]/5 text-primary' : 'text-body hover:bg-[var(--ink)]/5 hover:text-primary'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              <div className="space-y-2 border-t border-[var(--ink)]/10 pt-4">
                <div className="flex items-center justify-between rounded-lg px-3 py-2">
                  <span className="text-base font-medium text-body">Appearance</span>
                  <ThemeToggle variant="labelled" />
                </div>
                {isAuthenticated ? (
                  <Link
                    to={portal.to}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg bg-[var(--ink)]/5 px-3 py-3 text-center text-base font-semibold text-primary"
                  >
                    {portal.label}
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/seller/login"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-lg border border-[var(--ink)]/15 px-3 py-3 text-center text-base font-medium text-primary"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/seller/register"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-lg bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] px-3 py-3 text-center text-base font-semibold text-slate-950"
                    >
                      Start free trial
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
