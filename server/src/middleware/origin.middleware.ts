import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Rejects state-changing requests that arrive from an origin we do not serve.
 *
 * This is the CSRF defence. The session cookie is `SameSite=None` in production
 * (the frontend and API are not guaranteed to share a site), so the browser
 * attaches it to cross-site requests; without this check any page on the web
 * could perform an authenticated write on a visitor's behalf.
 *
 * Reads are deliberately left alone. They are idempotent, the damaging case is
 * the write, and blocking cross-origin GETs would break ordinary embedding.
 *
 * A missing Origin is allowed because non-browser callers — curl, a webhook
 * sender, a mobile client, supertest — do not send one, and those requests
 * carry no ambient cookie authority to abuse. Browsers always send Origin on
 * cross-origin requests and on every same-origin non-GET.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function createOriginGuard(allowedOrigins: string[]) {
  const allowed = new Set(allowedOrigins.map(normalise).filter(Boolean));

  return function originGuard(req: Request, res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.get('origin');
    if (!origin) return next();

    if (allowed.has(normalise(origin))) return next();

    logger.warn({
      msg: 'Blocked a cross-origin state change',
      method: req.method,
      path: req.originalUrl,
      origin,
    });

    res.status(403).json({
      success: false,
      error: 'Cross-origin request rejected.',
    });
  };
}

/** Compares scheme + host + port, never a substring of the whole URL. */
function normalise(value: string): string {
  try {
    const url = new URL(value);
    return url.origin.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Whether an origin may talk to this API at all.
 *
 * Exact origin comparison. The previous implementation asked whether the origin
 * *contained* "localhost", which accepts `https://localhost.attacker.example`
 * and every other lookalike host — with credentials enabled, that is a handover
 * of the session.
 */
export function isAllowedOrigin(origin: string, allowedOrigins: string[], isProd: boolean): boolean {
  const candidate = normalise(origin);
  if (!candidate) return false;

  if (allowedOrigins.map(normalise).includes(candidate)) return true;

  if (!isProd) {
    // Local development: any port on the loopback host, matched on the parsed
    // hostname so a lookalike domain cannot pass.
    try {
      const { hostname } = new URL(candidate);
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    } catch {
      return false;
    }
  }

  return false;
}
