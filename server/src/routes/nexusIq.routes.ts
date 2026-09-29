import { Router } from 'express';
import { authMiddleware, requireStoreMembership } from '../middleware/auth.middleware.js';
import {
  listInsights,
  refreshInsights,
  dismissInsight,
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
  sendMessage,
  getUsageSummary,
} from '../controllers/nexusIq.controller.js';

export const nexusIqRouter = Router();

// Nexus IQ reads a store's own commercial data, so every route is
// merchant-only and scoped to the caller's store.
nexusIqRouter.use(authMiddleware);
nexusIqRouter.use(requireStoreMembership);

nexusIqRouter.get('/insights', listInsights);
nexusIqRouter.post('/insights/refresh', refreshInsights);
nexusIqRouter.patch('/insights/:id/dismiss', dismissInsight);

nexusIqRouter.get('/conversations', listConversations);
nexusIqRouter.post('/conversations', createConversation);
nexusIqRouter.get('/conversations/:id', getConversation);
nexusIqRouter.delete('/conversations/:id', deleteConversation);
nexusIqRouter.post('/conversations/:id/messages', sendMessage);

nexusIqRouter.get('/usage', getUsageSummary);
