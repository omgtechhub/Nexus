import { Router } from 'express';
import { register, login, me, logout, oauthLogin, googleOAuth, githubOAuth } from '../controllers/auth.controller.js';
import {
  forgotPassword,
  resetPassword,
  changePassword,
  sendVerificationEmail,
  verifyEmail,
} from '../controllers/accountSecurity.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many authentication attempts. Please try again later.' },
});

/**
 * The recovery limiter alone is relaxed under test. The identity suite walks
 * the reset and verification flows end to end, which needs more than five
 * requests; the auth limiter above stays armed because phase9 asserts it fires.
 */
const skipInTest = () => process.env.NODE_ENV === 'test';

/**
 * Recovery endpoints are throttled harder than sign-in: they send mail and are
 * the natural target for both enumeration sweeps and token brute-forcing.
 */
const recoveryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skip: skipInTest,
  message: {
    success: false,
    error: 'Too many password reset attempts. Please try again in an hour.',
  },
});

export const authRouter = Router();

authRouter.post('/register', authLimiter, register);
authRouter.post('/login', authLimiter, login);
authRouter.post('/oauth', authLimiter, oauthLogin);
authRouter.get('/me', authMiddleware, me);
authRouter.post('/logout', logout);

// Password recovery
authRouter.post('/forgot-password', recoveryLimiter, forgotPassword);
authRouter.post('/reset-password', recoveryLimiter, resetPassword);
authRouter.post('/change-password', authMiddleware, changePassword);

// Email confirmation
authRouter.post('/send-verification', authMiddleware, recoveryLimiter, sendVerificationEmail);
authRouter.post('/verify-email', authLimiter, verifyEmail);

// OAuth architecture endpoints
authRouter.get('/google', googleOAuth);
authRouter.get('/github', githubOAuth);
