import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { InventoryMovementType } from '@prisma/client';
import { z } from 'zod';

const adjustSchema = z.object({
  variantId: z.string().optional(),
  changeQuantity: z.number().int(),
  reason: z.string().optional().default('Manual stock adjustment'),
  type: z.nativeEnum(InventoryMovementType).optional().default('MANUAL_ADJUSTMENT'),
});

export async function getInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const items = await prisma.inventoryItem.findMany({
      where: { storeId },
      include: {
        product: { select: { id: true, title: true, name: true, sku: true, category: true, images: true } },
        variant: { select: { id: true, title: true, sku: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

export async function getProductInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { productId } = req.params;

    const items = await prisma.inventoryItem.findMany({
      where: { storeId, productId },
      include: {
        variant: true,
        movements: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

export async function updateProductInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { productId } = req.params;
    const { stock, lowStockThreshold, variantId } = req.body;

    const existing = await prisma.inventoryItem.findFirst({
      where: {
        storeId,
        productId,
        ...(variantId ? { variantId } : {}),
      },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Inventory item not found' });
      return;
    }

    const newStock = typeof stock === 'number' ? stock : existing.stock;
    const newAvailable = Math.max(0, newStock - existing.reservedStock);

    const updated = await prisma.inventoryItem.update({
      where: { id: existing.id },
      data: {
        stock: newStock,
        availableStock: newAvailable,
        lowStockThreshold: typeof lowStockThreshold === 'number' ? lowStockThreshold : existing.lowStockThreshold,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function adjustStock(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { productId } = req.params;
    const body = adjustSchema.parse(req.body);

    const item = await prisma.inventoryItem.findFirst({
      where: {
        storeId,
        productId,
        ...(body.variantId ? { variantId: body.variantId } : {}),
      },
    });

    if (!item) {
      res.status(404).json({ success: false, error: 'Inventory item not found for product' });
      return;
    }

    const calculatedNewStock = item.stock + body.changeQuantity;
    if (calculatedNewStock < 0) {
      res.status(400).json({
        success: false,
        error: `Invalid stock adjustment: Stock cannot drop below 0. Current stock is ${item.stock}.`,
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          stock: calculatedNewStock,
          availableStock: Math.max(0, calculatedNewStock - item.reservedStock),
        },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          storeId,
          inventoryItemId: item.id,
          productId: item.productId,
          variantId: item.variantId,
          changeQuantity: body.changeQuantity,
          newQuantity: calculatedNewStock,
          type: body.type,
          reason: body.reason,
        },
      });

      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { inventoryQuantity: calculatedNewStock },
        });
      }

      return { item: updatedItem, movement };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
