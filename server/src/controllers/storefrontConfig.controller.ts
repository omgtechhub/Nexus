import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const defaultConfig = {
  theme: 'nexus-dark',
  branding: {
    storeName: 'Aura Apparel Store',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#FFBD2E',
    secondaryColor: '#27C93F',
    accentColor: '#FF5F56',
    fontFamily: 'Inter',
    announcementText: '🎉 Flash Sale: Get 20% off all summer collections with code SUMMER20',
  },
  sections: [
    {
      id: 'hero_1',
      type: 'hero',
      title: 'Elevate Your Daily Style',
      subtitle: 'Crafted with sustainable fabrics and timeless minimalist cuts.',
      badge: 'New Collection 2026',
      buttonText: 'Shop Summer Drop',
      buttonLink: '#products',
    },
    {
      id: 'featured_1',
      type: 'product_grid',
      title: 'Featured Collection',
      subtitle: 'Handpicked bestsellers and luxury apparel',
      limit: 6,
    },
    {
      id: 'banner_1',
      type: 'banner',
      title: 'Join the Aura Insider Club',
      subtitle: 'Get 10% off your first order plus exclusive drop access.',
      buttonText: 'Subscribe',
    },
  ],
};

export async function getStorefrontConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;

    let config = await prisma.storefrontConfig.findUnique({
      where: { storeId },
    });

    if (!config) {
      config = await prisma.storefrontConfig.create({
        data: {
          storeId,
          activeTheme: 'nexus-dark',
          draftConfig: defaultConfig as any,
          publishedConfig: defaultConfig as any,
          isPublished: true,
          publishedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: config.id,
        storeId: config.storeId,
        activeTheme: config.activeTheme,
        draftConfig: config.draftConfig,
        publishedConfig: config.publishedConfig,
        isPublished: config.isPublished,
        publishedAt: config.publishedAt,
        updatedAt: config.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateDraftConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { draftConfig, activeTheme } = req.body;

    const existing = await prisma.storefrontConfig.findUnique({
      where: { storeId },
    });

    let updated;
    if (existing) {
      updated = await prisma.storefrontConfig.update({
        where: { storeId },
        data: {
          ...(draftConfig ? { draftConfig } : {}),
          ...(activeTheme ? { activeTheme } : {}),
        },
      });
    } else {
      updated = await prisma.storefrontConfig.create({
        data: {
          storeId,
          activeTheme: activeTheme || 'nexus-dark',
          draftConfig: draftConfig || (defaultConfig as any),
        },
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function publishStorefront(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const user = req.user!;

    const config = await prisma.storefrontConfig.findUnique({
      where: { storeId },
    });

    if (!config) {
      res.status(404).json({ success: false, error: 'Storefront config not found' });
      return;
    }

    const publishedAt = new Date();
    const updated = await prisma.storefrontConfig.update({
      where: { storeId },
      data: {
        publishedConfig: config.draftConfig as any,
        isPublished: true,
        publishedAt,
      },
    });

    await logAuditEvent({
      storeId,
      userId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'STOREFRONT_PUBLISHED',
      resource: 'storefront',
      metadata: { theme: updated.activeTheme, publishedAt },
    });

    res.json({
      success: true,
      message: 'Storefront configuration published live successfully!',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPreviewConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;

    const config = await prisma.storefrontConfig.findUnique({
      where: { storeId },
    });

    if (!config) {
      res.json({ success: true, data: defaultConfig });
      return;
    }

    res.json({ success: true, data: config.draftConfig || config.publishedConfig || defaultConfig });
  } catch (err) {
    next(err);
  }
}
