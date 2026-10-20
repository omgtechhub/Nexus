import { Router } from 'express';
import { fulfillOrder, updateShipmentStatus, getShipments, getOrderShipment } from '../controllers/shipments.controller.js';
import { authMiddleware, requireMerchantMembership } from '../middleware/auth.middleware.js';

export const shipmentsRouter = Router();

// Every route here is merchant-only. This one used to sit above the middleware
// and returned a full shipment record -- carrier, tracking number, merchant
// notes and the whole tracking-event history -- for any order id, with no proof
// that the caller was entitled to it. Buyers track orders through
// GET /shop/track/search, which requires the order number AND the email
// used on the order.
shipmentsRouter.use(authMiddleware);
shipmentsRouter.use(requireMerchantMembership);

shipmentsRouter.get('/orders/:orderId', getOrderShipment);
shipmentsRouter.get('/', getShipments);
shipmentsRouter.post('/orders/:orderId/fulfill', fulfillOrder);
shipmentsRouter.patch('/:id/status', updateShipmentStatus);
