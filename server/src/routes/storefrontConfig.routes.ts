import { Router } from 'express';
import {
  getStorefrontConfig,
  updateDraftConfig,
  publishStorefront,
  getPreviewConfig,
} from '../controllers/storefrontConfig.controller.js';
import { authMiddleware, requireStoreMembership } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

export const storefrontConfigRouter = Router();

storefrontConfigRouter.use(authMiddleware);
storefrontConfigRouter.use(requireStoreMembership);

storefrontConfigRouter.get('/', getStorefrontConfig);
storefrontConfigRouter.get('/preview', getPreviewConfig);
storefrontConfigRouter.patch('/', requireRole(['OWNER', 'ADMIN', 'STAFF']), updateDraftConfig);
storefrontConfigRouter.post('/publish', requireRole(['OWNER', 'ADMIN']), publishStorefront);
