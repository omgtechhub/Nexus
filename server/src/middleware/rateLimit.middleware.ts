import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { success: false, error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many payment requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const sensitiveActionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Rate limit exceeded for sensitive action. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * The default ceiling for the API as a whole.
 *
 * Until this existed, only `/auth`, `/payments`, `/payouts` and the public
 * assistant were limited, and **every other route was unmetered** — the
 * marketplace catalogue, shop reads, review listings, `/plans`, and
 * every authenticated seller endpoint. That is a free scraping endpoint for
 * the whole catalogue and an unbounded request sink on a single small box.
 *
 * Set generously: this is a backstop against floods, not a usage quota. A
 * shopper browsing the catalogue fires several reads per page, so a limit
 * tight enough to notice would break ordinary use. The specific limiters stay
 * where they are and remain much stricter — express-rate-limit runs both, and
 * the tighter one wins.
 *
 * Skipped for the gateway webhook paths: those are signature-verified, they
 * arrive in bursts after a batch settles, and a dropped one costs a payment
 * that never reaches CONFIRMED. Also skipped under test, where the suite
 * legitimately makes hundreds of calls from one address.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, error: 'Too many requests. Please slow down and try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    process.env.NODE_ENV === 'test' ||
    req.path.startsWith('/webhooks') ||
    req.path.startsWith('/saas-webhooks'),
});

/**
 * Image uploads.
 *
 * `/upload/image` accepts 10 MB per request and writes it to the uploads
 * volume, which is one of the three persistent volumes on the deploy host.
 * It was behind authentication but behind no limit at all, so a single signed
 * -in seller could fill the disk — and a full disk takes Postgres down with
 * it, not just the images.
 */
/**
 * The public contact form.
 *
 * Unauthenticated and it sends mail, so it is a spam relay if it is not
 * bounded: five messages per IP per fifteen minutes is generous for a person
 * and useless for a script.
 */
export const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, error: 'Too many messages from this address. Try again in a little while.' },
});

export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: 'Too many uploads in a short time. Please wait a few minutes and try again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});
