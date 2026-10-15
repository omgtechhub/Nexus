import { Router } from 'express';
import {
  getMarketplaceProducts,
  getMarketplaceCategories,
  getMarketplaceHome,
  getMarketplaceProduct,
} from '../controllers/marketplace.controller.js';

/**
 * The public marketplace catalogue. Read-only and unauthenticated by design:
 * this is what a visitor sees before they have an account, so no route here
 * takes a session into account or accepts a write.
 *
 * Cart validation and checkout stay on `/api/storefront/:storeSlug/*`, because
 * an order belongs to exactly one merchant.
 */
export const marketplaceRouter = Router();

marketplaceRouter.get('/home', getMarketplaceHome);
marketplaceRouter.get('/categories', getMarketplaceCategories);
marketplaceRouter.get('/products', getMarketplaceProducts);
marketplaceRouter.get('/products/:storeId/:productSlug', getMarketplaceProduct);
