import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { AccountType } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { hashSessionToken } from '../services/auth/tokens.service.js';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.nexus_session || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required. No session cookie found.' });
      return;
    }

    const session = await prisma.session.findUnique({
      // The raw token never touches the database; only its digest is stored.
      where: { sessionToken: hashSessionToken(token) },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                store: true,
              },
            },
          },
        },
      },
    });

    if (!session || session.revokedAt || new Date(session.expiresAt) < new Date()) {
      res.status(401).json({ success: false, error: 'Session expired or invalidated. Please log in again.' });
      return;
    }

    const { passwordHash, ...safeUser } = session.user;
    const activeMembership = session.user.memberships[0];

    req.user = safeUser;
    if (activeMembership && activeMembership.store) {
      req.store = activeMembership.store;
      req.membership = activeMembership;
    } else {
      req.store = undefined;
      req.membership = undefined;
    }
    req.sessionId = session.id;

    next();
  } catch (err) {
    console.error('Error in auth middleware:', err);
    res.status(500).json({ success: false, error: 'Internal authentication error.' });
  }
}

/**
 * Populate req.user when a valid session is present, but never reject.
 *
 * For public endpoints that behave better with identity — a signed-in buyer's
 * checkout is attached to their account rather than landing as a guest order —
 * while staying open to visitors who are not signed in.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.nexus_session || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return next();

    const session = await prisma.session.findUnique({
      // The raw token never touches the database; only its digest is stored.
      where: { sessionToken: hashSessionToken(token) },
      include: { user: { include: { memberships: { include: { store: true } } } } },
    });

    if (!session || session.revokedAt || new Date(session.expiresAt) < new Date()) {
      return next();
    }

    const { passwordHash, ...safeUser } = session.user;
    const activeMembership = session.user.memberships[0];

    req.user = safeUser;
    req.store = activeMembership?.store ?? undefined;
    req.membership = activeMembership ?? undefined;
    req.sessionId = session.id;
  } catch (err) {
    // An identity lookup failure must not break a public request.
    logger.warn({ err }, 'optionalAuth lookup failed; continuing as guest');
  }
  next();
}

export const requireAuth = authMiddleware;

/**
 * Which portal this request's user belongs to.
 * ADMIN comes from platformRole; otherwise the stored accountType column.
 */
export function accountTypeOf(user: any): 'ADMIN' | 'SELLER' | 'CUSTOMER' {
  if (user?.platformRole) return 'ADMIN';
  return user?.accountType === AccountType.CUSTOMER ? 'CUSTOMER' : 'SELLER';
}

/**
 * Customer-portal endpoints.
 *
 * Previously this only checked that *someone* was signed in, so sellers and
 * platform admins could read /api/account/*. Now gated on the stored account
 * type rather than guessed from store membership.
 */
export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required.' });
    return;
  }

  const type = accountTypeOf(req.user);
  if (type !== 'CUSTOMER') {
    res.status(403).json({
      success: false,
      error:
        type === 'ADMIN'
          ? 'Platform administrators cannot use the customer portal.'
          : 'This is a merchant account. Sign in with a customer account to use the customer portal.',
    });
    return;
  }

  next();
}

export function requireStoreMembership(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required.' });
    return;
  }
  if (accountTypeOf(req.user) === 'CUSTOMER') {
    res.status(403).json({
      success: false,
      error: 'This is a customer account. Sign in with a merchant account to use seller endpoints.',
    });
    return;
  }

  if (!req.store || !req.membership) {
    res.status(403).json({
      success: false,
      error: 'Access denied. Active merchant store membership required for seller endpoints.',
    });
    return;
  }
  next();
}

export const requireSeller = requireStoreMembership;

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required.' });
    return;
  }
  const role = (req.user as any).platformRole;
  if (role !== 'PLATFORM_OWNER' && role !== 'PLATFORM_ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Access denied. Platform administrator privileges required.',
    });
    return;
  }
  next();
}

export const requireAdmin = requirePlatformAdmin;
