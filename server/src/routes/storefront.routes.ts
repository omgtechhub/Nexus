import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.middleware.js';
import {
  getStorefrontInfo,
  getStorefrontProducts,
  getStorefrontProductBySlug,
  getStorefrontCategories,
  validateCart,
  checkout,
  getStorefrontOrderByNumber,
  trackPublicOrder,
} from '../controllers/storefront.controller.js';

export const storefrontRouter = Router();

// Public Global Tracking Search Route
storefrontRouter.get('/track/search', trackPublicOrder);

// Public Storefront Routes (No authentication required)
storefrontRouter.get('/:storeSlug', getStorefrontInfo);
storefrontRouter.get('/:storeSlug/products', getStorefrontProducts);
storefrontRouter.get('/:storeSlug/products/:productSlug', getStorefrontProductBySlug);
storefrontRouter.get('/:storeSlug/categories', getStorefrontCategories);
storefrontRouter.post('/:storeSlug/cart/validate', validateCart);
// optionalAuth: a signed-in buyer's order is attached to their account;
// guests still check out normally.
storefrontRouter.post('/:storeSlug/checkout', optionalAuth, checkout);
storefrontRouter.get('/:storeSlug/orders/:orderNumber', getStorefrontOrderByNumber);

