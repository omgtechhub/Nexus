import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { logAuditEvent } from '../utils/auditLogger.js';

export async function getPages(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const pages = await prisma.storePage.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: pages });
  } catch (err) {
    next(err);
  }
}

export async function getPageById(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;

    const page = await prisma.storePage.findFirst({
      where: { OR: [{ id }, { slug: id }], storeId },
    });

    if (!page) {
      res.status(404).json({ success: false, error: 'Store page not found' });
      return;
    }

    res.json({ success: true, data: page });
  } catch (err) {
    next(err);
  }
}

export async function createPage(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const user = req.user!;
    const { title, slug, content, seoTitle, seoDescription, isPublished } = req.body;

    if (!title) {
      res.status(400).json({ success: false, error: 'Page title is required' });
      return;
    }

    const cleanSlug = (slug || title).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

    const existing = await prisma.storePage.findUnique({
      where: { storeId_slug: { storeId, slug: cleanSlug } },
    });

    if (existing) {
      res.status(400).json({ success: false, error: `Page with slug "${cleanSlug}" already exists` });
      return;
    }

    const page = await prisma.storePage.create({
      data: {
        storeId,
        title,
        slug: cleanSlug,
        content: content || '',
        seoTitle,
        seoDescription,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      },
    });

    await logAuditEvent({
      storeId,
      userId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'PAGE_CREATED',
      resource: 'page',
      resourceId: page.id,
      metadata: { title: page.title, slug: page.slug },
    });

    res.status(201).json({ success: true, data: page });
  } catch (err) {
    next(err);
  }
}

export async function updatePage(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;
    const { title, slug, content, seoTitle, seoDescription, isPublished } = req.body;

    const existing = await prisma.storePage.findFirst({
      where: { id, storeId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Store page not found' });
      return;
    }

    let cleanSlug = existing.slug;
    if (slug && slug !== existing.slug) {
      cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
      const conflict = await prisma.storePage.findUnique({
        where: { storeId_slug: { storeId, slug: cleanSlug } },
      });
      if (conflict && conflict.id !== id) {
        res.status(400).json({ success: false, error: `Page slug "${cleanSlug}" is already in use` });
        return;
      }
    }

    const updated = await prisma.storePage.update({
      where: { id },
      data: {
        ...(title ? { title } : {}),
        slug: cleanSlug,
        ...(content !== undefined ? { content } : {}),
        ...(seoTitle !== undefined ? { seoTitle } : {}),
        ...(seoDescription !== undefined ? { seoDescription } : {}),
        ...(isPublished !== undefined ? { isPublished: Boolean(isPublished) } : {}),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deletePage(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;
    const user = req.user!;

    const existing = await prisma.storePage.findFirst({
      where: { id, storeId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Store page not found' });
      return;
    }

    await prisma.storePage.delete({ where: { id } });

    await logAuditEvent({
      storeId,
      userId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'PAGE_DELETED',
      resource: 'page',
      resourceId: id,
      metadata: { title: existing.title, slug: existing.slug },
    });

    res.json({ success: true, message: 'Store page deleted successfully' });
  } catch (err) {
    next(err);
  }
}
