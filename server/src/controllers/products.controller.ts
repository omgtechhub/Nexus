import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import { ProductStatus, InventoryMovementType } from '@prisma/client';

const variantInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  sku: z.string().min(1),
  price: z.number().min(0),
  comparePrice: z.number().optional(),
  costPrice: z.number().optional(),
  barcode: z.string().optional(),
  inventoryQuantity: z.number().int().min(0).default(0),
});

const imageInputSchema = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  altText: z.string().optional(),
  position: z.number().int().default(0),
  isPrimary: z.boolean().default(false),
  storageKey: z.string().optional(),
});

const createProductSchema = z.object({
  title: z.string().min(1, 'Product title is required'),
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional().default(''),
  price: z.number().min(0, 'Price must be non-negative'),
  comparePrice: z.number().optional(),
  costPrice: z.number().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  inventory: z.number().int().min(0).default(0),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.ACTIVE),
  category: z.string().default('General'),
  tags: z.array(z.string()).optional().default([]),
  variants: z.array(variantInputSchema).optional().default([]),
  images: z.array(imageInputSchema).optional().default([]),
});

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { q, category, status, page = '1', limit = '50', sort = 'createdAt_desc' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { storeId };

    if (q) {
      where.OR = [
        { title: { contains: q as string, mode: 'insensitive' } },
        { description: { contains: q as string, mode: 'insensitive' } },
        { sku: { contains: q as string, mode: 'insensitive' } },
      ];
    }

    if (category && category !== 'all') {
      where.category = { equals: category as string, mode: 'insensitive' };
    }

    if (status && status !== 'all') {
      where.status = (status as string).toUpperCase() as ProductStatus;
    }

    const [totalCount, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: sort === 'price_asc'
          ? { price: 'asc' }
          : sort === 'price_desc'
          ? { price: 'desc' }
          : { createdAt: 'desc' },
        include: {
          variants: true,
          images: { orderBy: { position: 'asc' } },
          inventoryItems: true,
        },
      }),
    ]);

    const formatted = products.map(p => ({
      id: p.id,
      title: p.title,
      name: p.name || p.title,
      slug: p.slug,
      description: p.description,
      price: p.price,
      comparePrice: p.comparePrice || undefined,
      costPrice: p.costPrice || undefined,
      sku: p.sku,
      barcode: p.barcode || undefined,
      inventory: p.variants.length > 0 ? p.variants.reduce((sum, v) => sum + v.inventoryQuantity, 0) : (p.inventoryItems[0]?.stock ?? 0),
      status: p.status.toLowerCase(),
      category: p.category,
      tags: Array.isArray(p.tags) ? p.tags : [],
      images: p.images.length > 0 ? p.images.map(img => img.url) : (Array.isArray(p.images) ? p.images : []),
      productImages: p.images,
      variants: p.variants,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    res.json({
      success: true,
      data: formatted,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, storeId },
      include: {
        variants: true,
        images: { orderBy: { position: 'asc' } },
        inventoryItems: true,
      },
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

import { entitlementService } from '../services/billing/entitlement.service.js';

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    await entitlementService.assertCanAddProduct(storeId);
    const body = createProductSchema.parse(req.body);

    const baseTitle = body.title.trim();
    const slugBase = body.slug || baseTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const slug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;
    const sku = body.sku?.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;

    // Verify SKU uniqueness within store
    const existingSku = await prisma.product.findFirst({
      where: { storeId, sku },
    });
    if (existingSku) {
      res.status(400).json({ success: false, error: `SKU "${sku}" already exists in your store.` });
      return;
    }

    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          storeId,
          title: baseTitle,
          name: body.name || baseTitle,
          slug,
          description: body.description,
          price: body.price,
          comparePrice: body.comparePrice,
          costPrice: body.costPrice,
          sku,
          barcode: body.barcode,
          status: body.status,
          category: body.category,
          tags: body.tags,
        },
      });

      // Images
      if (body.images.length > 0) {
        await tx.productImage.createMany({
          data: body.images.map((img, idx) => ({
            productId: product.id,
            url: img.url,
            altText: img.altText || product.title,
            position: img.position ?? idx,
            isPrimary: img.isPrimary ?? idx === 0,
            storageKey: img.storageKey,
          })),
        });
      }

      // Variants or Default Variant
      if (body.variants.length > 0) {
        for (const v of body.variants) {
          const variant = await tx.productVariant.create({
            data: {
              productId: product.id,
              title: v.title,
              sku: v.sku || `${product.sku}-${Math.random().toString(36).substring(2, 5)}`,
              price: v.price,
              comparePrice: v.comparePrice,
              costPrice: v.costPrice,
              barcode: v.barcode,
              inventoryQuantity: v.inventoryQuantity,
            },
          });

          const invItem = await tx.inventoryItem.create({
            data: {
              storeId,
              productId: product.id,
              variantId: variant.id,
              sku: variant.sku,
              stock: variant.inventoryQuantity,
              availableStock: variant.inventoryQuantity,
              reservedStock: 0,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              storeId,
              inventoryItemId: invItem.id,
              productId: product.id,
              variantId: variant.id,
              changeQuantity: variant.inventoryQuantity,
              newQuantity: variant.inventoryQuantity,
              type: InventoryMovementType.INITIAL,
              reason: 'Product variant created',
            },
          });
        }
      } else {
        const invItem = await tx.inventoryItem.create({
          data: {
            storeId,
            productId: product.id,
            sku: product.sku,
            stock: body.inventory,
            availableStock: body.inventory,
            reservedStock: 0,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            storeId,
            inventoryItemId: invItem.id,
            productId: product.id,
            changeQuantity: body.inventory,
            newQuantity: body.inventory,
            type: InventoryMovementType.INITIAL,
            reason: 'Product created',
          },
        });
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: { variants: true, images: true, inventoryItems: true },
      });
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;

    const existing = await prisma.product.findFirst({
      where: { id, storeId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const { title, description, price, comparePrice, costPrice, sku, status, category, tags, images } = req.body;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(title ? { title, name: title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(comparePrice !== undefined ? { comparePrice: Number(comparePrice) } : {}),
        ...(costPrice !== undefined ? { costPrice: Number(costPrice) } : {}),
        ...(sku ? { sku } : {}),
        ...(status ? { status: status.toUpperCase() as ProductStatus } : {}),
        ...(category ? { category } : {}),
        ...(tags ? { tags } : {}),
      },
      include: { variants: true, images: true, inventoryItems: true },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;

    const existing = await prisma.product.findFirst({
      where: { id, storeId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
}
