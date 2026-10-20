import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { accountRouter } from './account.routes.js';
import { productsRouter } from './products.routes.js';
import { customersRouter } from './customers.routes.js';
import { ordersRouter } from './orders.routes.js';
import { discountsRouter } from './discounts.routes.js';
import { analyticsRouter } from './analytics.routes.js';
import { notificationsRouter } from './notifications.routes.js';
import { settingsRouter } from './settings.routes.js';
import { inventoryRouter } from './inventory.routes.js';
import { uploadRouter } from './upload.routes.js';
import { shopRouter } from './merchantShop.routes.js';
import { marketplaceRouter } from './marketplace.routes.js';
import { contactRouter } from './contact.routes.js';
import { paymentsRouter } from './payments.routes.js';
import { webhooksRouter } from './webhooks.routes.js';
import { shippingRouter } from './shipping.routes.js';
import { shipmentsRouter } from './shipments.routes.js';
import { teamRouter } from './team.routes.js';
import { auditLogsRouter } from './auditLogs.routes.js';
import { plansRouter } from './plans.routes.js';
import { subscriptionsRouter } from './subscriptions.routes.js';
import { saasWebhooksRouter } from './saasWebhooks.routes.js';
import { platformAdminRouter } from './platformAdmin.routes.js';
import { nexusIqRouter } from './nexusIq.routes.js';
import { reviewsRouter } from './reviews.routes.js';
import { shopVoiceRouter } from './shopVoice.routes.js';
import { shopAssistantRouter } from './shopAssistant.routes.js';
import { adminVoiceRouter } from './adminVoice.routes.js';
import { publicAssistantRouter } from './publicAssistant.routes.js';
import { payoutsRouter, adminPayoutsRouter } from './payouts.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/account', accountRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/customers', customersRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/inventory', inventoryRouter);
apiRouter.use('/upload', uploadRouter);
apiRouter.use('/shop', shopRouter);
apiRouter.use('/marketplace', marketplaceRouter);
apiRouter.use('/contact', contactRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/webhooks', webhooksRouter);
apiRouter.use('/shipping', shippingRouter);
apiRouter.use('/shipments', shipmentsRouter);
apiRouter.use('/discounts', discountsRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/team', teamRouter);
apiRouter.use('/audit-logs', auditLogsRouter);
apiRouter.use('/plans', plansRouter);
apiRouter.use('/subscriptions', subscriptionsRouter);
apiRouter.use('/saas-webhooks', saasWebhooksRouter);
apiRouter.use('/payouts', payoutsRouter);
// Mounted before '/admin': Express matches prefixes in order, so the console
// router would otherwise receive these requests, run its own guard against
// them and only then fall through.
apiRouter.use('/admin/voice', adminVoiceRouter);
apiRouter.use('/admin/payouts', adminPayoutsRouter);
apiRouter.use('/admin', platformAdminRouter);
apiRouter.use('/iq', nexusIqRouter);
apiRouter.use('/reviews', reviewsRouter);
apiRouter.use('/shop/voice', shopVoiceRouter);
apiRouter.use('/shop/assistant', shopAssistantRouter);
// Nexus IQ for signed-out visitors on the public pages. Unauthenticated by
// design and scoped to published plans plus the public catalogue, so there is
// no account behind it; '/iq' and '/shop/*' above remain the gated surfaces.
apiRouter.use('/assistant', publicAssistantRouter);
