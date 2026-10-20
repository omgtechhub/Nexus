import { Router } from 'express';
import { getOrders, getOrderById, createOrder, updateOrder, cancelOrder } from '../controllers/orders.controller.js';
import { authMiddleware, requireMerchantMembership } from '../middleware/auth.middleware.js';

export const ordersRouter = Router();

ordersRouter.use(authMiddleware);
ordersRouter.use(requireMerchantMembership);

ordersRouter.get('/', getOrders);
ordersRouter.get('/:id', getOrderById);
ordersRouter.post('/', createOrder);
ordersRouter.patch('/:id', updateOrder);
ordersRouter.put('/:id', updateOrder);
ordersRouter.post('/:id/cancel', cancelOrder);
