import { Router } from 'express';
import {
  getCurrentSubscription,
  subscribeToPlan,
  changePlan,
  changeInterval,
  cancelSubscription,
  resumeSubscription,
  getInvoices,
  getInvoiceDetails,
} from '../controllers/subscriptions.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

export const subscriptionsRouter = Router();

subscriptionsRouter.use(authMiddleware);

subscriptionsRouter.get('/current', getCurrentSubscription);
subscriptionsRouter.post('/subscribe', requireRole(['OWNER', 'ADMIN']), subscribeToPlan);
subscriptionsRouter.post('/change-plan', requireRole(['OWNER', 'ADMIN']), changePlan);
subscriptionsRouter.post('/change-interval', requireRole(['OWNER', 'ADMIN']), changeInterval);
subscriptionsRouter.post('/cancel', requireRole(['OWNER', 'ADMIN']), cancelSubscription);
subscriptionsRouter.post('/resume', requireRole(['OWNER', 'ADMIN']), resumeSubscription);
subscriptionsRouter.get('/invoices', getInvoices);
subscriptionsRouter.get('/invoices/:id', getInvoiceDetails);
