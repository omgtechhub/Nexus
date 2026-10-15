import { Router } from 'express';
import { authMiddleware, requireCustomer } from '../middleware/auth.middleware.js';
import {
  shopAssistantMessage,
  shopVoiceProduct,
} from '../controllers/customerVoice.controller.js';

/**
 * The shopping assistant's typed surface.
 *
 * Separate from `/shop/voice` because nothing here touches audio: no multipart
 * upload, no voice portal, no enrolled profile. A shopper who has never
 * recorded a voice — or whose browser offers no microphone at all — gets the
 * whole assistant through this router.
 *
 * Customer-only, like the spoken routes. The assistant reads and proposes
 * changes to a specific shopper's basket, so a merchant or an administrator
 * signing in does not get a shopping assistant pointed at their own account.
 */
export const shopAssistantRouter = Router();

shopAssistantRouter.use(authMiddleware);
shopAssistantRouter.use(requireCustomer);

shopAssistantRouter.post('/message', shopAssistantMessage);

// The same product re-read the spoken surface offers, so a card rendered
// beside a typed answer shows the figures the order will actually use.
shopAssistantRouter.get('/product/:id', shopVoiceProduct);
