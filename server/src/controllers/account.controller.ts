import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import { OrderAddressType } from '@prisma/client';

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

const addressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().min(1),
  isDefault: z.boolean().optional().default(false),
});

/**
 * GET /api/account/profile
 * Returns authenticated customer profile
 */
export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User profile not found' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/account/profile
 * Updates authenticated customer profile
 */
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const body = updateProfileSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: body,
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, message: 'Profile updated successfully', data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/account/orders
 * Returns customer's own order history isolated by email/userId
 */
export async function getCustomerOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const email = req.user!.email.toLowerCase();

    // Prefer the Customer.userId link, which survives an email change; fall
    // back to the email so guest orders placed before sign-up still appear
    // until linkCustomerProfiles claims them.
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customer: { userId } },
          { customerEmail: { equals: email, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: { select: { id: true, title: true, images: true } },
          },
        },
        addresses: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        merchant: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/account/orders/:id
 * IDOR-protected single order lookup enforcing ownership check
 */
export async function getCustomerOrderById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const email = req.user!.email.toLowerCase();

    // Ownership is part of the query, not a check afterwards: an order that
    // isn't this user's simply doesn't match, so there is no path to an IDOR.
    const order = await prisma.order.findFirst({
      where: {
        id,
        OR: [
          { customer: { userId } },
          { customerEmail: { equals: email, mode: 'insensitive' } },
        ],
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, title: true, images: true } },
          },
        },
        addresses: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        merchant: { select: { id: true, name: true } },
      },
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/account/addresses
 */
export async function getCustomerAddresses(req: Request, res: Response, next: NextFunction) {
  try {
    const email = req.user!.email.toLowerCase();
    const customer = await prisma.customer.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { addresses: true },
    });

    res.json({ success: true, data: customer?.addresses || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/account/addresses
 */
export async function createCustomerAddress(req: Request, res: Response, next: NextFunction) {
  try {
    const body = addressSchema.parse(req.body);
    const email = req.user!.email.toLowerCase();

    let customer = await prisma.customer.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!customer) {
      const merchant = await prisma.merchant.findFirst();
      if (!merchant) {
        res.status(400).json({ success: false, error: 'No merchant available' });
        return;
      }
      customer = await prisma.customer.create({
        data: {
          merchantId: merchant.id,
          name: req.user!.name,
          email: req.user!.email,
        },
      });
    }

    const created = await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        firstName: body.firstName,
        lastName: body.lastName,
        address1: body.address1,
        address2: body.address2 || null,
        city: body.city,
        state: body.state,
        zip: body.zip,
        country: body.country,
        isDefault: body.isDefault,
      },
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/account/addresses/:id
 */
export async function deleteCustomerAddress(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const email = req.user!.email.toLowerCase();

    const address = await prisma.customerAddress.findFirst({
      where: {
        id,
        customer: { email: { equals: email, mode: 'insensitive' } },
      },
    });

    if (!address) {
      res.status(404).json({ success: false, error: 'Address not found or access denied' });
      return;
    }

    await prisma.customerAddress.delete({ where: { id } });

    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (err) {
    next(err);
  }
}
