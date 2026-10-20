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
 * All three therefore resolve to ONE mailbox -- the account the API actually
 * authenticates to SMTP with. Three addresses on a domain whose mail was never
 * set up is exactly the undertaking that cannot be kept; one inbox that is
 * genuinely read can be. They stay three named exports so the pages can keep
 * saying which kind of request goes where, and so splitting them later is a
 * change to this file alone.
 *
 * When the domain is registered and its mail is live, give `MAILBOX` the
 * address of a real `privacy@`/`legal@`/`support@` set (or one inbox with
 * three aliases), and set the server to match: `SMTP_USER` and `EMAIL_FROM`
 * in `server/.env`, which must agree -- Gmail rewrites a From header it has
 * not verified.
 */

/** The domain the brand is presented under. Not yet registered for mail. */
export const DOMAIN = 'nexuscommerce.io';

/**
 * The one mailbox every published address resolves to.
 *
 * This is the same account `SMTP_USER` authenticates as, so replies land where
 * the platform's own mail is sent from, and nothing is published that cannot
 * receive.
 */
export const MAILBOX = 'omigiegraphics@gmail.com';

export const CONTACT = {
  /** Data subject requests, and anything about the Privacy or Cookie policy. */
  privacy: MAILBOX,
  /** Terms, IP and infringement notices. */
  legal: MAILBOX,
  /** Everything else, including seller account help. */
  support: MAILBOX,
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
