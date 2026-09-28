import { Router } from 'express';
import {
  getDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  validateDiscountCode,
} from '../controllers/discounts.controller.js';
import { authMiddleware, requireStoreMembership } from '../middleware/auth.middleware.js';

export const discountsRouter = Router();

// Public validation endpoint for checkout
discountsRouter.post('/validate', validateDiscountCode);

// Merchant management endpoints
discountsRouter.use(authMiddleware);
discountsRouter.use(requireStoreMembership);

discountsRouter.get('/', getDiscounts);
discountsRouter.post('/', createDiscount);
discountsRouter.patch('/:id', updateDiscount);
discountsRouter.delete('/:id', deleteDiscount);
