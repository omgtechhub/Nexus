import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { settingsSchema } from '../validators/auth.validator.js';

export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    let settings = await prisma.storeSettings.findUnique({
      where: { storeId },
    });

    if (!settings) {
      settings = await prisma.storeSettings.create({
        data: {
          storeId,
          storeName: req.store!.name,
          storeUrl: req.store!.domain.split('.')[0] || 'store',
          currency: req.store!.currency,
          industry: req.store!.industry,
          announcementText: '🎉 Welcome to Nexus Commerce',
          activeTheme: 'nexus-dark',
          primaryColor: '#FFBD2E',
          customDomain: req.store!.domain,
        },
      });
    }

    res.json({
      success: true,
      data: {
        storeName: settings.storeName,
        storeUrl: settings.storeUrl,
        currency: settings.currency,
        industry: settings.industry,
        announcementText: settings.announcementText,
        activeTheme: settings.activeTheme,
        primaryColor: settings.primaryColor,
        customDomain: settings.customDomain,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const body = settingsSchema.parse(req.body);

    const updated = await prisma.storeSettings.upsert({
      where: { storeId },
      update: body,
      create: {
        storeId,
        ...body,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
