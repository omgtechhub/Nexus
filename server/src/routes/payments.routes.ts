import { Router } from 'express';
import { initializePayment, verifyPayment, refundOrder, getPayments } from '../controllers/payments.controller.js';
import { authMiddleware, requireStoreMembership } from '../middleware/auth.middleware.js';
import { paymentRateLimiter } from '../middleware/rateLimit.middleware.js';

export const paymentsRouter = Router();

// Public payment endpoints (used by storefront checkout)
paymentsRouter.post('/initialize', paymentRateLimiter, initializePayment);
paymentsRouter.get('/:reference/verify', paymentRateLimiter, verifyPayment);

// Authenticated merchant endpoints
paymentsRouter.use(authMiddleware);
paymentsRouter.use(requireStoreMembership);

paymentsRouter.get('/', getPayments);
paymentsRouter.post('/orders/:orderId/refund', paymentRateLimiter, refundOrder);
