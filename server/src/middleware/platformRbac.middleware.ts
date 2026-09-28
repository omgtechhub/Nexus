import { Request, Response, NextFunction } from 'express';
import { PlatformRole } from '@prisma/client';
import { prisma } from '../prisma.js';

export function requirePlatformRole(allowedRoles: PlatformRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized: Session missing' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, platformRole: true },
      });

      if (!user || !user.platformRole) {
        res.status(403).json({ success: false, error: 'Forbidden: Access denied. Platform admin privileges required.' });
        return;
      }

      if (!allowedRoles.includes(user.platformRole)) {
        res.status(403).json({
          success: false,
          error: `Forbidden: Platform role ${user.platformRole} insufficient. Required: ${allowedRoles.join(', ')}`,
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
