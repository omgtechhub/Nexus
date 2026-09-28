import { Router } from 'express';
import { getAnalytics } from '../controllers/analytics.controller.js';
import { authMiddleware, requireStoreMembership } from '../middleware/auth.middleware.js';

export const analyticsRouter = Router();

analyticsRouter.use(authMiddleware);
analyticsRouter.use(requireStoreMembership);

analyticsRouter.get('/', getAnalytics);
