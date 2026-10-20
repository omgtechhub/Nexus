import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { discountSchema } from '../validators/auth.validator.js';
import { DiscountStatus, DiscountType } from '@prisma/client';

export async function getDiscounts(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const discounts = await prisma.discount.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = discounts.map((d) => ({
      id: d.id,
      code: d.code,
      type: d.type.toLowerCase(),
      value: d.value,
      redemptions: d.redemptions,
      maxRedemptions: d.maxRedemptions,
      minOrderAmount: d.minOrderAmount,
      allowedCategory: d.allowedCategory,
      startsAt: d.startsAt ? d.startsAt.toISOString() : null,
      endsAt: d.endsAt ? d.endsAt.toISOString() : null,
      status: d.status.toLowerCase(),
      createdAt: d.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
}

export async function createDiscount(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const body = discountSchema.parse(req.body);

    const cleanCode = body.code.toUpperCase().trim().replace(/\s+/g, '');

    const existing = await prisma.discount.findUnique({
      where: { merchantId_code: { merchantId, code: cleanCode } },
    });

    if (existing) {
      res.status(400).json({ success: false, error: 'Discount code already exists for this merchant' });
      return;
    }

    const discount = await prisma.discount.create({
      data: {
        merchantId,
        code: cleanCode,
        type: body.type as DiscountType,
        value: String(body.value),
        maxRedemptions: body.maxRedemptions || 100,
        minOrderAmount: req.body.minOrderAmount ? parseFloat(req.body.minOrderAmount) : null,
        allowedCategory: req.body.allowedCategory || null,
        startsAt: req.body.startsAt ? new Date(req.body.startsAt) : null,
        endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null,
        status: DiscountStatus.ACTIVE,
      },
    });

    res.status(201).json({ success: true, data: discount });
  } catch (err) {
    next(err);
  }
}

export async function updateDiscount(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;

    const existing = await prisma.discount.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Discount code not found' });
      return;
    }

    const { status, maxRedemptions, minOrderAmount, value } = req.body;

    const updated = await prisma.discount.update({
      where: { id },
      data: {
        ...(status && { status: status.toUpperCase() as DiscountStatus }),
        ...(maxRedemptions !== undefined && { maxRedemptions: parseInt(maxRedemptions, 10) }),
        ...(minOrderAmount !== undefined && { minOrderAmount: parseFloat(minOrderAmount) }),
        ...(value !== undefined && { value: String(value) }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteDiscount(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;

    const existing = await prisma.discount.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Discount code not found' });
      return;
    }

    await prisma.discount.delete({ where: { id } });
    res.json({ success: true, message: 'Discount code deleted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function validateDiscountCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, subtotal, merchantRef } = req.body;

    if (!code) {
      res.status(400).json({ success: false, valid: false, message: 'Discount code is required' });
      return;
    }

    let merchantId = req.merchant?.id;
    if (!merchantId && merchantRef) {
      const merchant = await prisma.merchant.findFirst({
        where: { id: merchantRef },
      });
      if (merchant) merchantId = merchant.id;
    }

    if (!merchantId) {
      // Default to main demo store if public store call
      const firstMerchant = await prisma.merchant.findFirst();
      if (firstMerchant) merchantId = firstMerchant.id;
    }

    if (!merchantId) {
      res.status(400).json({ success: false, valid: false, message: 'Merchant context missing' });
      return;
    }

    const cleanCode = code.toUpperCase().trim();
    const discount = await prisma.discount.findUnique({
      where: { merchantId_code: { merchantId, code: cleanCode } },
    });

    if (!discount) {
      res.json({ success: true, valid: false, message: 'Invalid discount code' });
      return;
    }

    if (discount.status !== DiscountStatus.ACTIVE) {
      res.json({ success: true, valid: false, message: 'Discount code is not active' });
      return;
    }

    if (discount.redemptions >= discount.maxRedemptions) {
      res.json({ success: true, valid: false, message: 'Discount code maximum redemptions reached' });
      return;
    }

    const now = new Date();
    if (discount.startsAt && discount.startsAt > now) {
      res.json({ success: true, valid: false, message: 'Discount code is not active yet' });
      return;
    }

    if (discount.endsAt && discount.endsAt < now) {
      res.json({ success: true, valid: false, message: 'Discount code has expired' });
      return;
    }

    const numericSubtotal = parseFloat(subtotal || 0);

    if (discount.minOrderAmount && numericSubtotal < discount.minOrderAmount) {
      res.json({
        success: true,
        valid: false,
        message: `Minimum order subtotal of $${discount.minOrderAmount.toFixed(2)} required for this discount`,
      });
      return;
    }

    let discountAmount = 0;
    const rawVal = parseFloat(discount.value) || 0;

    if (discount.type === DiscountType.PERCENTAGE) {
      discountAmount = (numericSubtotal * rawVal) / 100;
    } else if (discount.type === DiscountType.FIXED) {
      discountAmount = Math.min(numericSubtotal, rawVal);
    } else if (discount.type === DiscountType.SHIPPING) {
      discountAmount = rawVal || 15.0; // Flat shipping discount or free shipping
    }

    const finalTotal = Math.max(0, numericSubtotal - discountAmount);

    res.json({
      success: true,
      valid: true,
      code: discount.code,
      discountType: discount.type,
      discountValue: discount.value,
      discountAmount: Math.round(discountAmount * 100) / 100,
      newTotal: Math.round(finalTotal * 100) / 100,
      message: `Discount code ${discount.code} applied!`,
    });
  } catch (err) {
    next(err);
  }
}
