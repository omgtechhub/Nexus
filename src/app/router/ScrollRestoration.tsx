import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Scroll behaviour across navigations.
 *
 * A browser resets the scroll position on every page load. A single-page app
 * does not: the document never changes, so the window keeps whatever offset it
 * had — which is why following a footer link landed the next page already
 * scrolled to its footer.
 *
 * React Router ships `<ScrollRestoration />` for this, but only for a data
 * router (`createBrowserRouter`). This app mounts a plain `<BrowserRouter>`,
 * so the behaviour is reproduced here.
 *
 * The rules are the ones a browser follows, because that is what people expect:
 *
 *   - Following a link goes to the top of the new page.
 *   - Back and forward return to where the page was left. Jumping a visitor to
 *     the top when they press Back is its own, more annoying bug: they lose
 *     their place in a list they had scrolled through.
 *   - A URL carrying a #fragment goes to that element rather than the top.
 *
 * A `?query` change counts as a new page too. Search parameters in this app only
 * ever filter, sort, search or paginate a listing, and all four replace what is
 * on screen — leaving the reader halfway down the previous result set. It is the
 * same complaint as the footer-link one, reached a different way: the category
 * chips in the shop header are plain links that change only the query string.
 *
 * Such a move is scrolled *smoothly*, because the reader stays on the page they
 * were already on and an instant jump there reads as a glitch. Going to a
 * genuinely different page jumps instantly instead: animating it would mean
 * watching a long page race past on every navigation.
 *
 * A #hash change on its own is left alone — that is the skip link doing exactly
 * what it is for.
 */

/** How long to keep re-applying a restored offset while the page fills in.
 *  Long enough for a code-split route plus its first query, short enough that
 *  a reader who scrolls instead is not dragged back. */
const REMERCHANT_WINDOW_MS = 800;

/** Plenty of history for one session; stops the map growing without bound. */
const MAX_REMEMBERED = 50;

/** Jump without animating by default: `html` sets `scroll-behavior: smooth`,
 *  which is right for in-page anchors and wrong for changing page — a long page
 *  would visibly race to the top on every navigation. */
function jumpTo(top: number, behavior: ScrollBehavior = 'instant' as ScrollBehavior) {
  window.scrollTo({ top, left: 0, behavior });
}

export function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();

  // Scroll offsets by history entry. `location.key` is unique per entry, so the
  // same URL visited twice keeps a position for each visit and Back restores
  // the one actually being returned to.
  const positions = useRef(new Map<string, number>());
  const currentKey = useRef(location.key);
  const lastUrl = useRef<string | null>(null);
  const lastPathname = useRef<string | null>(null);

  /*
   * Bank the outgoing page's offset during render — the one moment it can still
   * be read truthfully.
   *
   * Everything later is too late. By the time a layout effect runs, the DOM has
   * been swapped, the document has collapsed to the height of the incoming page
   * and the browser has already clamped the offset; a grid left at 1600px was
   * being recorded as 0, so Back went to the top, which is the bug this exists
   * to prevent. Doing it on the trailing scroll event does not work either,
   * because the clamp dispatches that event before the effect can move the key,
   * so it overwrites the entry being left.
   *
   * Reading during render sidesteps the ordering question entirely: React has
   * not touched the DOM yet, so the old page is still on screen at its real
   * offset. Advancing `currentKey` here as well means the clamp's event is
   * attributed to the incoming entry, where it is harmless.
   *
   * This writes to refs during render, which is normally worth avoiding. It is
   * safe here because both writes are idempotent — a discarded render records
   * the same offset against the same key.
   */
  if (currentKey.current !== location.key) {
    const map = positions.current;
    map.set(currentKey.current, window.scrollY);
    if (map.size > MAX_REMEMBERED) map.delete(map.keys().next().value as string);
    currentKey.current = location.key;
  }

  // Browsers restore scroll on their own for history navigations, which would
  // race this. Taking manual control means one mechanism decides.
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    if (previous) window.history.scrollRestoration = 'manual';
    return () => {
      if (previous) window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    const saved = positions.current.get(location.key);

    const url = location.pathname + location.search;
    const samePage = lastUrl.current === url;
    const samePathname = lastPathname.current === location.pathname;
    lastUrl.current = url;
    lastPathname.current = location.pathname;

    if (location.hash) {
      // The target often belongs to a route that is still code-splitting in,
      // so a miss here is retried once the next frame has painted.
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        target.scrollIntoView();
        return;
      }
      const frame = requestAnimationFrame(() => {
        document.getElementById(location.hash.slice(1))?.scrollIntoView();
      });
      return () => cancelAnimationFrame(frame);
    }

    // Nothing but the hash moved, and it has just been cleared.
    if (samePage) return;

    if (navigationType === 'POP' && saved !== undefined && saved > 0) {
      /*
       * Restoring is not a single call, because the page is not at its full
       * height yet. Coming back to a product grid, the route chunk is still
       * resolving and the listing is still being fetched, so the document is
       * barely a screen tall and the browser clamps the offset to near zero —
       * the original bug wearing a different hat.
       *
       * So the offset is re-applied as the page grows, until it is reached or
       * the window closes. The deadline matters: without one this would fight a
       * reader who starts scrolling before the content lands.
       */
      let frame = 0;
      const deadline = performance.now() + REMERCHANT_WINDOW_MS;
      const attempt = () => {
        const furthest = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight
        );
        jumpTo(Math.min(saved, furthest));
        if (Math.round(window.scrollY) < saved && performance.now() < deadline) {
          frame = requestAnimationFrame(attempt);
        }
      };
      attempt();
      return () => cancelAnimationFrame(frame);
    }

    jumpTo(0, samePathname ? 'smooth' : ('instant' as ScrollBehavior));
  }, [location.key, location.pathname, location.search, location.hash, navigationType]);

  return null;
}
