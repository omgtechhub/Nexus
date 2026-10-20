import { Router } from 'express';
import { getShippingZones, createShippingZone, deleteShippingZone, calculateShippingRates } from '../controllers/shipping.controller.js';
import { authMiddleware, requireMerchantMembership } from '../middleware/auth.middleware.js';

export const shippingRouter = Router();

// Public route for rate calculation
shippingRouter.post('/rates/:merchantRef', calculateShippingRates);

// Authenticated merchant routes
shippingRouter.use(authMiddleware);
shippingRouter.use(requireMerchantMembership);

shippingRouter.get('/zones', getShippingZones);
shippingRouter.post('/zones', createShippingZone);
shippingRouter.delete('/zones/:id', deleteShippingZone);
