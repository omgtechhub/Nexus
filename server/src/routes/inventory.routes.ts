import { Router } from 'express';
import { getInventory, getProductInventory, updateProductInventory, adjustStock } from '../controllers/inventory.controller.js';
import { authMiddleware, requireStoreMembership } from '../middleware/auth.middleware.js';

export const inventoryRouter = Router();

inventoryRouter.use(authMiddleware);
inventoryRouter.use(requireStoreMembership);

inventoryRouter.get('/', getInventory);
inventoryRouter.get('/:productId', getProductInventory);
inventoryRouter.patch('/:productId', updateProductInventory);
inventoryRouter.post('/:productId/adjust', adjustStock);
