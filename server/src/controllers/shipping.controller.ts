import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import { ShippingRateType } from '@prisma/client';

const shippingMethodSchema = z.object({
  name: z.string().min(1, 'Method name is required'),
  description: z.string().optional(),
  rateType: z.nativeEnum(ShippingRateType).default(ShippingRateType.FLAT_RATE),
  price: z.number().min(0),
  freeThreshold: z.number().optional(),
  estimatedDays: z.string().optional(),
});

const createZoneSchema = z.object({
  name: z.string().min(1, 'Zone name is required'),
  countries: z.array(z.string()).min(1, 'At least one country is required'),
  methods: z.array(shippingMethodSchema).optional().default([]),
});

/**
 * Merchant: Get Shipping Zones for Store
 */
export async function getShippingZones(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const zones = await prisma.shippingZone.findMany({
      where: { storeId },
      include: { methods: true },
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ success: true, data: zones });
  } catch (error) {
    next(error);
  }
}

/**
 * Merchant: Create Shipping Zone with Methods
 */
export async function createShippingZone(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { name, countries, methods } = createZoneSchema.parse(req.body);

    const zone = await prisma.shippingZone.create({
      data: {
        storeId,
        name,
        countries: countries as any,
        methods: {
          create: methods.map((m) => ({
            storeId,
            name: m.name,
            description: m.description,
            rateType: m.rateType,
            price: m.price,
            freeThreshold: m.freeThreshold,
            estimatedDays: m.estimatedDays,
          })),
        },
      },
      include: { methods: true },
    });

    return res.status(201).json({ success: true, data: zone });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    next(error);
  }
}

/**
 * Merchant: Delete Shipping Zone
 */
export async function deleteShippingZone(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;

    const existing = await prisma.shippingZone.findFirst({ where: { id, storeId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Shipping zone not found' });
    }

    await prisma.shippingZone.delete({ where: { id } });
    return res.json({ success: true, message: 'Shipping zone deleted' });
  } catch (error) {
    next(error);
  }
}

/**
 * Public/Storefront: Calculate Server Shipping Rates for Destination Country
 */
export async function calculateShippingRates(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeSlug } = req.params;
    const { country = 'US', subtotal = 0 } = req.body;

    const store = await prisma.store.findFirst({
      where: {
        OR: [{ id: storeSlug }, { domain: storeSlug }],
      },
    });

    if (!store) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    const zones = await prisma.shippingZone.findMany({
      where: { storeId: store.id },
      include: { methods: true },
    });

    // Find matching zone for country or default to first zone
    let matchingZone = zones.find((z) => {
      const countries = Array.isArray(z.countries) ? (z.countries as string[]) : [];
      return countries.includes(country.toUpperCase()) || countries.includes('*');
    });

    if (!matchingZone && zones.length > 0) {
      matchingZone = zones[0];
    }

    const methods = matchingZone ? matchingZone.methods : [];
    const calculatedRates = methods.map((m) => {
      let finalPrice = m.price;
      if (m.freeThreshold && subtotal >= m.freeThreshold) {
        finalPrice = 0;
      }
      return {
        id: m.id,
        name: m.name,
        description: m.description,
        price: finalPrice,
        estimatedDays: m.estimatedDays,
        isFree: finalPrice === 0,
      };
    });

    // Fallback standard rate if no methods configured
    if (calculatedRates.length === 0) {
      calculatedRates.push({
        id: 'std_default',
        name: 'Standard Delivery',
        description: 'Standard carrier ground shipping',
        price: subtotal >= 100 ? 0 : 15.0,
        estimatedDays: '3-5 business days',
        isFree: subtotal >= 100,
      });
    }

    return res.json({
      success: true,
      data: {
        zoneName: matchingZone?.name || 'Standard Zone',
        rates: calculatedRates,
      },
    });
  } catch (error) {
    next(error);
  }
}
