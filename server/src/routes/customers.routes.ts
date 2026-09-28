import { Router } from 'express';
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from '../controllers/customers.controller.js';
import { authMiddleware, requireStoreMembership } from '../middleware/auth.middleware.js';

export const customersRouter = Router();

customersRouter.use(authMiddleware);
customersRouter.use(requireStoreMembership);

customersRouter.get('/', getCustomers);
customersRouter.get('/:id', getCustomerById);
customersRouter.post('/', createCustomer);
customersRouter.patch('/:id', updateCustomer);
customersRouter.put('/:id', updateCustomer);
customersRouter.delete('/:id', deleteCustomer);
