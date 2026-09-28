import { Router } from 'express';
import { handlePaystackWebhook, handleFlutterwaveWebhook } from '../controllers/webhooks.controller.js';

export const webhooksRouter = Router();

// Public webhook endpoints (Signature verified by controller)
webhooksRouter.post('/paystack', handlePaystackWebhook);
webhooksRouter.post('/flutterwave', handleFlutterwaveWebhook);
