import { Router } from 'express';
import {
  listProductReviews,
  getMyReviewStatus,
  createProductReview,
  updateProductReview,
  deleteProductReview,
  listStoreReviews,
  replyToReview,
  deleteReviewReply,
} from '../controllers/reviews.controller.js';
import {
  authMiddleware,
  optionalAuth,
  requireCustomer,
  requireStoreMembership,
} from '../middleware/auth.middleware.js';

/**
 * Product reviews.
 *
 * Three audiences share one router, each behind its own guard:
 *
 *   - anyone may read published reviews for a live product;
 *   - a signed-in customer may write, edit and delete their own, and only
 *     where a delivered order backs it;
 *   - a merchant may reply to reviews on its own catalogue, and may not
 *     touch the rating or the text.
 *
 * The seller routes are declared before `/:id` so that `/seller` is not
 * swallowed by the id parameter.
 */
export const reviewsRouter = Router();

/* ---- Merchant ---------------------------------------------------------- */
reviewsRouter.get('/seller', authMiddleware, requireStoreMembership, listStoreReviews);
reviewsRouter.post('/:id/reply', authMiddleware, requireStoreMembership, replyToReview);
reviewsRouter.delete('/:id/reply', authMiddleware, requireStoreMembership, deleteReviewReply);

/* ---- Public ------------------------------------------------------------ */
// `optionalAuth` so a signed-in shopper's own review is flagged in the list
// without making the endpoint require a session.
reviewsRouter.get('/product/:productId', optionalAuth, listProductReviews);

/* ---- Shopper ----------------------------------------------------------- */
reviewsRouter.get('/product/:productId/me', authMiddleware, requireCustomer, getMyReviewStatus);
reviewsRouter.post('/product/:productId', authMiddleware, requireCustomer, createProductReview);
reviewsRouter.patch('/:id', authMiddleware, requireCustomer, updateProductReview);
reviewsRouter.delete('/:id', authMiddleware, requireCustomer, deleteProductReview);
