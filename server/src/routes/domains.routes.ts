import { Router } from 'express';
import {
  getDomains,
  addDomain,
  verifyDomain,
  setPrimaryDomain,
  deleteDomain,
} from '../controllers/domains.controller.js';
import { authMiddleware, requireStoreMembership } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

export const domainsRouter = Router();

domainsRouter.use(authMiddleware);
domainsRouter.use(requireStoreMembership);

domainsRouter.get('/', getDomains);
domainsRouter.post('/', requireRole(['OWNER', 'ADMIN']), addDomain);
domainsRouter.post('/:id/verify', requireRole(['OWNER', 'ADMIN']), verifyDomain);
domainsRouter.post('/:id/set-primary', requireRole(['OWNER', 'ADMIN']), setPrimaryDomain);
domainsRouter.delete('/:id', requireRole(['OWNER', 'ADMIN']), deleteDomain);
