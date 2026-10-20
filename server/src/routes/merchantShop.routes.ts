import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.middleware.js';
import {
  getMerchantShopInfo,
  getShopProducts,
  getShopProductBySlug,
  getShopCategories,
  validateCart,
  checkout,
  getShopOrderByNumber,
  trackPublicOrder,
} from '../controllers/merchantShop.controller.js';

export const shopRouter = Router();

// Public Global Tracking Search Route
shopRouter.get('/track/search', trackPublicOrder);

// Public shop routes, all merchant-scoped. No authentication required.
shopRouter.get('/:merchantRef', getMerchantShopInfo);
shopRouter.get('/:merchantRef/products', getShopProducts);
shopRouter.get('/:merchantRef/products/:productSlug', getShopProductBySlug);
shopRouter.get('/:merchantRef/categories', getShopCategories);
shopRouter.post('/:merchantRef/cart/validate', validateCart);
// optionalAuth: a signed-in buyer's order is attached to their account;
// guests still check out normally.
shopRouter.post('/:merchantRef/checkout', optionalAuth, checkout);
shopRouter.get('/:merchantRef/orders/:orderNumber', getShopOrderByNumber);

