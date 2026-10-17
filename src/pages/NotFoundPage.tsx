import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

/**
 * A real 404.
 *
 * The catch-all route used to `<Navigate to="/" replace />`, so every unknown
 * URL silently became the homepage. Three things were wrong with that:
 *
 *  - A mistyped or truncated link looked like it had worked. The visitor saw
 *    the marketing page and concluded that was where the link went, rather
 *    than that they had the wrong address.
 *  - `replace` rewrote history, so Back did not return them to wherever the
 *    bad link came from.
 *  - A crawler following a stale link got a 200 and the homepage's content at
 *    a URL that does not exist, which is the classic soft-404 that gets a site
 *    penalised for duplicate content.
 *
 * The page cannot set a real HTTP 404 — this is a client-rendered SPA and the
 * server has already answered 200 with the shell — but `noindex` tells a
 * crawler not to keep it, which is the part that matters.
 */
export function NotFoundPage() {
  const { pathname } = useLocation();
  const { isAuthenticated, accountType } = useApp();

  /** Where "go back to familiar ground" should lead for this visitor. */
  const home =
    isAuthenticated && accountType === 'SELLER'
      ? { to: '/seller/dashboard', label: 'Go to your dashboard' }
      : isAuthenticated && accountType === 'CUSTOMER'
        ? { to: '/account/dashboard', label: 'Go to your account' }
        : isAuthenticated && accountType === 'ADMIN'
          ? { to: '/admin/dashboard', label: 'Go to the console' }
          : { to: '/', label: 'Go to the homepage' };

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[var(--surface-base)] px-6 py-20">
      <div className="w-full max-w-lg text-center">
        <p className="font-mono text-sm font-bold tracking-widest text-[var(--brand-yellow-ink)]">
          404
        </p>

        <h1 className="mt-3 text-2xl font-bold text-primary sm:text-3xl">
          We could not find that page
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-secondary">
          Nothing lives at{' '}
          {/* The address itself, because "page not found" without it leaves
              the visitor unable to tell a typo from a dead link. */}
          <code className="rounded bg-[var(--ink)]/5 px-1.5 py-0.5 font-mono text-xs text-body">
            {pathname}
          </code>
          . It may have moved, or the link may be incomplete.
        </p>

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            to="/products"
            className="rounded-xl bg-[#FFBD2E] px-5 py-2.5 text-sm font-semibold text-[#0B0D1B] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]"
          >
            Browse the shop
          </Link>
          <Link
            to={home.to}
            className="rounded-xl bg-[var(--ink)]/5 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-[var(--ink)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]"
          >
            {home.label}
          </Link>
        </div>

        <p className="mt-8 text-xs text-muted">
          Looking for an order?{' '}
          <Link
            to="/track"
            className="rounded font-semibold text-body underline underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
          >
            Track it with your order number
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
