import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { settingsSchema } from '../validators/auth.validator.js';

export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    let settings = await prisma.merchantSettings.findUnique({
      where: { merchantId },
    });

    if (!settings) {
      settings = await prisma.merchantSettings.create({
        data: {
          merchantId,
          displayName: req.merchant!.name,
          currency: req.merchant!.currency,
          industry: req.merchant!.industry,
        },
      });
    }

    res.json({
      success: true,
      data: {
        displayName: settings.displayName,
        description: settings.description,
        logoUrl: settings.logoUrl,
        currency: settings.currency,
        industry: settings.industry,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        // Delivery only. Tax is a platform setting, not a merchant one —
        // see `config/tax.ts`.
        defaultShippingFee: settings.defaultShippingFee,
        freeShippingThreshold: settings.freeShippingThreshold,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const body = settingsSchema.parse(req.body);

    const updated = await prisma.merchantSettings.upsert({
      where: { merchantId },
      update: body,
      create: {
        merchantId,
        ...body,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
