import { Router } from 'express';
import multer from 'multer';
import { VoicePortal } from '@prisma/client';
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
import {
  voiceStatus,
  enrolVoiceSample,
  deleteVoiceProfile,
  voiceCommand,
  useVoicePortal,
} from '../controllers/voice.controller.js';

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

/*
 * Voice. One WAV clip per request, held in memory rather than written to
 * disk: an utterance is seconds long, is consumed within the request, and is
 * a recording of someone's voice — there is no reason for it to outlive the
 * response on a disk somebody later backs up.
 */
const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

nexusIqRouter.use('/voice', useVoicePortal(VoicePortal.SELLER));

nexusIqRouter.get('/voice/status', voiceStatus);
nexusIqRouter.post('/voice/enrol', voiceUpload.single('audio'), enrolVoiceSample);
nexusIqRouter.delete('/voice/enrol', deleteVoiceProfile);
nexusIqRouter.post('/voice/command', voiceUpload.single('audio'), voiceCommand);
