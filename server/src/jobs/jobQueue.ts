import { logger } from '../utils/logger.js';
import { prisma } from '../prisma.js';
import { emailService } from '../services/email/email.service.js';
import {
  NotificationType,
  SubscriptionStatus,
  OrderStatus,
  PaymentStatus as PrismaPaymentStatus,
  InventoryMovementType,
} from '@prisma/client';

export type JobType =
  | 'SEND_EMAIL_ORDER_CONFIRMATION'
  | 'SEND_EMAIL_PAYMENT_RECEIPT'
  | 'SEND_EMAIL_SHIPPING_UPDATE'
  | 'CHECK_LOW_STOCK'
  | 'PROCESS_SUBSCRIPTION_RENEWALS'
  | 'PROCESS_GRACE_PERIODS'
  | 'EXPIRE_ABANDONED_ORDERS';

export interface JobPayload {
  type: JobType;
  data?: any;
}

class JobQueue {
  private queue: JobPayload[] = [];
  private processing = false;

  enqueue(type: JobType, data?: any) {
    this.queue.push({ type, data });
    logger.info({ msg: `Job enqueued: ${type}` });
    setImmediate(() => this.processNext());
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const job = this.queue.shift();
    if (!job) {
      this.processing = false;
      return;
    }

    try {
      logger.info({ msg: `Processing job: ${job.type}` });
      await this.executeJob(job);
    } catch (err: any) {
      logger.error({ msg: `Error executing background job ${job.type}`, error: err.message });
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  private async executeJob(job: JobPayload) {
    switch (job.type) {
      case 'SEND_EMAIL_ORDER_CONFIRMATION':
        await emailService.sendOrderConfirmation(job.data);
        break;
      case 'SEND_EMAIL_PAYMENT_RECEIPT':
        await emailService.sendPaymentReceipt(job.data);
        break;
      case 'SEND_EMAIL_SHIPPING_UPDATE':
        await emailService.sendShippingUpdate(job.data);
        break;
      case 'CHECK_LOW_STOCK':
        await this.checkLowStock(job.data.merchantId, job.data.productId);
        break;
      case 'PROCESS_SUBSCRIPTION_RENEWALS':
        await this.processSubscriptionRenewals();
        break;
      case 'PROCESS_GRACE_PERIODS':
        await this.processGracePeriods();
        await this.processExpiredTrials();
        break;
      case 'EXPIRE_ABANDONED_ORDERS':
        await this.expireAbandonedOrders();
        break;
      default:
        logger.warn({ msg: `Unknown job type: ${job.type}` });
    }
  }

  /**
   * A paid period that has run out.
   *
   * This used to simply push `currentPeriodEnd` forward by another 30 or 365
   * days and write a SUBSCRIPTION_RENEWED event — **with no charge of any
   * kind**. Every paid subscription on the platform therefore renewed itself
   * for free, for ever, the moment anything called this job. It is the same
   * shape as the `changePlan` and `subscribeToPlan` holes closed in the
   * billing pass; this one survived because nothing scheduled the job, so it
   * had never actually run.
   *
   * Nexus holds no card on file and has no recurring-charge token, so there is
   * nothing here that *can* take a payment. The honest transition is therefore
   * PAST_DUE: the period is over and unpaid, the merchant keeps working during
   * the grace window, and `processGracePeriods` expires them if it lapses.
   * Paying moves them back to ACTIVE through `settlePaidInvoice`, which is the
   * only path that may grant a plan.
   */
  private async processSubscriptionRenewals() {
    const now = new Date();
    const due = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: { lte: now },
      },
      include: { plan: true, merchant: true },
    });

    for (const sub of due) {
      // Claim the transition, so two instances running this job cannot both
      // act on the same subscription.
      const claimed = await prisma.subscription.updateMany({
        where: { id: sub.id, status: SubscriptionStatus.ACTIVE },
        data: { status: SubscriptionStatus.PAST_DUE },
      });

      if (claimed.count !== 1) continue;

      await prisma.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          action: 'SUBSCRIPTION_PAST_DUE',
          fromStatus: 'ACTIVE',
          toStatus: 'PAST_DUE',
          metadata: { planCode: sub.plan.code, periodEndedAt: sub.currentPeriodEnd },
        },
      });

      logger.info({
        msg: 'Subscription period ended unpaid; moved to PAST_DUE',
        merchantId: sub.merchantId,
        planCode: sub.plan.code,
      });
    }
  }

  /**
   * Trial periods that have run out, treated the same way.
   *
   * A trial is a dated grant, so when it ends the store is unpaid like any
   * other — not quietly left on the plan indefinitely.
   */
  private async processExpiredTrials() {
    const now = new Date();
    const expired = await prisma.subscription.findMany({
      where: { status: SubscriptionStatus.TRIALING, currentPeriodEnd: { lte: now } },
      include: { plan: true },
    });

    for (const sub of expired) {
      const claimed = await prisma.subscription.updateMany({
        where: { id: sub.id, status: SubscriptionStatus.TRIALING },
        data: { status: SubscriptionStatus.PAST_DUE },
      });

      if (claimed.count !== 1) continue;

      await prisma.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          action: 'TRIAL_ENDED',
          fromStatus: 'TRIALING',
          toStatus: 'PAST_DUE',
          metadata: { planCode: sub.plan.code },
        },
      });
    }
  }

  private async processGracePeriods() {
    const now = new Date();
    const cancelledSubs = await prisma.subscription.findMany({
      where: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { lte: now },
        status: SubscriptionStatus.ACTIVE,
      },
    });

    for (const sub of cancelledSubs) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: SubscriptionStatus.EXPIRED,
        },
      });

      await prisma.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          action: 'SUBSCRIPTION_EXPIRED',
          fromStatus: 'ACTIVE',
          toStatus: 'EXPIRED',
          metadata: { expiredAt: now },
        },
      });
    }
  }

  /**
   * Release inventory held by orders nobody ever paid for.
   *
   * Checkout reserves stock the moment the order row is written, which is
   * correct — it is what stops two shoppers buying the last unit. But the only
   * thing that ever gave it back was an explicit call to
   * `GET /payments/:ref/verify` that returned FAILED. A shopper who simply
   * closed the tab at the gateway left their reservation in place **for
   * ever**, so a store's sellable stock drained away one abandoned checkout at
   * a time with nothing in the UI to explain it.
   *
   * An order still PENDING and unpaid after the window has been abandoned by
   * any reasonable reading. Its stock goes back and the order is marked
   * CANCELLED, which is also what makes the figure a merchant sees in
   * Inventory mean something again.
   *
   * The window is deliberately generous: bank transfer and USSD payments on
   * both supported gateways can legitimately take well over an hour to
   * confirm, and releasing stock under a customer who is still paying is the
   * worse failure.
   */
  private async expireAbandonedOrders(olderThanMinutes = 180) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    const stale = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        paymentStatus: { in: [PrismaPaymentStatus.PENDING, PrismaPaymentStatus.FAILED] },
        createdAt: { lt: cutoff },
      },
      include: { items: true, payments: true },
      take: 200,
    });

    let released = 0;

    for (const order of stale) {
      // Never touch an order with a settled payment, whatever its status says.
      const paid = order.payments.some(
        p => p.status === PrismaPaymentStatus.SUCCESS || p.status === PrismaPaymentStatus.PAID
      );
      if (paid) continue;

      try {
        await prisma.$transaction(async (tx) => {
          // Claim the cancellation first: this job may run on more than one
          // instance, and the stock must go back exactly once.
          const claimed = await tx.order.updateMany({
            where: { id: order.id, status: OrderStatus.PENDING },
            data: { status: OrderStatus.CANCELLED, paymentStatus: PrismaPaymentStatus.FAILED },
          });

          if (claimed.count !== 1) return;

          for (const item of order.items) {
            if (item.variantId) {
              await tx.productVariant.updateMany({
                where: { id: item.variantId },
                data: { inventoryQuantity: { increment: item.quantity } },
              });
            }

            const invItem = await tx.inventoryItem.findFirst({
              where: { merchantId: order.merchantId, productId: item.productId },
            });

            if (invItem) {
              await tx.inventoryItem.update({
                where: { id: invItem.id },
                data: { availableStock: { increment: item.quantity } },
              });

              await tx.inventoryMovement.create({
                data: {
                  merchantId: order.merchantId,
                  inventoryItemId: invItem.id,
                  productId: item.productId,
                  variantId: item.variantId || undefined,
                  changeQuantity: item.quantity,
                  newQuantity: invItem.availableStock + item.quantity,
                  type: InventoryMovementType.ORDER_CANCELLED,
                  reason: `Checkout abandoned; reservation released for order ${order.orderNumber}`,
                },
              });
            }
          }

          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: OrderStatus.PENDING,
              toStatus: OrderStatus.CANCELLED,
              note: `Unpaid for over ${olderThanMinutes} minutes; stock returned to inventory`,
            },
          });

          released += 1;
        });
      } catch (err: any) {
        logger.error({
          msg: 'Failed to release an abandoned order reservation',
          orderId: order.id,
          error: err?.message,
        });
      }
    }

    if (released > 0) {
      logger.info({ msg: 'Released abandoned checkout reservations', orders: released });
    }
  }

  private async checkLowStock(merchantId: string, productId?: string) {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { owner: true },
    });

    if (!merchant) return;

    const whereCondition: any = { merchantId };
    if (productId) whereCondition.productId = productId;

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: whereCondition,
      include: { product: true },
    });

    for (const item of inventoryItems) {
      if (item.stock <= item.lowStockThreshold) {
        logger.warn({
          msg: `Low stock detected for ${item.product.title} (SKU: ${item.sku})! Stock: ${item.stock}`,
        });

        const existingNotif = await prisma.notification.findFirst({
          where: {
            merchantId,
            userId: merchant.ownerId,
            type: NotificationType.WARNING,
            title: `Low Stock: ${item.product.title}`,
            read: false,
          },
        });

        if (!existingNotif) {
          await prisma.notification.create({
            data: {
              merchantId,
              userId: merchant.ownerId,
              type: NotificationType.WARNING,
              title: `Low Stock: ${item.product.title}`,
              message: `SKU ${item.sku} has ${item.stock} remaining units (threshold: ${item.lowStockThreshold}).`,
              link: '/inventory',
            },
          });

          await emailService.sendLowStockAlert(
            merchant.owner.email,
            item.product.title,
            item.sku,
            item.stock,
            item.lowStockThreshold
          );
        }
      }
    }
  }
}

export const jobQueue = new JobQueue();
