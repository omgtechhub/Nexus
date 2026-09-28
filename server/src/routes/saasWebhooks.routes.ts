import { Router } from 'express';
import { handlePaystackSaaSWebhook, handleFlutterwaveSaaSWebhook } from '../controllers/saasWebhooks.controller.js';

export const saasWebhooksRouter = Router();

saasWebhooksRouter.post('/paystack', handlePaystackSaaSWebhook);
saasWebhooksRouter.post('/flutterwave', handleFlutterwaveSaaSWebhook);
