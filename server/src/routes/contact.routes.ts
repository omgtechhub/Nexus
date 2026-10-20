import { Router } from 'express';
import { submitContactMessage } from '../controllers/contact.controller.js';
import { contactRateLimiter } from '../middleware/rateLimit.middleware.js';

/**
 * Public and unauthenticated by design: the people most likely to need this
 * form are the ones who cannot get into their account.
 */
export const contactRouter = Router();

contactRouter.post('/', contactRateLimiter, submitContactMessage);
