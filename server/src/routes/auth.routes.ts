import { Router } from 'express';
import { register, login, me, logout, oauthLogin, googleOAuth, githubOAuth } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many authentication attempts. Please try again later.' },
});

export const authRouter = Router();

authRouter.post('/register', authLimiter, register);
authRouter.post('/login', authLimiter, login);
authRouter.post('/oauth', authLimiter, oauthLogin);
authRouter.get('/me', authMiddleware, me);
authRouter.post('/logout', logout);

// OAuth architecture endpoints
authRouter.get('/google', googleOAuth);
authRouter.get('/github', githubOAuth);
