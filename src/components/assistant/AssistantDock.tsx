import { Suspense, lazy, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, Sparkles, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';
import { cn } from '../../utils/cn';
import { focusRing } from '../voice/VoiceShared';
import { WhatsAppLauncher } from './WhatsAppLauncher';
import { LAUNCHER_SIZE, panelShell } from './dockShell';

/**
 * The floating support dock: Nexus IQ above, WhatsApp below.
 *
 * One dock for the whole product rather than one per portal. A shopper and a
 * merchant want the same two things in the same corner — an assistant that
 * knows their side of the business, and a human on WhatsApp — and the only
 * thing that differs between them is which assistant opens.
 *
 * The order is not arbitrary. WhatsApp sits on the bottom because it is the
 * fixed, always-available escape hatch: it is in the same place on every page
 * for every visitor, signed in or not, so it can be found without looking.
 * Nexus IQ stacks above it and is the one that varies.
 *
 * All three panels are lazily loaded. Between them they pull in the voice
 * capture stack, the enrolment wizard and the cart, and none of that belongs
 * in the bundle a first-time visitor downloads to read the marketing page.
 */

const PublicAssistantPanel = lazy(() =>
  import('./PublicAssistant').then(m => ({ default: m.PublicAssistantPanel }))
);
const ShopperAssistantPanel = lazy(() =>
  import('./ShopperAssistant').then(m => ({ default: m.ShopperAssistantPanel }))
);
const SellerAssistantPanel = lazy(() =>
  import('./SellerAssistant').then(m => ({ default: m.SellerAssistantPanel }))
);

/**
 * Where the dock stays out of the way.
 *
 * Checkout and the auth screens are single-task pages: a floating assistant
 * over a payment form is a distraction at the exact moment distraction is most
 * expensive, and the platform console is not an audience for either channel.
 */
function suppressedOn(pathname: string): boolean {
  return (
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/forgot-password') ||
    /^\/(seller|account)\/(login|signup|register)/.test(pathname)
  );
}

/**
 * Pages where Nexus IQ needs to know who it is talking to.
 *
 * The split is about what an answer is *about*, not about how much of the site
 * we would like to put behind a login. On the public pages — the landing page,
 * pricing, contact, the legal pages, order tracking — every question is about
 * Nexus itself, so anyone may ask one, by typing or out loud in any voice.
 *
 * On the pages listed here an answer is about somebody's own bag, orders,
 * stock or revenue. Those need an account, and a spoken command on them is
 * answered only when it matches the voice registered to that account — so
 * nobody else within earshot can order on it or read a merchant's figures.
 * Being signed in is what protects the data; the voice is what stops the
 * assistant acting for the wrong person at an unlocked screen.
 *
 * Default-open rather than default-closed is deliberate and safe: the public
 * assistant reads the published plans and the public catalogue and nothing
 * else, so a page nobody thought to list here leaks nothing. The gated set is
 * therefore the one spelled out.
 */
const ACCOUNT_SCOPED = [
  '/products',
  '/cart',
  '/checkout',
  '/storefront',
  '/account',
  '/customer-portal',
  '/seller',
  '/dashboard',
];

function needsAccount(pathname: string): boolean {
  return ACCOUNT_SCOPED.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}

export function AssistantDock() {
  const { isAuthenticated, isSeller, isAdmin } = useApp();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useDismissOnEscape(open, () => setOpen(false));

  if (suppressedOn(pathname)) return null;

  const onAccountPage = needsAccount(pathname);

  /*
   * A platform administrator holds neither a shopper's bag nor a merchant's
   * store, so the two account assistants have nothing to point at — the
   * shopping one would call customer-only endpoints against an admin session
   * and get a 403 back.
   *
   * That used to be handled by hiding the launcher outright, which is why an
   * administrator reading the landing page saw the WhatsApp button with an
   * empty space above it where Nexus IQ should be. The public assistant is the
   * right answer: it reads the published plans and the public catalogue and
   * touches no account at all, so it is exactly as safe for an administrator
   * as for an anonymous visitor, and it answers the questions a public page
   * raises.
   *
   * The launcher still goes away on the account-scoped pages, where an
   * administrator genuinely has nothing to ask it.
   */
  const showIq = !isAdmin || !onAccountPage;

  // A signed-out visitor gets the open assistant on a public page and the
  // sign-in wall on an account page. Signing in changes nothing about which
  // pages are which — it only decides which assistant opens.
  const panel = isAdmin ? (
    <PublicAssistantPanel onClose={() => setOpen(false)} />
  ) : isAuthenticated ? (
    isSeller ? (
      <SellerAssistantPanel onClose={() => setOpen(false)} />
    ) : (
      <ShopperAssistantPanel onClose={() => setOpen(false)} />
    )
  ) : onAccountPage ? (
    <SignInPrompt onClose={() => setOpen(false)} />
  ) : (
    <PublicAssistantPanel onClose={() => setOpen(false)} />
  );

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 print:hidden">
      {open && <Suspense fallback={<PanelLoading />}>{panel}</Suspense>}

      {showIq && (
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          aria-expanded={open}
          aria-label={open ? 'Close Nexus IQ' : 'Open Nexus IQ'}
          className={cn(
            'inline-flex items-center justify-center rounded-full',
            'bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]',
            'shadow-lg shadow-[#FFBD2E]/20 transition-transform duration-200',
            'hover:scale-105 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100',
            LAUNCHER_SIZE,
            focusRing
          )}
        >
          {open ? (
            <X size={22} className="text-slate-950" aria-hidden="true" />
          ) : (
            <Sparkles size={22} className="text-slate-950" aria-hidden="true" />
          )}
        </button>
      )}

      <WhatsAppLauncher />
    </div>
  );
}

/**
 * Same shell, same corner, while the panel's chunk arrives — so opening the
 * dock does not shift the launchers underneath it.
 */
function PanelLoading() {
  return (
    <div className={cn(panelShell, 'h-64 items-center justify-center')} aria-busy="true">
      <Loader2 size={18} className="animate-spin text-muted" aria-hidden="true" />
      <span className="sr-only">Loading Nexus IQ</span>
    </div>
  );
}

const publicPageLink = cn(
  'rounded font-semibold text-primary underline underline-offset-2 hover:text-[var(--brand-yellow-ink)]',
  focusRing
);

/**
 * What a signed-out visitor gets on an account page.
 *
 * Here Nexus IQ would be answering about a specific bag, a specific order or a
 * specific merchant's figures, so there is nothing honest it can say to
 * someone it cannot identify — and a spoken command on these pages is matched
 * against the voice registered to the account, which is worth explaining
 * rather than leaving as a surprise. Saying so and offering the two doors
 * beats a launcher that opens an apology, and WhatsApp is still right below,
 * which is the point of keeping it there.
 */
function SignInPrompt({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="Nexus IQ"
      className={cn(panelShell, 'max-h-none w-[min(20rem,calc(100vw-2.5rem))] p-5')}
    >
      <h2 className="flex items-center gap-2 text-sm font-bold text-primary">
        <Sparkles size={15} className="text-[var(--brand-yellow-ink)]" aria-hidden="true" />
        Nexus IQ
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-secondary">
        Sign in and Nexus IQ can search the catalogue, fill your bag and take you to checkout — by
        typing or out loud. Merchants get the same assistant pointed at their own stock, orders and
        revenue.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        On these pages it answers spoken commands only in the voice registered to your account, so
        nobody else nearby can order on it or read your figures.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/account/login"
          onClick={onClose}
          className={cn(
            'inline-flex h-9 items-center rounded-xl bg-[#FFBD2E] px-3.5 text-xs font-bold text-slate-950',
            'transition-opacity hover:opacity-90',
            focusRing
          )}
        >
          Sign in to shop
        </Link>
        <Link
          to="/seller/login"
          onClick={onClose}
          className={cn(
            'inline-flex h-9 items-center rounded-xl bg-[var(--ink)]/10 px-3.5 text-xs font-bold text-primary',
            'transition-colors hover:bg-[var(--ink)]/15',
            focusRing
          )}
        >
          Merchant sign in
        </Link>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Only have a question about Nexus itself? Ask it on the{' '}
        <Link to="/" onClick={onClose} className={publicPageLink}>
          home
        </Link>
        ,{' '}
        <Link to="/pricing" onClick={onClose} className={publicPageLink}>
          pricing
        </Link>{' '}
        or{' '}
        <Link to="/contact" onClick={onClose} className={publicPageLink}>
          contact
        </Link>{' '}
        page, where no account is needed. Or use the WhatsApp button below to reach a person.
      </p>
    </div>
  );
}
