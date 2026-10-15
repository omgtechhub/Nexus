import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import {
  publicAssistantStatus,
  publicAssistantMessage,
  publicAssistantVoice,
} from '../controllers/publicAssistant.controller.js';

/**
 * Nexus IQ for visitors who have not signed in.
 *
 * Deliberately the only router in this API with no `authMiddleware`, and the
 * reason it can be is scope rather than trust: every answer is computed from
 * the published subscription plans and the public catalogue, both of which an
 * anonymous visitor can already read. There is no account here to protect, so
 * there is nothing for a session or an enrolled voice to protect it from.
 *
 * The account-scoped assistants stay exactly as they were — `/iq` is
 * merchant-only and voice-gated, `/shop/*` is customer-only and voice-gated.
 * This router is an addition to them, never a way around them, and no handler
 * below reads a user, a store, an order or a basket.
 *
 * Rate limits stand in for the authentication that is absent. They are sized
 * for cost, not for authority: transcription is CPU spent per request, and the
 * typed path is a database read or two.
 */
export const publicAssistantRouter = Router();

const messageRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: 'That is a lot of questions at once. Give it a minute, or message us on WhatsApp.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Tighter than the typed limit on purpose: one clip costs a transcription run,
 * where one typed question costs a query.
 */
const voiceRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Too many recordings in a row. Type your question instead, or try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * In memory, and 2MB rather than the 5MB the account surfaces allow: a public
 * question is a sentence, and the clip is consumed inside the request. A
 * recording of a stranger's voice has no business reaching a disk somebody
 * later backs up.
 */
const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

publicAssistantRouter.get('/status', publicAssistantStatus);
publicAssistantRouter.post('/message', messageRateLimiter, publicAssistantMessage);
publicAssistantRouter.post(
  '/voice',
  voiceRateLimiter,
  voiceUpload.single('audio'),
  publicAssistantVoice
);
