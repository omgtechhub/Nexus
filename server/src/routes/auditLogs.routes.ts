import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditLogs.controller.js';
import { authMiddleware, requireMerchantMembership } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

export const auditLogsRouter = Router();

auditLogsRouter.use(authMiddleware);
auditLogsRouter.use(requireMerchantMembership);
auditLogsRouter.get('/', requireRole(['OWNER', 'ADMIN', 'STAFF', 'VIEWER']), getAuditLogs);
