import { Router } from 'express';
import {
  getNavigationMenus,
  createNavigationMenu,
  updateNavigationMenu,
  deleteNavigationMenu,
} from '../controllers/navigation.controller.js';
import { authMiddleware, requireStoreMembership } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

export const navigationRouter = Router();

navigationRouter.use(authMiddleware);
navigationRouter.use(requireStoreMembership);

navigationRouter.get('/', getNavigationMenus);
navigationRouter.post('/', requireRole(['OWNER', 'ADMIN', 'STAFF']), createNavigationMenu);
navigationRouter.put('/:id', requireRole(['OWNER', 'ADMIN', 'STAFF']), updateNavigationMenu);
navigationRouter.patch('/:id', requireRole(['OWNER', 'ADMIN', 'STAFF']), updateNavigationMenu);
navigationRouter.delete('/:id', requireRole(['OWNER', 'ADMIN']), deleteNavigationMenu);
