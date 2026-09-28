import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';

export async function getPlans(req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
}

export async function getPlanByCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.params;
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { code },
    });

    if (!plan) {
      res.status(404).json({ success: false, error: 'Subscription plan not found' });
      return;
    }

    res.json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
}
