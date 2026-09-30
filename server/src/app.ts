import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import { pinoHttp } from 'pino-http';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/error.middleware.js';
import { apiRouter } from './routes/index.js';
import { createOriginGuard, isAllowedOrigin } from './middleware/origin.middleware.js';

import { prisma } from './prisma.js';

export const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      // Scoped to what the app actually talks to. A '*' here made the rest
      // of the policy decorative.
      connectSrc: ["'self'", ...allowedConnectSources()],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
/** Origins the browser may call, beyond the API's own. */
function allowedConnectSources(): string[] {
  return (config.frontendUrl || '')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export const allowedOrigins = (config.frontendUrl || '')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      // Exact origin comparison. Asking whether the origin *contains*
      // "localhost" accepted https://localhost.attacker.example and every
      // other lookalike host — with credentials enabled that hands over the
      // session.
      if (isAllowedOrigin(origin, allowedOrigins, config.isProd)) {
        callback(null, true);
      } else {
        logger.warn(
          `CORS rejected origin "${origin}". Configured FRONTEND_URL: "${config.frontendUrl}" (Allowed Origins: ${allowedOrigins.join(', ')})`
        );
        // Withhold the CORS headers rather than throwing: the browser will not
        // expose the response, and a write gets a clean 403 from the origin
        // guard instead of a 500 from an unhandled error.
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  },
}));
// No urlencoded parser. The API speaks JSON only, and accepting a CORS
// "simple" content type would let a cross-site <form> post a state change
// without the browser ever sending a preflight.

// Serve uploaded image files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

if (!config.isProd && process.env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger }));
}

// CSRF defence: the session cookie is SameSite=None in production, so a
// cross-site page can make the browser attach it. Writes must come from an
// origin we serve.
app.use('/api', createOriginGuard(allowedOrigins), apiRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
});

app.use(errorHandler);
