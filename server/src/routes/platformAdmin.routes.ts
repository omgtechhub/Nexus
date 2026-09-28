import { Router } from 'express';
import {
  getPlatformMetrics,
  getMerchants,
  getPlatformPlans,
  createPlatformPlan,
  updatePlatformPlan,
  getPlatformInvoices,
  getPlatformTransactions,
} from '../controllers/platformAdmin.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requirePlatformRole } from '../middleware/platformRbac.middleware.js';

export const platformAdminRouter = Router();

platformAdminRouter.use(authMiddleware);
platformAdminRouter.use(requirePlatformRole(['PLATFORM_OWNER', 'PLATFORM_ADMIN']));

platformAdminRouter.get('/metrics', getPlatformMetrics);
platformAdminRouter.get('/merchants', getMerchants);
platformAdminRouter.get('/plans', getPlatformPlans);
platformAdminRouter.post('/plans', createPlatformPlan);
platformAdminRouter.patch('/plans/:id', updatePlatformPlan);
platformAdminRouter.get('/invoices', getPlatformInvoices);
platformAdminRouter.get('/transactions', getPlatformTransactions);
