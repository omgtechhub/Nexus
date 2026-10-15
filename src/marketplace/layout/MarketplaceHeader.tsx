import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, Search, ShoppingBag, User, X, Zap } from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { useApp } from '../../context/AppContext';
import { useCart } from '../../context/CartContext';
import { useMarketplaceCategoriesQuery } from '../../hooks/useMarketplace';
import { cn } from '../../utils/cn';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]';

/**
 * The shopper's header.
 *
 * Deliberately absent: any link into the platform admin console, and any
 * seller dashboard navigation. Administrators reach their portal by its own
 * URL, and a merchant signed in on this device still sees the shop here —
 * the storefront is the same page for everyone.
 */
export function MarketplaceHeader() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isCustomer, accountType } = useApp();
  const { itemCount } = useCart();
  const categoriesQuery = useMarketplaceCategoriesQuery();

  const [term, setTerm] = useState(searchParams.get('q') || '');
  const [menuOpen, setMenuOpen] = useState(false);
  const firstMenuLink = useRef<HTMLAnchorElement>(null);

  // Keep the field in step with the URL, so a back navigation or a category
  // link that clears `q` does not leave a stale term in the box.
  useEffect(() => {
    setTerm(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onEscape);
    firstMenuLink.current?.focus();
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onEscape);
    };
  }, [menuOpen]);

  const categories = categoriesQuery.data?.categories ?? [];

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/products/browse?q=${encodeURIComponent(q)}` : '/products/browse');
    setMenuOpen(false);
  };

  // A signed-in merchant or admin is still a visitor here; only a customer
  // account has a shopper account area to link to.
  const accountLink = isCustomer
    ? { to: '/account/dashboard', label: 'Your account' }
    : accountType === 'SELLER'
      ? { to: '/seller/dashboard', label: 'Your dashboard' }
      : accountType === 'ADMIN'
        ? { to: '/admin/dashboard', label: 'Your console' }
        : null;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ink)]/10 bg-[var(--surface-base)]/95 backdrop-blur-xl">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#FFBD2E] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        Skip to content
      </a>

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setMenuOpen(o => !o)}
          aria-expanded={menuOpen}
          aria-controls="marketplace-browse"
          aria-label={menuOpen ? 'Close category menu' : 'Open category menu'}
          className={cn('-ml-1 rounded-lg p-2 text-body hover:bg-[var(--ink)]/10 hover:text-primary lg:hidden', focusRing)}
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>

        {/* Home. A logo that goes anywhere else is a broken affordance —
            every site puts the front page behind it. The shop's own front page
            is the "Shop" entry in the category row below. */}
        <Link to="/" aria-label="Nexus home" className={cn('flex flex-shrink-0 items-center gap-2.5 rounded-lg', focusRing)}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] shadow-lg shadow-red-900/40">
            <Zap size={16} className="text-white" fill="currentColor" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight text-primary">Nexus</span>
        </Link>

        <form role="search" onSubmit={submitSearch} className="ml-1 hidden flex-1 sm:flex">
          <div className="relative w-full max-w-xl">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder="Search every product on Nexus"
              aria-label="Search products"
              className={cn(
                'h-10 w-full rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 pl-10 pr-3 text-sm text-primary',
                'placeholder:text-muted hover:border-[var(--ink)]/20 focus:border-[#FFBD2E] focus:outline-none'
              )}
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {isAuthenticated && accountLink ? (
            <Link
              to={accountLink.to}
              className={cn(
                'hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-body hover:bg-[var(--ink)]/10 hover:text-primary sm:flex',
                focusRing
              )}
            >
              <User size={16} aria-hidden="true" />
              {accountLink.label}
            </Link>
          ) : (
            <>
              <Link
                to="/account/login"
                className={cn(
                  'hidden rounded-xl px-3 py-2 text-sm font-medium text-body hover:bg-[var(--ink)]/10 hover:text-primary sm:block',
                  focusRing
                )}
              >
                Sign in
              </Link>
              <Link
                to="/account/register"
                className={cn(
                  'hidden rounded-xl border border-[var(--ink)]/15 bg-[var(--ink)]/5 px-3 py-2 text-sm font-semibold text-primary hover:border-[var(--ink)]/25 hover:bg-[var(--ink)]/10 lg:block',
                  focusRing
                )}
              >
                Create account
              </Link>
            </>
          )}

          <Link
            to="/cart"
            aria-label={itemCount > 0 ? `Your bag, ${itemCount} item${itemCount === 1 ? '' : 's'}` : 'Your bag, empty'}
            className={cn(
              'relative flex items-center gap-2 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 px-3 py-2 text-sm font-semibold text-primary hover:border-[#FFBD2E]/50 hover:bg-[#FFBD2E]/10',
              focusRing
            )}
          >
            <ShoppingBag size={16} className="text-[var(--brand-yellow-ink)]" aria-hidden="true" />
            <span className="hidden sm:inline">Bag</span>
            {itemCount > 0 && (
              <span
                data-testid="cart-badge"
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF5F56] px-1.5 text-[11px] font-extrabold text-white"
              >
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile search sits on its own row: a 16px-tall row cannot hold the
          logo, the controls and a usable field at 390px. */}
      <form role="search" onSubmit={submitSearch} className="px-4 pb-3 sm:hidden">
        <div className="relative">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={term}
            onChange={e => setTerm(e.target.value)}
            placeholder="Search products"
            aria-label="Search products"
            className="h-10 w-full rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 pl-10 pr-3 text-sm text-primary placeholder:text-muted focus:border-[#FFBD2E] focus:outline-none"
          />
        </div>
      </form>

      <nav
        id="marketplace-browse"
        aria-label="Product categories"
        className={cn(
          'border-t border-[var(--ink)]/5 bg-[var(--surface-base)]',
          menuOpen ? 'block' : 'hidden lg:block'
        )}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-2 sm:px-6 lg:flex-row lg:items-center lg:gap-1 lg:overflow-x-auto lg:px-8">
          {/* The shop's front page, since the logo now goes to the site
              home. Without this the curated shop view would be unreachable
              from inside the shop. */}
          <NavLink
            ref={firstMenuLink}
            to="/products"
            end
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex-shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                isActive ? 'bg-[var(--ink)]/10 text-primary' : 'text-body hover:bg-[var(--ink)]/5 hover:text-primary',
                focusRing
              )
            }
          >
            Shop
          </NavLink>

          <NavLink
            to="/products/browse"
            end
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex-shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                isActive ? 'bg-[var(--ink)]/10 text-primary' : 'text-body hover:bg-[var(--ink)]/5 hover:text-primary',
                focusRing
              )
            }
          >
            All products
          </NavLink>

          {categories.slice(0, 8).map(category => (
            <Link
              key={category.name}
              to={`/products/browse?category=${encodeURIComponent(category.name)}`}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'flex-shrink-0 rounded-lg px-3 py-2 text-sm text-body transition-colors hover:bg-[var(--ink)]/5 hover:text-primary',
                focusRing
              )}
            >
              {category.name}
              <span className="ml-1.5 text-xs text-decorative">{category.productCount}</span>
            </Link>
          ))}

          {/* Discreet, and the last thing in the row: this is a shop, not a
              pitch for merchants. */}
          <Link
            to="/seller/register"
            onClick={() => setMenuOpen(false)}
            className={cn(
              'mt-1 flex-shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-primary lg:ml-auto lg:mt-0',
              focusRing
            )}
          >
            Sell on Nexus
          </Link>
        </div>
      </nav>
    </header>
  );
}
