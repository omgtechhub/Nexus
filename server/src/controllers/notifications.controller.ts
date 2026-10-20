import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { NotificationType } from '@prisma/client';

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const notifications = await prisma.notification.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: { merchantId, read: false },
    });

    const formatted = notifications.map((n) => ({
      id: n.id,
      type: n.type.toLowerCase(),
      title: n.title,
      message: n.message,
      time: n.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      read: n.read,
      link: n.link || undefined,
    }));

    res.json({ success: true, data: formatted, unreadCount });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;

    const existing = await prisma.notification.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    await prisma.notification.updateMany({
      where: { merchantId, read: false },
      data: { read: true },
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

export async function createNotificationHelper(
  merchantId: string,
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
) {
  return prisma.notification.create({
    data: {
      merchantId,
      userId,
      type,
      title,
      message,
      link,
    },
  });
}
