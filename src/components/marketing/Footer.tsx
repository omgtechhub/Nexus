import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Only destinations that exist. The previous footer advertised 34 links across
 * Products/Solutions/Resources/Company plus five `href="#"` social icons and a
 * status page, none of which were real.
 */
const FOOTER_SECTIONS: { heading: string; links: { label: string; to: string }[] }[] = [
  {
    heading: 'Platform',
    links: [
      { label: 'Pricing', to: '/pricing' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Merchant log in', to: '/seller/login' },
      { label: 'Start free trial', to: '/seller/register' },
      { label: 'Customer account', to: '/account/dashboard' },
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
  'rounded text-sm text-white/40 transition-colors hover:text-white ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D1B]';

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0B0D1B]">
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
              <span className="text-xl font-bold text-white">Nexus Commerce</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-white/40">
              The e-commerce platform for store owners who want their storefront,
              orders and customers in one place.
            </p>
          </div>

          {FOOTER_SECTIONS.map(section => (
            <nav key={section.heading} aria-labelledby={`footer-${section.heading}`}>
              <h2
                id={`footer-${section.heading}`}
                className="mb-4 text-xs font-semibold uppercase tracking-wider text-white"
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
          ))}
        </div>

        <div className="mt-12 border-t border-white/5 pt-8">
          <p className="text-sm text-white/30">
            © {new Date().getFullYear()} Nexus Commerce, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
