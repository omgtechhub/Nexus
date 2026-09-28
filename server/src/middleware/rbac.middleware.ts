import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../prisma.js';

export function requireRole(allowedRoles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const storeId = req.store?.id;

      if (!userId || !storeId) {
        res.status(401).json({ success: false, error: 'Unauthorized session or store context missing' });
        return;
      }

      const membership = await prisma.storeMember.findFirst({
        where: { userId, storeId },
      });

      if (!membership) {
        res.status(403).json({ success: false, error: 'Forbidden: You are not a member of this store' });
        return;
      }

      if (!allowedRoles.includes(membership.role)) {
        res.status(403).json({
          success: false,
          error: `Forbidden: Role ${membership.role} is insufficient for this action. Required: ${allowedRoles.join(', ')}`,
        });
        return;
      }

      // Attach member role to request for downstream handlers
      req.memberRole = membership.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
