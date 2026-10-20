import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import { emailService } from '../services/email/email.service.js';
import { logger } from '../utils/logger.js';

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
 *   - `merchantId` is the tenant boundary. `{"merchantId": "<another store>"}` moved
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
    const merchantId = req.merchant!.id;
    const { q, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { merchantId };

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
    const merchantId = req.merchant!.id;
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { id, merchantId },
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
    const merchantId = req.merchant!.id;
    const body = createCustomerSchema.parse(req.body);

    const existing = await prisma.customer.findFirst({
      where: { merchantId, email: body.email.toLowerCase().trim() },
    });

    if (existing) {
      res.status(400).json({ success: false, error: 'A customer with this email address already exists.' });
      return;
    }

    const customer = await prisma.customer.create({
      data: {
        merchantId,
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
    const merchantId = req.merchant!.id;
    const { id } = req.params;

    const existing = await prisma.customer.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    const body = updateCustomerSchema.parse(req.body);

    // Normalised the same way `createCustomer` does, so the two paths cannot
    // disagree about what is stored — and so the `@@unique([merchantId, email])`
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
    const merchantId = req.merchant!.id;
    const { id } = req.params;

    const existing = await prisma.customer.findFirst({
      where: { id, merchantId },
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

const customerEmailSchema = z.object({
  subject: z.string().trim().min(1, 'A subject is required').max(200),
  body: z.string().trim().min(1, 'A message is required').max(5000),
}).strict();

/**
 * A merchant writing to one of their own customers.
 *
 * The dashboard's compose window used to close and report "Email sent to
 * <address>!" having sent nothing. A merchant would believe a customer had
 * been answered.
 *
 * The recipient is NOT taken from the request. It is read from the customer
 * row, scoped to the merchant making the call, so this endpoint can only ever
 * mail someone who already bought from them -- the difference between a
 * messaging feature and an open relay with a login.
 */
export async function emailCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;

    const parsed = customerEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid message' });
      return;
    }

    const customer = await prisma.customer.findFirst({
      where: { id, merchantId },
      select: { email: true, name: true },
    });

    if (!customer?.email) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    const delivered = await emailService.sendMerchantMessage({
      to: customer.email,
      customerName: customer.name?.trim() || 'there',
      merchantName: req.merchant!.name,
      subject: parsed.data.subject,
      body: parsed.data.body,
    });

    if (!delivered) {
      logger.error({ msg: 'Merchant message was not accepted by the mail transport', merchantId });
      res.status(502).json({
        success: false,
        error: 'That did not send. Your mail transport rejected it — nothing was delivered.',
      });
      return;
    }

    res.status(202).json({ success: true, data: { to: customer.email } });
  } catch (err) {
    next(err);
  }
}
