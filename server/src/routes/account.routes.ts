import { Router } from 'express';
import { authMiddleware, requireCustomer } from '../middleware/auth.middleware.js';
import {
  getProfile,
  updateProfile,
  getCustomerOrders,
  getCustomerOrderById,
  getCustomerAddresses,
  createCustomerAddress,
  deleteCustomerAddress,
} from '../controllers/account.controller.js';

export const accountRouter = Router();

accountRouter.use(authMiddleware);
accountRouter.use(requireCustomer);

accountRouter.get('/profile', getProfile);
accountRouter.patch('/profile', updateProfile);
accountRouter.get('/orders', getCustomerOrders);
accountRouter.get('/orders/:id', getCustomerOrderById);
accountRouter.get('/addresses', getCustomerAddresses);
accountRouter.post('/addresses', createCustomerAddress);
accountRouter.delete('/addresses/:id', deleteCustomerAddress);
