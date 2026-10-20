import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { authMiddleware, requireMerchantMembership } from '../middleware/auth.middleware.js';

export const settingsRouter = Router();

settingsRouter.use(authMiddleware);
settingsRouter.use(requireMerchantMembership);

settingsRouter.get('/', getSettings);
settingsRouter.put('/', updateSettings);
