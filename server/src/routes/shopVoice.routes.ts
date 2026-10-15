import { Router } from 'express';
import multer from 'multer';
import { VoicePortal } from '@prisma/client';
import { authMiddleware, requireCustomer } from '../middleware/auth.middleware.js';
import {
  voiceStatus,
  enrolVoiceSample,
  deleteVoiceProfile,
  useVoicePortal,
} from '../controllers/voice.controller.js';
import {
  shopVoiceCommand,
  shopVoiceProduct,
} from '../controllers/customerVoice.controller.js';

/**
 * The shopping assistant's voice surface.
 *
 * Customer-only. Enrolment is shared with the seller console — one
 * implementation, one measured threshold, one set of rules about what a voice
 * match does and does not mean — but the profile is keyed to the CUSTOMER
 * portal, so registering a voice to buy things does not also unlock a store's
 * revenue for someone who happens to hold both accounts.
 */
export const shopVoiceRouter = Router();

const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

shopVoiceRouter.use(authMiddleware);
shopVoiceRouter.use(requireCustomer);
shopVoiceRouter.use(useVoicePortal(VoicePortal.CUSTOMER));

shopVoiceRouter.get('/status', voiceStatus);
shopVoiceRouter.post('/enrol', voiceUpload.single('audio'), enrolVoiceSample);
shopVoiceRouter.delete('/enrol', deleteVoiceProfile);

shopVoiceRouter.post('/command', voiceUpload.single('audio'), shopVoiceCommand);
shopVoiceRouter.get('/product/:id', shopVoiceProduct);
