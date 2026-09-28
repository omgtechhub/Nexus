import { Router } from 'express';
import { fulfillOrder, updateShipmentStatus, getShipments, getOrderShipment } from '../controllers/shipments.controller.js';
import { authMiddleware, requireStoreMembership } from '../middleware/auth.middleware.js';

export const shipmentsRouter = Router();

// Public order shipment tracking
shipmentsRouter.get('/orders/:orderId', getOrderShipment);

// Authenticated merchant routes
shipmentsRouter.use(authMiddleware);
shipmentsRouter.use(requireStoreMembership);

shipmentsRouter.get('/', getShipments);
shipmentsRouter.post('/orders/:orderId/fulfill', fulfillOrder);
shipmentsRouter.patch('/:id/status', updateShipmentStatus);
