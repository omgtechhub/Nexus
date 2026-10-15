import { Router } from 'express';
import multer from 'multer';
import { VoicePortal } from '@prisma/client';
import { authMiddleware, requirePlatformAdmin } from '../middleware/auth.middleware.js';
import {
  voiceStatus,
  enrolVoiceSample,
  deleteVoiceProfile,
  useVoicePortal,
} from '../controllers/voice.controller.js';
import {
  adminVoiceCommand,
  adminPolicyReport,
} from '../controllers/adminVoice.controller.js';

/**
 * The platform console's voice surface.
 *
 * Platform administrators only, and keyed to the ADMIN portal. A person who
 * runs a store and also administers the platform enrols twice, deliberately:
 * the voice that asks about their own shop's margin is not thereby the voice
 * that can hear every merchant's compliance record.
 *
 * Read-only. There is no spoken route that suspends a store or alters a
 * record, because voice verification is defeated by a recording and
 * enforcement against a merchant should cost a deliberate click.
 */
export const adminVoiceRouter = Router();

const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

adminVoiceRouter.use(authMiddleware);
adminVoiceRouter.use(requirePlatformAdmin);
adminVoiceRouter.use(useVoicePortal(VoicePortal.ADMIN));

adminVoiceRouter.get('/status', voiceStatus);
adminVoiceRouter.post('/enrol', voiceUpload.single('audio'), enrolVoiceSample);
adminVoiceRouter.delete('/enrol', deleteVoiceProfile);

adminVoiceRouter.get('/report', adminPolicyReport);
adminVoiceRouter.post('/command', voiceUpload.single('audio'), adminVoiceCommand);
