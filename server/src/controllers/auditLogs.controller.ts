import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const logs = await prisma.auditLog.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
}
