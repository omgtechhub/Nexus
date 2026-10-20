import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const logs = await prisma.auditLog.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
}
