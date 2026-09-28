import { Router } from 'express';
import {
  getPages,
  getPageById,
  createPage,
  updatePage,
  deletePage,
} from '../controllers/pages.controller.js';
import { authMiddleware, requireStoreMembership } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

export const pagesRouter = Router();

pagesRouter.use(authMiddleware);
pagesRouter.use(requireStoreMembership);

pagesRouter.get('/', getPages);
pagesRouter.get('/:id', getPageById);
pagesRouter.post('/', requireRole(['OWNER', 'ADMIN', 'STAFF']), createPage);
pagesRouter.put('/:id', requireRole(['OWNER', 'ADMIN', 'STAFF']), updatePage);
pagesRouter.patch('/:id', requireRole(['OWNER', 'ADMIN', 'STAFF']), updatePage);
pagesRouter.delete('/:id', requireRole(['OWNER', 'ADMIN']), deletePage);
