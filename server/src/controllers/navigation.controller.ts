import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { logAuditEvent } from '../utils/auditLogger.js';

export async function getNavigationMenus(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const menus = await prisma.navigationMenu.findMany({
      where: { storeId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: menus });
  } catch (err) {
    next(err);
  }
}

export async function createNavigationMenu(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const user = req.user!;
    const { title, name, handle, items } = req.body;

    const menuName = title || name;
    if (!menuName) {
      res.status(400).json({ success: false, error: 'Menu title/name is required' });
      return;
    }

    const cleanHandle = (handle || menuName).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

    const existing = await prisma.navigationMenu.findUnique({
      where: { storeId_handle: { storeId, handle: cleanHandle } },
    });

    if (existing) {
      res.status(400).json({ success: false, error: `Navigation menu "${cleanHandle}" already exists` });
      return;
    }

    const menu = await prisma.navigationMenu.create({
      data: {
        storeId,
        name: menuName,
        handle: cleanHandle,
        items: items || [],
      },
    });

    await logAuditEvent({
      storeId,
      userId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'NAVIGATION_MENU_CREATED',
      resource: 'navigation',
      resourceId: menu.id,
      metadata: { name: menu.name, handle: menu.handle },
    });

    res.status(201).json({ success: true, data: menu });
  } catch (err) {
    next(err);
  }
}

export async function updateNavigationMenu(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;
    const { title, name, items } = req.body;
    const menuName = title || name;

    let existing = await prisma.navigationMenu.findFirst({
      where: { OR: [{ id }, { handle: id }], storeId },
    });

    let updated;
    if (!existing) {
      // Upsert menu by handle if not exists
      const cleanHandle = id.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
      updated = await prisma.navigationMenu.create({
        data: {
          storeId,
          name: menuName || cleanHandle,
          handle: cleanHandle,
          items: items || [],
        },
      });
    } else {
      updated = await prisma.navigationMenu.update({
        where: { id: existing.id },
        data: {
          ...(menuName ? { name: menuName } : {}),
          ...(items ? { items } : {}),
        },
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteNavigationMenu(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;
    const user = req.user!;

    const existing = await prisma.navigationMenu.findFirst({
      where: { OR: [{ id }, { handle: id }], storeId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Navigation menu not found' });
      return;
    }

    await prisma.navigationMenu.delete({ where: { id: existing.id } });

    await logAuditEvent({
      storeId,
      userId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'NAVIGATION_MENU_DELETED',
      resource: 'navigation',
      resourceId: existing.id,
      metadata: { name: existing.name },
    });

    res.json({ success: true, message: 'Navigation menu deleted' });
  } catch (err) {
    next(err);
  }
}
