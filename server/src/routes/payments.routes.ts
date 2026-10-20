import { Router } from 'express';
import { initializePayment, verifyPayment, refundOrder, getPayments } from '../controllers/payments.controller.js';
import { authMiddleware, requireMerchantMembership, optionalAuth } from '../middleware/auth.middleware.js';
import { paymentRateLimiter } from '../middleware/rateLimit.middleware.js';

export const paymentsRouter = Router();

/**
 * Public, because a guest checkout has no account and this is the step
 * immediately after placing an order.
 *
 * `optionalAuth` populates req.user when a session happens to be present, so
 * a signed-in customer is recognised without a guest being turned away. The
 * controller then requires the caller either to BE that customer or to quote
 * the order's email address — it previously accepted a bare orderId from
 * anyone.
 */
paymentsRouter.post('/initialize', paymentRateLimiter, optionalAuth, initializePayment);
paymentsRouter.get('/:reference/verify', paymentRateLimiter, verifyPayment);

// Authenticated merchant endpoints
paymentsRouter.use(authMiddleware);
paymentsRouter.use(requireMerchantMembership);

paymentsRouter.get('/', getPayments);
paymentsRouter.post('/orders/:orderId/refund', paymentRateLimiter, refundOrder);
