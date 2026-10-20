import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  emailCustomer,
} from '../controllers/customers.controller.js';
import { sensitiveActionRateLimiter } from '../middleware/rateLimit.middleware.js';
import { authMiddleware, requireMerchantMembership } from '../middleware/auth.middleware.js';

export const customersRouter = Router();

customersRouter.use(authMiddleware);
customersRouter.use(requireMerchantMembership);

customersRouter.get('/', getCustomers);
customersRouter.get('/:id', getCustomerById);
customersRouter.post('/', createCustomer);
customersRouter.patch('/:id', updateCustomer);
customersRouter.put('/:id', updateCustomer);
customersRouter.delete('/:id', deleteCustomer);
// Sends mail on behalf of a merchant, so it is bounded like any other
// outbound-message route.
customersRouter.post('/:id/email', sensitiveActionRateLimiter, emailCustomer);
