import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';

const addressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional(),
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().optional(),
  isDefault: z.boolean().default(true),
});

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  location: z.string().optional(),
  addresses: z.array(addressSchema).optional().default([]),
});

/**
 * The fields a merchant may change on one of its own customer records.
 *
 * This replaced `data: req.body` passed straight to `prisma.customer.update`.
 * Prisma rejects unknown keys, but every *known* column was writable, and the
 * Customer model carries two that are not the merchant's to set:
 *
 *   - `storeId` is the tenant boundary. `{"storeId": "<another store>"}` moved
 *     the customer and its addresses into somebody else's store — a write
 *     across the isolation line that every other handler in this file is
 *     careful to enforce on the read side.
 *   - `userId` links a customer row to a Nexus account. Pointing it at an
 *     arbitrary user id attached that shopper's portal view to records they
 *     never created.
 *
 * `totalOrders`, `totalSpent` and `lastOrderAt` are derived from real orders
 * and are likewise absent: they are reporting outputs, not inputs.
 *
 * `.strict()` so an unexpected key is a 400 that names itself, rather than
 * being silently dropped and leaving the caller thinking it took effect.
 */
const updateCustomerSchema = z
  .object({
    name: z.string().min(1, 'Name is required').optional(),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    avatar: z.string().nullable().optional(),
  })
  .strict();

export async function getCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { q, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { storeId };

    if (q) {
      where.OR = [
        { name: { contains: q as string, mode: 'insensitive' } },
        { email: { contains: q as string, mode: 'insensitive' } },
        { phone: { contains: q as string, mode: 'insensitive' } },
        { location: { contains: q as string, mode: 'insensitive' } },
      ];
    }

    const [totalCount, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { addresses: true },
      }),
    ]);

    res.json({
      success: true,
      data: customers,
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

export async function getCustomerById(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { id, storeId },
      include: {
        addresses: true,
        orders: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const body = createCustomerSchema.parse(req.body);

    const existing = await prisma.customer.findFirst({
      where: { storeId, email: body.email.toLowerCase().trim() },
    });

    if (existing) {
      res.status(400).json({ success: false, error: 'A customer with this email address already exists.' });
      return;
    }

    const customer = await prisma.customer.create({
      data: {
        storeId,
        name: body.name.trim(),
        email: body.email.toLowerCase().trim(),
        phone: body.phone,
        location: body.location,
        addresses: {
          create: body.addresses,
        },
      },
      include: { addresses: true },
    });

    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;

    const existing = await prisma.customer.findFirst({
      where: { id, storeId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    const body = updateCustomerSchema.parse(req.body);

    // Normalised the same way `createCustomer` does, so the two paths cannot
    // disagree about what is stored — and so the `@@unique([storeId, email])`
    // constraint sees the same casing on both.
    const data: Record<string, unknown> = { ...body };
    if (body.email !== undefined) data.email = body.email.toLowerCase().trim();
    if (body.name !== undefined) data.name = body.name.trim();

    const updated = await prisma.customer.update({
      where: { id },
      data,
      include: { addresses: true },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;

    const existing = await prisma.customer.findFirst({
      where: { id, storeId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    await prisma.customer.delete({ where: { id } });
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    next(err);
  }
}
