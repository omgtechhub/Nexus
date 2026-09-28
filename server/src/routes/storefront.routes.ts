import { Router } from 'express';
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
storefrontRouter.post('/:storeSlug/checkout', checkout);
storefrontRouter.get('/:storeSlug/orders/:orderNumber', getStorefrontOrderByNumber);

