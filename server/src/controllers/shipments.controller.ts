import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import { FulfillmentStatus, ShipmentStatus } from '@prisma/client';

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
    const storeId = req.store!.id;
    const { orderId } = req.params;
    const { carrier, trackingNumber, notes } = fulfillOrderSchema.parse(req.body);

    const order = await prisma.order.findFirst({
      where: { id: orderId, storeId },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found for store' });
    }

    if (order.fulfillmentStatus === FulfillmentStatus.FULFILLED) {
      return res.status(400).json({ success: false, error: 'Order has already been fulfilled' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Order fulfillment status
      await tx.order.update({
        where: { id: order.id },
        data: {
          fulfillmentStatus: FulfillmentStatus.FULFILLED,
        },
      });

      // 2. Create Shipment Record
      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          storeId,
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
          toStatus: order.status,
          note: `Order fulfilled via ${carrier}. Tracking: ${trackingNumber}`,
        },
      });

      return shipment;
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
    const storeId = req.store!.id;
    const { id } = req.params;
    const { status, location, description } = updateShipmentSchema.parse(req.body);

    const shipment = await prisma.shipment.findFirst({
      where: { id, storeId },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'Shipment not found for store' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const isDelivered = status === ShipmentStatus.DELIVERED;

      const updatedShipment = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status,
          ...(isDelivered ? { deliveredAt: new Date() } : {}),
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

      return updatedShipment;
    });

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
    const storeId = req.store!.id;
    const shipments = await prisma.shipment.findMany({
      where: { storeId },
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
    const storeId = req.store!.id;

    // Scoped to the caller's store, so another merchant's shipment simply does
    // not match rather than being found and then checked.
    const shipment = await prisma.shipment.findFirst({
      where: { orderId, storeId },
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
