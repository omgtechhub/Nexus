import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Keeps `rel=canonical` and `og:url` pointing at the page actually being
 * viewed.
 *
 * `index.html` is one static document serving every route, so anything written
 * there is wrong for all but one of them. A static `rel=canonical` would be
 * worse than none at all: it would tell every crawler that `/pricing`,
 * `/products/browse` and every product page are duplicates of the homepage,
 * which is an instruction to drop them from the index. The same applies to
 * `og:url` — a link shared from a product page would unfurl as the homepage.
 *
 * Set here instead, where the current location is known.
 *
 * ## What this does not fix
 *
 * The app is client-rendered with no prerendering, so a crawler that does not
 * execute JavaScript still sees an empty shell whatever this tag says. This
 * makes the metadata correct for the crawlers that *do* execute it (Google
 * among them) and for every social unfurler. Genuine indexability for product
 * pages needs SSR or prerendering, which is a separate piece of work — see the
 * note in `public/sitemap.xml`.
 */

/** Upsert a `<link rel>` in the document head. */
function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Upsert an Open Graph `<meta property>`. */
function setMetaProperty(property: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.content = content;
}

/**
 * Routes that must never be presented as canonical, because they are
 * per-session, credential-bearing or behind a login. `robots.txt` already asks
 * crawlers not to visit them; this stops one that ignores that from indexing
 * the URL it happened to land on.
 */
const NON_CANONICAL = [
  '/cart',
  '/checkout',
  '/track',
  '/reset-password',
  '/verify-email',
  '/forgot-password',
  '/seller',
  '/account',
  '/admin',
];

export function DocumentHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const url = `${window.location.origin}${pathname}`;
    const isPrivate = NON_CANONICAL.some(
      prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    setLink('canonical', url);
    setMetaProperty('og:url', url);

    // Query strings are faceting (`?category=`, `?sort=`), not distinct
    // pages, so the canonical deliberately omits them — that is exactly the
    // duplicate-content case the tag exists to collapse.

    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = isPrivate ? 'noindex, nofollow' : 'index, follow';
  }, [pathname]);

  return null;
}
