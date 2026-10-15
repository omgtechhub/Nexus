import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, ShieldCheck, X, type LucideIcon } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useDismissOnEscape } from '../../../hooks/useDismissOnEscape';

export interface AdminNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface AdminNavDrawerProps {
  open: boolean;
  onClose: () => void;
  items: AdminNavItem[];
  user?: { name: string; email: string } | null;
  platformRole?: string | null;
  onLogout: () => void;
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-deep)]';

/** Everything inside the panel that can take focus, in document order. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The admin navigation, as a left slide-over, below the `lg` breakpoint.
 *
 * It replaces a panel that expanded *underneath* the header. That panel put
 * the nav items back at the top of the screen — the exact place the hamburger
 * had just collapsed them from — so on a tablet the menu pushed the page
 * content down and read as a second header rather than as navigation. A
 * drawer keeps the items in one column against the edge of the screen,
 * matching the merchant dashboard's own left sidebar, so both portals navigate
 * the same way.
 *
 * It is a modal surface, so it owns the usual obligations: Escape and a
 * backdrop click close it, Tab is trapped inside it, the page behind it does
 * not scroll, and focus returns to whatever opened it.
 */
export function AdminNavDrawer({
  open,
  onClose,
  items,
  user,
  platformRole,
  onLogout,
}: AdminNavDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Whatever had focus when the drawer opened, so it can be handed back.
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useDismissOnEscape(open, onClose);

  // Move focus into the panel on open, and return it on close. Without the
  // restore a keyboard user who closes the drawer lands back at the top of the
  // document rather than on the toggle they just pressed.
  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    // The first nav link, rather than the panel itself, so the first Tab moves
    // to the second item instead of into the item that is already highlighted.
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panelRef.current)?.focus();

    return () => {
      const target = restoreFocusRef.current;
      // Guard against the opener having been unmounted while the drawer was up.
      if (target && document.contains(target)) target.focus();
    };
  }, [open]);

  // The page behind a modal surface should not scroll with it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Trap Tab inside the panel. A modal that leaks focus to the page behind it
  // is worse than no modal: the focus ring disappears somewhere under the
  // backdrop with no way to see where it went.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        el => el.offsetParent !== null
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close menu"
        onClick={onClose}
        className="animate-overlay-in absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-drawer-title"
        className={cn(
          'animate-drawer-left relative flex h-full w-[min(18rem,82vw)] flex-col',
          'border-r border-[var(--line)] bg-[var(--surface-deep)] shadow-2xl focus:outline-none'
        )}
      >
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[var(--line)] px-4">
          <h2 id="admin-drawer-title" className="flex items-center gap-2 text-sm font-bold text-primary">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F]">
              <ShieldCheck size={14} className="text-slate-950" aria-hidden="true" />
            </span>
            Platform
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className={cn(
              'rounded-lg p-1.5 text-muted transition-colors hover:bg-[var(--ink)]/10 hover:text-primary',
              focusRing
            )}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Admin" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  focusRing,
                  isActive
                    ? 'bg-[var(--ink)]/10 font-semibold text-primary'
                    : 'text-secondary hover:bg-[var(--ink)]/5 hover:text-primary'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* The active marker is an element rather than a left border
                      so the row's text does not shift by the border width when
                      the active item changes. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-5 w-0.5 flex-shrink-0 rounded-full',
                      isActive ? 'bg-[#FFBD2E]' : 'bg-transparent'
                    )}
                  />
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex-shrink-0 border-t border-[var(--line)] p-3">
          {user && (
            <div className="px-3 pb-3">
              <p className="truncate text-sm font-medium text-primary">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
              <p className="mt-1 text-xs font-medium text-[var(--brand-yellow-ink)]">
                {platformRole?.replace('PLATFORM_', '') ?? 'ADMIN'}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onLogout}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--ink)]/15 px-3 py-2.5',
              'text-sm font-medium text-secondary transition-colors hover:bg-[#FF5F56]/15 hover:text-[var(--brand-red-ink)]',
              focusRing
            )}
          >
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
