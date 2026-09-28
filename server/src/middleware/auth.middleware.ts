import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.nexus_session || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required. No session cookie found.' });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
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

export const requireAuth = authMiddleware;

/**
 * Customer-portal endpoints.
 *
 * Previously this only checked that *someone* was signed in, so sellers and
 * platform admins could read /api/account/*. A customer is a signed-in user
 * who neither owns/staffs a store nor holds a platform role.
 */
export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required.' });
    return;
  }

  if ((req.user as any).platformRole) {
    res.status(403).json({
      success: false,
      error: 'Platform administrators cannot use the customer portal. Sign in with a customer account.',
    });
    return;
  }

  if (req.store || req.membership) {
    res.status(403).json({
      success: false,
      error: 'This account is a merchant account. Sign in with a customer account to use the customer portal.',
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
