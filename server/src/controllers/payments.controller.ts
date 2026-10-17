import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { z } from 'zod';
import { PaymentStatus, PaymentProvider, OrderStatus, PaymentStatus as PrismaPaymentStatus, InventoryMovementType } from '@prisma/client';
import { getPaymentProvider } from '../services/payments/payment.factory.js';
import { PaymentGatewayError, PaymentNotConfiguredError } from '../services/payments/errors.js';
import { formatMoney } from '../services/email/email.service.js';
import { recordCommissionForPayment } from '../services/payouts/payout.service.js';
import { defaultCurrencyCode } from '../config/currency.js';

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

    /**
     * Prove the caller is the person who placed this order.
     *
     * The endpoint has to stay open — a guest checkout has no account, and
     * this is the step straight after placing the order — but it took nothing
     * except an `orderId`. Anyone who learned or guessed one could mint
     * payment rows against a stranger's order and read back its total and
     * gateway URL, and every call left another PENDING row behind.
     *
     * Two ways to satisfy it: be signed in as the customer the order belongs
     * to, or quote the email address the order was placed with. A guest knows
     * their own email; someone holding only a stray order id does not.
     */
    const signedInEmail = req.user?.email?.toLowerCase();
    const claimedEmail = typeof req.body?.customerEmail === 'string'
      ? req.body.customerEmail.toLowerCase().trim()
      : undefined;
    const orderEmail = order.customerEmail.toLowerCase();

    if (signedInEmail !== orderEmail && claimedEmail !== orderEmail) {
      // Deliberately the same shape as "not found": confirming that an id
      // exists but belongs to someone else is itself the leak.
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.paymentStatus === PrismaPaymentStatus.PAID) {
      return res.status(400).json({ success: false, error: 'Order has already been paid' });
    }

    /**
     * Reuse a payment attempt that is still live rather than minting another.
     *
     * Each call created a fresh reference and a fresh PENDING row, so a
     * shopper who pressed Pay twice left orphans behind for ever — and the
     * endpoint was an unauthenticated way to grow the table without bound.
     */
    const existing = await prisma.payment.findFirst({
      where: {
        orderId: order.id,
        status: PaymentStatus.PENDING,
        provider: (provider as PaymentProvider) || PaymentProvider.PAYSTACK,
        createdAt: { gt: new Date(Date.now() - 30 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing && (existing.metadata as any)?.authorizationUrl) {
      return res.status(200).json({
        success: true,
        data: {
          paymentId: existing.id,
          reference: existing.providerReference,
          authorizationUrl: (existing.metadata as any).authorizationUrl,
          amount: existing.amount,
          currency: existing.currency,
          simulated: (existing.metadata as any)?.simulated === true,
          reused: true,
        },
      });
    }

    const providerEnum = (provider as PaymentProvider) || PaymentProvider.PAYSTACK;
    const reference = `ref_${order.id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8)}_${Date.now()}`;

    // Resolve the provider before writing anything. An unconfigured gateway is
    // a 503, not a PENDING payment row that can never be completed.
    let paymentProvider;
    try {
      paymentProvider = getPaymentProvider(providerEnum);
    } catch (err) {
      if (err instanceof PaymentNotConfiguredError) {
        return res.status(503).json({ success: false, error: err.message, code: err.code });
      }
      throw err;
    }

    // Upsert Payment record in PENDING status
    const payment = await prisma.payment.create({
      data: {
        storeId: order.storeId,
        orderId: order.id,
        provider: providerEnum,
        providerReference: reference,
        amount: order.total, // Authoritative order total
        currency: order.currency || defaultCurrencyCode(),
        status: PaymentStatus.PENDING,
        metadata: {
          customerName: order.customerName,
          customerEmail: order.customerEmail,
        },
      },
    });

    let result;
    try {
      result = await paymentProvider.initializePayment({
        amount: order.total,
        currency: order.currency,
        email: order.customerEmail,
        reference,
        callbackUrl:
          callbackUrl || `${req.headers.origin || 'http://localhost:5173'}/checkout/complete`,
        customerName: order.customerName,
        metadata: { orderId: order.id, storeId: order.storeId },
      });
    } catch (err) {
      // The payment row is marked FAILED rather than left PENDING forever, and
      // the order stays unpaid. Nothing here may report a success.
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      if (err instanceof PaymentNotConfiguredError) {
        return res.status(503).json({ success: false, error: err.message, code: err.code });
      }
      if (err instanceof PaymentGatewayError) {
        return res.status(502).json({ success: false, error: err.message, code: err.code });
      }
      throw err;
    }

    // Recorded so a repeated Pay click can be handed the same gateway session
    // instead of minting another reference and another PENDING row.
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        metadata: {
          ...((payment.metadata as any) || {}),
          authorizationUrl: result.authorizationUrl,
          simulated: paymentProvider.isLive === false,
        },
      },
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
        // Carried all the way to the confirmation page, which must not present
        // a simulated payment as a confirmed one.
        simulated: paymentProvider.isLive === false,
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
          simulated: (payment.metadata as any)?.simulated === true,
        },
      });
    }

    /**
     * A settled failure is just as final as a settled success.
     *
     * This endpoint is unauthenticated — it has to be, because it is where the
     * gateway returns a customer whose session may have lapsed — and the
     * failure branch below increments every order line's stock back. Only
     * SUCCESS was treated as terminal, so a FAILED payment fell through on
     * every subsequent call, asked the gateway again, got the same "failed",
     * and released the same inventory a second time. Repeating the request
     * inflated stock without bound: an order for 5 units could be turned into
     * hundreds of phantom units by anyone holding the reference.
     *
     * The release happens exactly once, on the transition into FAILED. After
     * that this reports the stored outcome and touches nothing.
     */
    if (['FAILED', 'failed', 'CANCELLED', 'cancelled'].includes(payment.status as string)) {
      return res.status(400).json({
        success: false,
        error: 'Payment did not complete',
        data: {
          paymentStatus: payment.status,
          orderStatus: payment.order.status,
          orderNumber: payment.order.orderNumber,
          simulated: (payment.metadata as any)?.simulated === true,
        },
      });
    }

    let providerInstance;
    let verifyResult;
    try {
      providerInstance = getPaymentProvider(payment.provider);
      verifyResult = await providerInstance.verifyPayment(reference);
    } catch (err) {
      /**
       * Not being able to ask the gateway is not the same as a payment having
       * succeeded, and this endpoint is the authority for marking an order
       * paid. The old provider swallowed exactly these errors and returned
       * `status: 'SUCCESS'`, which is how an order reached "Payment confirmed"
       * with no money taken.
       */
      if (err instanceof PaymentNotConfiguredError) {
        return res.status(503).json({ success: false, error: err.message, code: err.code });
      }
      if (err instanceof PaymentGatewayError) {
        return res.status(502).json({ success: false, error: err.message, code: err.code });
      }
      throw err;
    }

    const simulated = providerInstance.isLive === false;

    if (verifyResult.success && (verifyResult.status === 'SUCCESS' || (verifyResult.status as string) === 'PAID')) {
      // Transition Payment & Order to PAID/SUCCESS atomically
      let alreadySettled = false;
      await prisma.$transaction(async (tx) => {
        // Claimed the same way as the failure branch: two concurrent returns
        // from the gateway would otherwise each write a CHARGE row into the
        // ledger and each enqueue a receipt, double-counting the revenue.
        const claimed = await tx.payment.updateMany({
          where: { id: payment.id, status: PaymentStatus.PENDING },
          data: {
            status: PaymentStatus.SUCCESS,
            metadata: {
              ...((payment.metadata as any) || {}),
              simulated,
              verifiedAt: new Date().toISOString(),
            },
          },
        });

        if (claimed.count !== 1) {
          alreadySettled = true;
          return;
        }

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
            // Was a hardcoded dollar sign on a platform billing in naira.
            note: `Payment of ${formatMoney(payment.amount, payment.currency)} verified via ${payment.provider}`,
          },
        });

        // The merchant's share, fixed at settlement — the same split the
        // webhook path records, so an order settled either way counts toward
        // the payout balance identically.
        await recordCommissionForPayment(payment.id, tx);
      });

      // Only the request that actually settled the payment sends the receipt.
      if (!alreadySettled) {
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
      }

      return res.json({
        success: true,
        message: simulated
          ? 'Simulated payment recorded — no money was taken'
          : 'Payment verified and order confirmed',
        data: {
          paymentStatus: 'SUCCESS',
          orderStatus: 'CONFIRMED',
          orderNumber: payment.order.orderNumber,
          simulated,
        },
      });
    } else if (verifyResult.status === 'PENDING') {
      /**
       * Still in flight. Nothing is mutated: the customer may well be on the
       * gateway's card form right now.
       *
       * This branch did not exist — a PENDING verdict fell into the failure
       * path below, which marks the order FAILED and increments every line's
       * stock back. Polling an unfinished payment therefore released
       * inventory that was still legitimately reserved, and a payment that
       * completed a moment later landed on an order already marked failed.
       */
      return res.json({
        success: true,
        message: 'Payment is still pending with the provider',
        data: {
          paymentStatus: 'PENDING',
          orderStatus: payment.order.status,
          orderNumber: payment.order.orderNumber,
          simulated,
        },
      });
    } else {
      // Payment verification failed or cancelled
      await prisma.$transaction(async (tx) => {
        /**
         * Claim the transition before releasing anything.
         *
         * The guard above stops a *sequential* repeat from releasing stock
         * twice, but two concurrent requests can both read PENDING before
         * either writes. `updateMany` with the status in the predicate makes
         * the second one match zero rows, so only the request that actually
         * moved the payment into FAILED goes on to return the inventory.
         */
        const claimed = await tx.payment.updateMany({
          where: { id: payment.id, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.FAILED },
        });

        if (claimed.count !== 1) return;

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
        data: {
          paymentStatus: 'FAILED',
          orderStatus: 'PENDING',
          orderNumber: payment.order.orderNumber,
          gatewayResponse: verifyResult.gatewayResponse,
          simulated,
        },
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
