import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Only destinations that exist. The previous footer advertised 34 links across
 * Products/Solutions/Resources/Company plus five `href="#"` social icons and a
 * status page, none of which were real.
 *
 * Still deliberately absent: a delivery-and-returns page and a shopper FAQ.
 * Neither is configured anywhere in the platform, and linking to them would
 * promise a policy that does not exist. Delivery is quoted per store at
 * checkout, which is where the shopper is told about it.
 *
 * There is no admin link here either. The platform console is reached by its
 * own URL, not advertised on a public page.
 */
const FOOTER_SECTIONS: { heading: string; links: { label: string; to: string }[] }[] = [
  {
    heading: 'Shop',
    links: [
      { label: 'Browse the shop', to: '/products' },
      { label: 'All products', to: '/products/browse' },
      { label: 'Your bag', to: '/cart' },
      { label: 'Track an order', to: '/track' },
      { label: 'Your orders', to: '/account/orders' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Seller log in', to: '/seller/login' },
      { label: 'Start selling', to: '/seller/register' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Contact us', to: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Cookie Policy', to: '/cookies' },
    ],
  },
];

const footerLink =
  'rounded text-sm text-muted transition-colors hover:text-primary ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]';

export function Footer() {
  return (
    <footer className="border-t border-[var(--ink)]/5 bg-[var(--surface-base)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4 lg:gap-12">
          <div className="col-span-2 lg:col-span-1">
            <Link
              to="/"
              className="mb-5 inline-flex items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] shadow-lg shadow-red-900/40">
                <Zap size={18} className="text-white" fill="currentColor" aria-hidden="true" />
              </span>
              <span className="text-xl font-bold text-primary">Nexus Commerce</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              The marketplace independent sellers list their products on — and
              where you can shop all of them with one account.
            </p>
          </div>

          {FOOTER_SECTIONS.map(section => {
            // A multi-word heading cannot be an id verbatim: spaces are not
            // valid in one, and the aria-labelledby reference silently fails
            // to resolve.
            const headingId = `footer-${section.heading.toLowerCase().replace(/[^a-z]+/g, '-')}`;
            return (
            <nav key={section.heading} aria-labelledby={headingId}>
              <h2
                id={headingId}
                className="mb-4 text-xs font-semibold uppercase tracking-wider text-primary"
              >
                {section.heading}
              </h2>
              <ul className="space-y-2.5">
                {section.links.map(link => (
                  <li key={link.to}>
                    <Link to={link.to} className={footerLink}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            );
          })}
        </div>

        <div className="mt-12 border-t border-[var(--ink)]/5 pt-8">
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} Nexus Commerce, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
