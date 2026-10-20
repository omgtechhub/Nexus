import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../controllers/products.controller.js';
import { authMiddleware, requireMerchantMembership } from '../middleware/auth.middleware.js';

export const productsRouter = Router();

productsRouter.use(authMiddleware);
productsRouter.use(requireMerchantMembership);

productsRouter.get('/', getProducts);
productsRouter.get('/:id', getProductById);
productsRouter.post('/', createProduct);
productsRouter.patch('/:id', updateProduct);
productsRouter.put('/:id', updateProduct);
productsRouter.delete('/:id', deleteProduct);
