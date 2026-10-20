import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import { FulfillmentStatus, OrderStatus, ShipmentStatus } from '@prisma/client';
import { jobQueue } from '../jobs/jobQueue.js';

/**
 * The order lifecycle past payment.
 *
 * `OrderStatus` has no DELIVERED member, and `FULFILLED` is what the review
 * gate reads as "it arrived" (see reviews.controller.ts) -- so the two
 * transitions this file owns are:
 *
 *   handed to the carrier -> PROCESSING   (fulfillmentStatus FULFILLED,
 *                                          shipment IN_TRANSIT)
 *   carrier delivered it  -> FULFILLED    (shipment DELIVERED, deliveredAt)
 *
 * Neither of these happened before. Fulfilling an order moved only
 * `fulfillmentStatus` and wrote a history row whose from- and to-status were
 * the same value, and marking a shipment delivered touched nothing outside the
 * shipment table. So `OrderStatus.FULFILLED` was never reached by any path:
 * the admin SLA report counted every shipped order as late for ever, and no
 * buyer could ever review anything they had actually received.
 */

const fulfillOrderSchema = z.object({
  carrier: z.string().min(1, 'Carrier name is required'),
  trackingNumber: z.string().min(1, 'Tracking number is required'),
  notes: z.string().optional(),
});

const updateShipmentSchema = z.object({
  status: z.nativeEnum(ShipmentStatus),
  location: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
});

/**
 * Merchant: Fulfill Order & Add Tracking Details
 */
export async function fulfillOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { orderId } = req.params;
    const { carrier, trackingNumber, notes } = fulfillOrderSchema.parse(req.body);

    const order = await prisma.order.findFirst({
      where: { id: orderId, merchantId },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found for merchant' });
    }

    if (order.fulfillmentStatus === FulfillmentStatus.FULFILLED) {
      return res.status(400).json({ success: false, error: 'Order has already been fulfilled' });
    }

    /*
     * A cancelled or refunded order must not be shipped. The only guard here
     * was "not already fulfilled", so a merchant could hand a refunded order
     * to a carrier and the buyer would get a dispatch email for a parcel they
     * had already been paid back for.
     */
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) {
      return res.status(400).json({
        success: false,
        error: `This order is ${order.status.toLowerCase()} and cannot be fulfilled.`,
      });
    }

    // In motion, not arrived: the order only becomes FULFILLED when the
    // carrier reports the delivery in `updateShipmentStatus` below.
    const nextStatus =
      order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED
        ? OrderStatus.PROCESSING
        : order.status;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Order fulfillment status
      await tx.order.update({
        where: { id: order.id },
        data: {
          fulfillmentStatus: FulfillmentStatus.FULFILLED,
          status: nextStatus,
        },
      });

      // 2. Create Shipment Record
      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          merchantId,
          carrier,
          trackingNumber,
          status: ShipmentStatus.IN_TRANSIT,
          shippedAt: new Date(),
          notes,
          trackingEvents: {
            create: [
              {
                status: 'IN_TRANSIT',
                location: 'Fulfillment Center',
                description: `Package shipped via ${carrier} (Tracking: ${trackingNumber})`,
              },
            ],
          },
        },
        include: { trackingEvents: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: nextStatus,
          note: `Order fulfilled via ${carrier}. Tracking: ${trackingNumber}`,
        },
      });

      return shipment;
    });

    /*
     * Tell the buyer the parcel is on its way.
     *
     * `SEND_EMAIL_SHIPPING_UPDATE` had a job handler and a finished template
     * and was enqueued from nowhere at all, so dispatch was silent: a shopper
     * found out their order had shipped only by going back to the tracking
     * page and looking. Enqueued outside the transaction -- a mail provider
     * being down is not a reason to roll back a shipment that exists.
     */
    jobQueue.enqueue('SEND_EMAIL_SHIPPING_UPDATE', {
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      carrier,
      trackingNumber,
    });

    return res.status(201).json({
      success: true,
      message: 'Order fulfilled successfully',
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    next(error);
  }
}

/**
 * Merchant: Update Shipment Tracking Event
 */
export async function updateShipmentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;
    const { status, location, description } = updateShipmentSchema.parse(req.body);

    const shipment = await prisma.shipment.findFirst({
      where: { id, merchantId },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'Shipment not found for merchant' });
    }

    const order = await prisma.order.findUnique({ where: { id: shipment.orderId } });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found for shipment' });
    }

    const isDelivered = status === ShipmentStatus.DELIVERED;

    /*
     * Delivery is the one shipment status that closes the order.
     *
     * Only ever forwards: a shipment moved back to IN_TRANSIT or EXCEPTION
     * after a delivery does not un-deliver the parcel, and reopening the order
     * would withdraw a review the buyer is already entitled to leave. A parcel
     * that arrived and then went wrong is a return or a refund, and both of
     * those have their own path.
     */
    const closesOrder =
      isDelivered &&
      order.status !== OrderStatus.FULFILLED &&
      order.status !== OrderStatus.CANCELLED &&
      order.status !== OrderStatus.REFUNDED;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedShipment = await tx.shipment.update({
        where: { id: shipment.id },
        // `deliveredAt` is set once: a second DELIVERED update must not
        // rewrite the date the parcel actually arrived.
        data: {
          status,
          ...(isDelivered && !shipment.deliveredAt ? { deliveredAt: new Date() } : {}),
        },
      });

      await tx.trackingEvent.create({
        data: {
          shipmentId: shipment.id,
          status,
          location,
          description,
        },
      });

      if (closesOrder) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.FULFILLED, fulfillmentStatus: FulfillmentStatus.FULFILLED },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: OrderStatus.FULFILLED,
            note: location
              ? `Delivered by ${shipment.carrier} at ${location}`
              : `Delivered by ${shipment.carrier}`,
          },
        });
      }

      return updatedShipment;
    });

    // Once, on the update that actually closed the order, so a merchant
    // re-saving an already delivered shipment does not mail the buyer again.
    if (closesOrder) {
      jobQueue.enqueue('SEND_EMAIL_DELIVERED', {
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber,
      });
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    next(error);
  }
}

/**
 * Merchant: List Store Shipments
 */
export async function getShipments(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const shipments = await prisma.shipment.findMany({
      where: { merchantId },
      include: {
        order: { select: { id: true, orderNumber: true, customerName: true } },
        trackingEvents: { orderBy: { timestamp: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: shipments });
  } catch (error) {
    next(error);
  }
}

/**
 * Merchant: Get Order Shipment & Tracking Details
 */
export async function getOrderShipment(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId } = req.params;
    const merchantId = req.merchant!.id;

    // Scoped to the caller's store, so another merchant's shipment simply does
    // not match rather than being found and then checked.
    const shipment = await prisma.shipment.findFirst({
      where: { orderId, merchantId },
      include: {
        trackingEvents: { orderBy: { timestamp: 'desc' } },
      },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'No shipment tracking record found for order' });
    }

    return res.json({ success: true, data: shipment });
  } catch (error) {
    next(error);
  }
}
