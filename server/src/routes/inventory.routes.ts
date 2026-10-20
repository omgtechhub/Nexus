import { Router } from 'express';
import { getInventory, getProductInventory, updateProductInventory, adjustStock } from '../controllers/inventory.controller.js';
import { authMiddleware, requireMerchantMembership } from '../middleware/auth.middleware.js';

export const inventoryRouter = Router();

inventoryRouter.use(authMiddleware);
inventoryRouter.use(requireMerchantMembership);

inventoryRouter.get('/', getInventory);
inventoryRouter.get('/:productId', getProductInventory);
inventoryRouter.patch('/:productId', updateProductInventory);
inventoryRouter.post('/:productId/adjust', adjustStock);
