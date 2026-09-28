import { Router } from 'express';
import { getShippingZones, createShippingZone, deleteShippingZone, calculateShippingRates } from '../controllers/shipping.controller.js';
import { authMiddleware, requireStoreMembership } from '../middleware/auth.middleware.js';

export const shippingRouter = Router();

// Public storefront route for rate calculation
shippingRouter.post('/rates/:storeSlug', calculateShippingRates);

// Authenticated merchant routes
shippingRouter.use(authMiddleware);
shippingRouter.use(requireStoreMembership);

shippingRouter.get('/zones', getShippingZones);
shippingRouter.post('/zones', createShippingZone);
shippingRouter.delete('/zones/:id', deleteShippingZone);
