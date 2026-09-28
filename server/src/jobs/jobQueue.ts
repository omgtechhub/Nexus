import { logger } from '../utils/logger.js';
import { prisma } from '../prisma.js';
import { emailService } from '../services/email/email.service.js';
import { NotificationType, SubscriptionStatus } from '@prisma/client';

export type JobType =
  | 'SEND_EMAIL_ORDER_CONFIRMATION'
  | 'SEND_EMAIL_PAYMENT_RECEIPT'
  | 'SEND_EMAIL_SHIPPING_UPDATE'
  | 'CHECK_LOW_STOCK'
  | 'PROCESS_SUBSCRIPTION_RENEWALS'
  | 'PROCESS_GRACE_PERIODS';

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
        await this.checkLowStock(job.data.storeId, job.data.productId);
        break;
      case 'PROCESS_SUBSCRIPTION_RENEWALS':
        await this.processSubscriptionRenewals();
        break;
      case 'PROCESS_GRACE_PERIODS':
        await this.processGracePeriods();
        break;
      default:
        logger.warn({ msg: `Unknown job type: ${job.type}` });
    }
  }

  private async processSubscriptionRenewals() {
    const now = new Date();
    const activeSubs = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: { lte: now },
      },
      include: { plan: true, store: true },
    });

    for (const sub of activeSubs) {
      const days = sub.billingInterval === 'ANNUAL' ? 365 : 30;
      const nextEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          currentPeriodStart: now,
          currentPeriodEnd: nextEnd,
        },
      });

      await prisma.subscriptionEvent.create({
        data: {
          subscriptionId: sub.id,
          action: 'SUBSCRIPTION_RENEWED',
          fromStatus: 'ACTIVE',
          toStatus: 'ACTIVE',
          metadata: { planCode: sub.plan.code, renewedAt: now },
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

  private async checkLowStock(storeId: string, productId?: string) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { owner: true },
    });

    if (!store) return;

    const whereCondition: any = { storeId };
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
            storeId,
            userId: store.ownerId,
            type: NotificationType.WARNING,
            title: `Low Stock: ${item.product.title}`,
            read: false,
          },
        });

        if (!existingNotif) {
          await prisma.notification.create({
            data: {
              storeId,
              userId: store.ownerId,
              type: NotificationType.WARNING,
              title: `Low Stock: ${item.product.title}`,
              message: `SKU ${item.sku} has ${item.stock} remaining units (threshold: ${item.lowStockThreshold}).`,
              link: '/inventory',
            },
          });

          await emailService.sendLowStockAlert(
            store.owner.email,
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
