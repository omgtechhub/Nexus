import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { currencyCodeOf } from '../config/currency.js';
import { z } from 'zod';
import { OrderStatus, PaymentStatus, FulfillmentStatus, InventoryMovementType, OrderAddressType } from '@prisma/client';

const orderAddressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().optional(),
});

const orderItemInputSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1),
});

const createOrderSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least 1 item'),
  shippingAddress: orderAddressSchema,
  notes: z.string().optional(),
  tax: z.number().optional().default(0),
  shipping: z.number().optional().default(0),
  discount: z.number().optional().default(0),
  discountCode: z.string().optional(),
});

export async function getOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { q, status, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { merchantId };

    if (q) {
      where.OR = [
        { orderNumber: { contains: q as string, mode: 'insensitive' } },
        { customerName: { contains: q as string, mode: 'insensitive' } },
        { customerEmail: { contains: q as string, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      where.status = (status as string).toUpperCase() as OrderStatus;
    }

    const [totalCount, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: { select: { id: true, title: true, images: true } },
            },
          },
          addresses: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
          customer: true,
        },
      }),
    ]);

    const formatted = orders.map(o => {
      const shipAddr = o.addresses.find(a => a.type === OrderAddressType.SHIPPING);
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customer: o.customer || {
          id: `c_legacy_${o.id}`,
          name: o.customerName,
          email: o.customerEmail,
          phone: o.customerPhone || undefined,
          totalOrders: 1,
          totalSpent: o.total,
          createdAt: o.createdAt,
        },
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        items: o.items.map(item => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          title: item.productTitle,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          sku: item.sku,
          image: (item.product?.images as any)?.[0]?.url || undefined,
        })),
        status: o.status.toLowerCase(),
        paymentStatus: o.paymentStatus.toLowerCase(),
        fulfillmentStatus: o.fulfillmentStatus.toLowerCase(),
        subtotal: o.subtotal,
        tax: o.tax,
        shipping: o.shipping,
        discount: o.discount,
        discountCode: o.discountCode || undefined,
        total: o.total,
        currency: o.currency,
        notes: o.notes || undefined,
        shippingAddress: shipAddr ? {
          firstName: shipAddr.firstName,
          lastName: shipAddr.lastName,
          address1: shipAddr.address1,
          address2: shipAddr.address2 || undefined,
          city: shipAddr.city,
          state: shipAddr.state,
          zip: shipAddr.zip,
          country: shipAddr.country,
        } : {},
        statusHistory: o.statusHistory,
        createdAt: o.createdAt,
      };
    });

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

export async function getOrderById(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { id, merchantId },
      include: {
        items: { include: { product: true, variant: true } },
        addresses: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        customer: true,
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

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const body = createOrderSchema.parse(req.body);

    const email = body.customerEmail.toLowerCase().trim();

    // 1. Server-side product & price & stock validation
    const lineItemDetails: Array<{
      productId: string;
      variantId?: string;
      productTitle: string;
      variantTitle?: string;
      sku: string;
      quantity: number;
      price: number;
      total: number;
      inventoryItemId: string;
      currentStock: number;
    }> = [];

    let computedSubtotal = 0;

    for (const item of body.items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, merchantId },
        include: { variants: true },
      });

      if (!product) {
        res.status(400).json({ success: false, error: `Product ID ${item.productId} not found in merchant.` });
        return;
      }

      let price = product.price;
      let sku = product.sku;
      let variantTitle: string | undefined = undefined;

      if (item.variantId) {
        const variant = product.variants.find(v => v.id === item.variantId);
        if (!variant) {
          res.status(400).json({ success: false, error: `Variant ID ${item.variantId} not found.` });
          return;
        }
        price = variant.price;
        sku = variant.sku;
        variantTitle = variant.title;
      }

      const invItem = await prisma.inventoryItem.findFirst({
        where: {
          merchantId,
          productId: product.id,
          ...(item.variantId ? { variantId: item.variantId } : {}),
        },
      });

      if (!invItem || invItem.availableStock < item.quantity) {
        const available = invItem ? invItem.availableStock : 0;
        res.status(400).json({
          success: false,
          error: `Insufficient stock for item "${product.title}". Requested: ${item.quantity}, Available: ${available}.`,
        });
        return;
      }

      const lineTotal = price * item.quantity;
      computedSubtotal += lineTotal;

      lineItemDetails.push({
        productId: product.id,
        variantId: item.variantId,
        productTitle: product.title,
        variantTitle,
        sku,
        quantity: item.quantity,
        price,
        total: lineTotal,
        inventoryItemId: invItem.id,
        currentStock: invItem.stock,
      });
    }

    // 2. Validate Discount Code if provided
    let calculatedDiscount = body.discount || 0;
    let appliedCode: string | undefined = undefined;

    if (body.discountCode) {
      const cleanCode = body.discountCode.toUpperCase().trim();
      const disc = await prisma.discount.findUnique({
        where: { merchantId_code: { merchantId, code: cleanCode } },
      });

      if (disc && disc.status === 'ACTIVE' && disc.redemptions < disc.maxRedemptions) {
        if (disc.type === 'PERCENTAGE') {
          calculatedDiscount = (computedSubtotal * parseFloat(disc.value)) / 100;
        } else if (disc.type === 'FIXED') {
          calculatedDiscount = Math.min(computedSubtotal, parseFloat(disc.value));
        } else if (disc.type === 'SHIPPING') {
          calculatedDiscount = body.shipping || 15.0;
        }
        appliedCode = disc.code;

        // Increment redemption count
        await prisma.discount.update({
          where: { id: disc.id },
          data: { redemptions: { increment: 1 } },
        });
      }
    }

    const computedTotal = Math.max(0, computedSubtotal + body.tax + body.shipping - calculatedDiscount);
    const orderNumber = `#NX-${Math.floor(4000 + Math.random() * 5000)}`;

    // 3. Atomic transaction creation
    const result = await prisma.$transaction(async (tx) => {
      // Find or create customer
      let customer = await tx.customer.findFirst({
        where: { merchantId, email },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            merchantId,
            name: body.customerName.trim(),
            email,
            phone: body.customerPhone,
            location: `${body.shippingAddress.city}, ${body.shippingAddress.state}`,
            totalOrders: 0,
            totalSpent: 0,
          },
        });
      }

      // Create Order
      const order = await tx.order.create({
        data: {
          merchantId,
          orderNumber,
          customerId: customer.id,
          customerName: body.customerName.trim(),
          customerEmail: email,
          customerPhone: body.customerPhone,
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          subtotal: computedSubtotal,
          tax: body.tax,
          shipping: body.shipping,
          discount: calculatedDiscount,
          discountCode: appliedCode,
          total: computedTotal,
          // The store's own trading currency, not a hardcoded USD. A manual
          // order was stamped USD regardless of what the store sells in, so a
          // naira merchant's phone order was recorded in dollars.
          currency: currencyCodeOf(req.merchant!.currency),
          notes: body.notes,
          items: {
            create: lineItemDetails.map(l => ({
              productId: l.productId,
              variantId: l.variantId,
              productTitle: l.productTitle,
              variantTitle: l.variantTitle,
              sku: l.sku,
              quantity: l.quantity,
              price: l.price,
              total: l.total,
            })),
          },
          addresses: {
            create: [
              {
                type: OrderAddressType.SHIPPING,
                firstName: body.shippingAddress.firstName,
                lastName: body.shippingAddress.lastName,
                address1: body.shippingAddress.address1,
                address2: body.shippingAddress.address2,
                city: body.shippingAddress.city,
                state: body.shippingAddress.state,
                zip: body.shippingAddress.zip,
                country: body.shippingAddress.country,
                phone: body.shippingAddress.phone,
              },
            ],
          },
          statusHistory: {
            create: [
              {
                fromStatus: OrderStatus.PENDING,
                toStatus: OrderStatus.CONFIRMED,
                note: 'Order confirmed and inventory reserved',
              },
            ],
          },
        },
      });

      // Decrement Inventory & Record Movements
      for (const item of lineItemDetails) {
        const newStock = item.currentStock - item.quantity;
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: {
            stock: newStock,
            availableStock: Math.max(0, newStock),
          },
        });

        await tx.inventoryMovement.create({
          data: {
            merchantId,
            inventoryItemId: item.inventoryItemId,
            productId: item.productId,
            variantId: item.variantId,
            changeQuantity: -item.quantity,
            newQuantity: newStock,
            type: InventoryMovementType.ORDER_PLACED,
            reason: `Order ${orderNumber} placed`,
            referenceId: order.id,
          },
        });

        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { inventoryQuantity: newStock },
          });
        }
      }

      // Update Customer Stats
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalOrders: { increment: 1 },
          totalSpent: { increment: computedTotal },
          lastOrderAt: new Date(),
        },
      });

      // Emit Notification for Store Owner
      const merchantOwner = await tx.merchant.findUnique({
        where: { id: merchantId },
        select: { ownerId: true },
      });

      if (merchantOwner) {
        await tx.notification.create({
          data: {
            merchantId,
            userId: merchantOwner.ownerId,
            type: 'SUCCESS',
            title: `New Order ${orderNumber}`,
            message: `Order received for $${computedTotal.toFixed(2)} from ${body.customerName.trim()}`,
            link: '/orders',
          },
        });
      }

      return order;
    });

    // Enqueue transactional email job & low-stock check job asynchronously
    try {
      const { jobQueue } = await import('../jobs/jobQueue.js');
      jobQueue.enqueue('SEND_EMAIL_ORDER_CONFIRMATION', {
        orderNumber: result.orderNumber,
        customerEmail: result.customerEmail,
        customerName: result.customerName,
        total: result.total,
        currency: result.currency,
        items: lineItemDetails.map(i => ({ productTitle: i.productTitle, quantity: i.quantity, price: i.price })),
      });
      jobQueue.enqueue('CHECK_LOW_STOCK', { merchantId });
    } catch (e) {
      // non-blocking
    }

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;
    const { status, paymentStatus, fulfillmentStatus, notes } = req.body;

    const existing = await prisma.order.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const newStatus = status ? (status.toUpperCase() as OrderStatus) : existing.status;

    const updated = await prisma.$transaction(async (tx) => {
      if (newStatus !== existing.status) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: existing.id,
            fromStatus: existing.status,
            toStatus: newStatus,
            note: 'Order status updated',
          },
        });
      }

      return tx.order.update({
        where: { id },
        data: {
          status: newStatus,
          ...(paymentStatus ? { paymentStatus: paymentStatus.toUpperCase() as PaymentStatus } : {}),
          ...(fulfillmentStatus ? { fulfillmentStatus: fulfillmentStatus.toUpperCase() as FulfillmentStatus } : {}),
          ...(notes !== undefined ? { notes } : {}),
        },
        include: { items: true, statusHistory: true },
      });
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function cancelOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { id, merchantId },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    if (order.status === OrderStatus.CANCELLED) {
      res.status(400).json({ success: false, error: 'Order is already cancelled' });
      return;
    }

    const cancelledOrder = await prisma.$transaction(async (tx) => {
      // 1. Update Order status
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: req.body.reason || 'Cancelled by merchant',
        },
      });

      // 2. Status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELLED,
          note: req.body.reason || 'Order cancelled',
        },
      });

      // 3. Restore inventory stock for all line items
      for (const item of order.items) {
        const invItem = await tx.inventoryItem.findFirst({
          where: {
            merchantId,
            productId: item.productId,
            ...(item.variantId ? { variantId: item.variantId } : {}),
          },
        });

        if (invItem) {
          const restoredStock = invItem.stock + item.quantity;

          await tx.inventoryItem.update({
            where: { id: invItem.id },
            data: {
              stock: restoredStock,
              availableStock: restoredStock,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              merchantId,
              inventoryItemId: invItem.id,
              productId: item.productId,
              variantId: item.variantId,
              changeQuantity: item.quantity,
              newQuantity: restoredStock,
              type: InventoryMovementType.ORDER_CANCELLED,
              reason: `Stock restored from cancelled order ${order.orderNumber}`,
              referenceId: order.id,
            },
          });

          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { inventoryQuantity: restoredStock },
            });
          }
        }
      }

      return updated;
    });

    res.json({ success: true, message: `Order ${order.orderNumber} cancelled and inventory restored.`, data: cancelledOrder });
  } catch (err) {
    next(err);
  }
}
