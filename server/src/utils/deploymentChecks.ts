/**
 * Boot-time configuration checks.
 *
 * Kept as pure functions, separate from the `process.exit` that acts on them,
 * so the rules can be tested without terminating the test runner.
 */

export interface SessionCookieVerdict {
  /** Origins that would silently break the session cookie. */
  insecureOrigins: string[];
  /** Every insecure origin is loopback, where browsers allow Secure cookies. */
  loopbackOnly: boolean;
  /** Whether the process should refuse to serve. */
  fatal: boolean;
}

/**
 * Whether a production deployment can actually hold a session.
 *
 * `auth.controller.ts` issues the session cookie as `SameSite=None; Secure`
 * whenever `NODE_ENV=production`. A browser silently discards a `Secure`
 * cookie delivered over plain HTTP — no warning, and the response that set it
 * still returns 200. So on an `http://` production deployment every login
 * *appears* to succeed and the very next request is unauthenticated, which is
 * indistinguishable from "the app is broken" and costs hours to diagnose.
 *
 * Loopback is exempt: browsers treat `localhost` and `127.0.0.1` as secure
 * contexts, so a local production build does work.
 */
export function checkSessionCookieViability(
  frontendUrl: string,
  isProd: boolean
): SessionCookieVerdict {
  if (!isProd) {
    return { insecureOrigins: [], loopbackOnly: true, fatal: false };
  }

  const origins = (frontendUrl || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  const insecureOrigins = origins.filter(origin => origin.toLowerCase().startsWith('http://'));

  if (insecureOrigins.length === 0) {
    return { insecureOrigins: [], loopbackOnly: true, fatal: false };
  }

  const loopbackOnly = insecureOrigins.every(origin =>
    /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/?$/i.test(origin)
  );

  return { insecureOrigins, loopbackOnly, fatal: !loopbackOnly };
}
