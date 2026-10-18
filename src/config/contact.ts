/**
 * Where the public pages tell people to write, in one place.
 *
 * These addresses were hardcoded at thirteen sites across the Privacy Policy,
 * Terms and Cookie Policy. They are not decoration: the privacy address
 * receives data subject requests, which carry a one-month statutory deadline,
 * and the legal address receives infringement notices. An address that
 * bounces is worse than no address, because the page is a published
 * undertaking that someone can reach us there.
 *
 * The domain below is a PLACEHOLDER. It is not registered. Before launch:
 *
 *   1. register the domain;
 *   2. change `DOMAIN` here — every page follows;
 *   3. create the three mailboxes, or alias all three onto one inbox, and
 *      confirm each one actually delivers;
 *   4. set the server side to match — `EMAIL_FROM` in `server/src/config`,
 *      and `PLATFORM_CNAME_TARGET` / `RESERVED_DOMAINS` in
 *      `server/src/controllers/domains.controller.ts`, whose defaults name
 *      this same placeholder. `RESERVED_DOMAINS` left on the wrong domain
 *      means the reserved-hostname guard protects a domain nobody owns and
 *      not the real one.
 *
 * They do not have to be three people. One mailbox with three aliases is the
 * normal arrangement and is what these pages assume.
 */
export const DOMAIN = 'nexuscommerce.io';

export const CONTACT = {
  /** Data subject requests, and anything about the Privacy or Cookie policy. */
  privacy: `privacy@${DOMAIN}`,
  /** Terms, IP and infringement notices. */
  legal: `legal@${DOMAIN}`,
  /** Everything else, including seller account help. */
  support: `support@${DOMAIN}`,
} as const;

/** The registered trading name shown on the legal pages. */
export const LEGAL_ENTITY = 'Nexus Commerce';

/**
 * The postal address on the legal pages.
 *
 * Carried over from the previous version of the Privacy Policy and the
 * contact page, which already agreed with each other. Confirm it is the
 * address of the registered entity before launch — two pages naming two
 * addresses is the detail a regulator reads first.
 */
export const POSTAL_ADDRESS = '12 Gana Street, Maitama, Abuja 900271, FCT, Nigeria';
