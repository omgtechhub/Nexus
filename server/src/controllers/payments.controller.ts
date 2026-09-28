import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import { PaymentStatus, PaymentProvider, OrderStatus, PaymentStatus as PrismaPaymentStatus, InventoryMovementType } from '@prisma/client';
import { getPaymentProvider } from '../services/payments/payment.factory.js';

const initializePaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  provider: z.enum(['PAYSTACK', 'FLUTTERWAVE']).optional().default('PAYSTACK'),
  callbackUrl: z.string().url().optional(),
});

const refundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

/**
 * Initialize Payment for an Order
 * Calculates authoritative total server-side
 */
export async function initializePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId, provider, callbackUrl } = initializePaymentSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { store: { include: { settings: true } } },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.paymentStatus === PrismaPaymentStatus.PAID) {
      return res.status(400).json({ success: false, error: 'Order has already been paid' });
    }

    const providerEnum = (provider as PaymentProvider) || PaymentProvider.PAYSTACK;
    const reference = `ref_${order.id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8)}_${Date.now()}`;

    // Upsert Payment record in PENDING status
    const payment = await prisma.payment.create({
      data: {
        storeId: order.storeId,
        orderId: order.id,
        provider: providerEnum,
        providerReference: reference,
        amount: order.total, // Authoritative order total
        currency: order.currency || 'USD',
        status: PaymentStatus.PENDING,
        metadata: {
          customerName: order.customerName,
          customerEmail: order.customerEmail,
        },
      },
    });

    // Initialize with Payment Provider
    const paymentProvider = getPaymentProvider(providerEnum);
    const result = await paymentProvider.initializePayment({
      amount: order.total,
      currency: order.currency,
      email: order.customerEmail,
      reference,
      callbackUrl: callbackUrl || `${req.headers.origin || 'http://localhost:5173'}/#storefront`,
      customerName: order.customerName,
      metadata: { orderId: order.id, storeId: order.storeId },
    });

    return res.status(201).json({
      success: true,
      data: {
        paymentId: payment.id,
        reference: result.reference,
        authorizationUrl: result.authorizationUrl,
        accessCode: result.accessCode,
        amount: order.total,
        currency: order.currency,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    next(error);
  }
}

/**
 * Verify Payment Status Server-Side
 */
export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { reference } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { providerReference: reference },
      include: { order: { include: { items: true } }, store: true },
    });

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }

    // Idempotency check if already marked paid
    if (['SUCCESS', 'PAID', 'paid', 'success'].includes(payment.status as string)) {
      return res.json({
        success: true,
        message: 'Payment already verified and completed',
        data: {
          paymentStatus: payment.status,
          orderStatus: payment.order.status,
          orderNumber: payment.order.orderNumber,
        },
      });
    }

    const providerInstance = getPaymentProvider(payment.provider);
    const verifyResult = await providerInstance.verifyPayment(reference);

    if (verifyResult.success && (verifyResult.status === 'SUCCESS' || (verifyResult.status as string) === 'PAID')) {
      // Transition Payment & Order to PAID/SUCCESS atomically
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.SUCCESS },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: PrismaPaymentStatus.PAID,
            status: OrderStatus.CONFIRMED,
          },
        });

        await tx.transaction.create({
          data: {
            paymentId: payment.id,
            storeId: payment.storeId,
            type: 'CHARGE',
            amount: payment.amount,
            currency: payment.currency,
            status: 'SUCCESS',
            providerReference: reference,
            rawResponse: verifyResult.rawResponse ? (verifyResult.rawResponse as any) : undefined,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: payment.orderId,
            fromStatus: OrderStatus.PENDING,
            toStatus: OrderStatus.CONFIRMED,
            note: `Payment of $${payment.amount.toFixed(2)} verified via ${payment.provider}`,
          },
        });
      });

      try {
        const { jobQueue } = await import('../jobs/jobQueue.js');
        jobQueue.enqueue('SEND_EMAIL_PAYMENT_RECEIPT', {
          orderNumber: payment.order.orderNumber,
          customerEmail: payment.order.customerEmail,
          customerName: payment.order.customerName,
          total: payment.amount,
          currency: payment.currency,
          paymentReference: reference,
        });
      } catch (e) {
        // non-blocking
      }

      return res.json({
        success: true,
        message: 'Payment verified and order confirmed',
        data: {
          paymentStatus: 'SUCCESS',
          orderStatus: 'CONFIRMED',
          orderNumber: payment.order.orderNumber,
        },
      });
    } else {
      // Payment verification failed or cancelled
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: PrismaPaymentStatus.FAILED },
        });

        // Release inventory reservation if failed
        for (const item of payment.order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { inventoryQuantity: { increment: item.quantity } },
            });
          }
          const invItem = await tx.inventoryItem.findFirst({
            where: { storeId: payment.storeId, productId: item.productId },
          });
          if (invItem) {
            await tx.inventoryItem.update({
              where: { id: invItem.id },
              data: { availableStock: { increment: item.quantity } },
            });
            await tx.inventoryMovement.create({
              data: {
                storeId: payment.storeId,
                inventoryItemId: invItem.id,
                productId: item.productId,
                variantId: item.variantId || undefined,
                changeQuantity: item.quantity,
                newQuantity: invItem.availableStock + item.quantity,
                type: InventoryMovementType.ORDER_CANCELLED,
                reason: `Payment failed for order ${payment.order.orderNumber}`,
              },
            });
          }
        }
      });

      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        data: { paymentStatus: 'FAILED' },
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Merchant Refund Endpoint
 */
export async function refundOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { orderId } = req.params;
    const { amount, reason } = refundSchema.parse(req.body);

    const order = await prisma.order.findFirst({
      where: { id: orderId, storeId },
      include: { payments: { where: { status: PaymentStatus.SUCCESS } }, items: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found for store' });
    }

    if (order.paymentStatus !== PrismaPaymentStatus.PAID) {
      return res.status(400).json({ success: false, error: 'Order is not paid and cannot be refunded' });
    }

    const successfulPayment = order.payments[0];
    if (!successfulPayment) {
      return res.status(400).json({ success: false, error: 'No successful payment record found for order' });
    }

    const refundAmount = amount ? Math.min(amount, order.total) : order.total;
    const providerInstance = getPaymentProvider(successfulPayment.provider);

    const refundResult = await providerInstance.processRefund({
      transactionReference: successfulPayment.providerReference,
      amount: refundAmount,
      reason,
    });

    const isFullRefund = refundAmount >= order.total;

    await prisma.$transaction(async (tx) => {
      // Create Refund Record
      const refundRecord = await tx.refund.create({
        data: {
          paymentId: successfulPayment.id,
          orderId: order.id,
          storeId,
          amount: refundAmount,
          currency: order.currency,
          reason: reason || 'Merchant requested refund',
          status: 'SUCCESS',
          providerReference: refundResult.refundReference,
        },
      });

      await tx.transaction.create({
        data: {
          paymentId: successfulPayment.id,
          storeId,
          type: 'REFUND',
          amount: refundAmount,
          currency: order.currency,
          status: 'SUCCESS',
          providerReference: refundResult.refundReference,
          rawResponse: refundResult.rawResponse ? (refundResult.rawResponse as any) : undefined,
        },
      });

      // Update Order & Payment status
      await tx.payment.update({
        where: { id: successfulPayment.id },
        data: {
          status: isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: isFullRefund ? PrismaPaymentStatus.REFUNDED : PrismaPaymentStatus.PARTIALLY_REFUNDED,
          status: isFullRefund ? OrderStatus.REFUNDED : order.status,
        },
      });

      // Restore inventory stock atomically on full refund
      if (isFullRefund) {
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { inventoryQuantity: { increment: item.quantity } },
            });
          }
          const invItem = await tx.inventoryItem.findFirst({
            where: { storeId, productId: item.productId },
          });
          if (invItem) {
            await tx.inventoryItem.update({
              where: { id: invItem.id },
              data: { availableStock: { increment: item.quantity } },
            });
            await tx.inventoryMovement.create({
              data: {
                storeId,
                inventoryItemId: invItem.id,
                productId: item.productId,
                variantId: item.variantId || undefined,
                changeQuantity: item.quantity,
                newQuantity: invItem.availableStock + item.quantity,
                type: InventoryMovementType.RESTOCK,
                reason: `Refund issued for order ${order.orderNumber}`,
              },
            });
          }
        }
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: isFullRefund ? OrderStatus.REFUNDED : order.status,
          note: `Refund of $${refundAmount.toFixed(2)} processed`,
        },
      });

      return refundRecord;
    });

    return res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        amount: refundAmount,
        currency: order.currency,
        status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    next(error);
  }
}

/**
 * Merchant: List Store Payments
 */
export async function getPayments(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const payments = await prisma.payment.findMany({
      where: { storeId },
      include: {
        order: { select: { id: true, orderNumber: true, customerName: true, customerEmail: true } },
        transactions: { orderBy: { createdAt: 'desc' } },
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
}
