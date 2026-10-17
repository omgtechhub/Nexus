import { Router } from 'express';
import {
  getMyBalance,
  getMyPayouts,
  getMyPayoutAccount,
  upsertMyPayoutAccount,
  listPayableStores,
  listAllPayouts,
  createPayoutForStore,
  setPayoutStatus,
  sendPayout,
} from '../controllers/payouts.controller.js';
import { authMiddleware, requireStoreMembership, requirePlatformAdmin } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { sensitiveActionRateLimiter } from '../middleware/rateLimit.middleware.js';

/**
 * Merchant-facing payouts: read your own balance and history, and say where
 * the money should go.
 *
 * There is deliberately no endpoint here for *creating* a payout. That is the
 * platform paying money out, so it lives on the admin router below — a
 * merchant requesting their own disbursement and a merchant authorising it are
 * different things, and only the first could ever belong here.
 *
 * Changing the destination account is rate-limited: it is the single most
 * valuable thing to change on a compromised merchant session.
 */
export const payoutsRouter = Router();

payoutsRouter.use(authMiddleware);
payoutsRouter.use(requireStoreMembership);

payoutsRouter.get('/balance', getMyBalance);
payoutsRouter.get('/', getMyPayouts);
payoutsRouter.get('/account', requireRole(['OWNER', 'ADMIN']), getMyPayoutAccount);
payoutsRouter.put(
  '/account',
  sensitiveActionRateLimiter,
  requireRole(['OWNER']),
  upsertMyPayoutAccount
);

/**
 * Platform-facing payouts, mounted under `/admin`.
 */
export const adminPayoutsRouter = Router();

adminPayoutsRouter.use(authMiddleware);
adminPayoutsRouter.use(requirePlatformAdmin);

adminPayoutsRouter.get('/payable', listPayableStores);
adminPayoutsRouter.get('/', listAllPayouts);
adminPayoutsRouter.post('/', sensitiveActionRateLimiter, createPayoutForStore);
adminPayoutsRouter.patch('/:id', sensitiveActionRateLimiter, setPayoutStatus);
// Sends the money. Separate from creating the obligation on purpose.
adminPayoutsRouter.post('/:id/send', sensitiveActionRateLimiter, sendPayout);
