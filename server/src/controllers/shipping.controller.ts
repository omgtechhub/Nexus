import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import { ShippingRateType } from '@prisma/client';
import { shippingOptionsFor, countryCode } from '../services/pricing/quote.service.js';

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
    const { country = '', subtotal = 0 } = req.body;

    const store = await prisma.store.findFirst({
      where: {
        OR: [{ id: storeSlug }, { domain: storeSlug }],
      },
    });

    if (!store) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    /**
     * Delegated to the pricing service, which is also what checkout uses.
     *
     * This had its own copy of the zone-matching and free-threshold logic, and
     * its own hardcoded "$15, free over $100" fallback — so the rate quoted
     * here and the rate charged at checkout were computed by different code
     * from different constants and could disagree.
     *
     * Two bugs went with the duplication. It matched a zone on
     * `country.toUpperCase()` against stored ISO codes, but checkout submits
     * a display name ("Nigeria"), so a zone never matched what the form sent.
     * And when no zone covered the destination it fell back to the *first*
     * zone — quoting Lagos rates to a shopper in Berlin.
     */
    const rates = await shippingOptionsFor(store.id, Number(subtotal) || 0, country);

    return res.json({
      success: true,
      data: {
        country: countryCode(country) || null,
        rates,
      },
    });
  } catch (error) {
    next(error);
  }
}
