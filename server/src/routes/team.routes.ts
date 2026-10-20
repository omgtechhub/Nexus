import { Router } from 'express';
import {
  getTeam,
  createInvitation,
  resendInvitation,
  revokeInvitation,
  acceptInvitation,
  updateMemberRole,
  removeMember,
} from '../controllers/team.controller.js';
import { authMiddleware, requireMerchantMembership } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

export const teamRouter = Router();

teamRouter.use(authMiddleware);

teamRouter.post('/accept-invite', acceptInvitation);
teamRouter.post('/invitations/accept', acceptInvitation);

teamRouter.use(requireMerchantMembership);
teamRouter.get('/', getTeam);
teamRouter.post('/invite', requireRole(['OWNER', 'ADMIN']), createInvitation);
teamRouter.post('/invitations', requireRole(['OWNER', 'ADMIN']), createInvitation);
teamRouter.post('/invitations/:id/resend', requireRole(['OWNER', 'ADMIN']), resendInvitation);
teamRouter.delete('/invitations/:id', requireRole(['OWNER', 'ADMIN']), revokeInvitation);
teamRouter.patch('/members/:id/role', requireRole(['OWNER', 'ADMIN']), updateMemberRole);
teamRouter.patch('/members/:id', requireRole(['OWNER', 'ADMIN']), updateMemberRole);
teamRouter.delete('/members/:id', requireRole(['OWNER', 'ADMIN']), removeMember);
