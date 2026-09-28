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
      connectSrc: ["'self'", "*"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
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
      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (
        !config.isProd ||
        allowedOrigins.includes(normalizedOrigin) ||
        normalizedOrigin.includes('localhost') ||
        normalizedOrigin.includes('127.0.0.1')
      ) {
        callback(null, true);
      } else {
        logger.warn(
          `CORS rejected origin "${origin}". Configured FRONTEND_URL: "${config.frontendUrl}" (Allowed Origins: ${allowedOrigins.join(', ')})`
        );
        callback(new Error(`Not allowed by CORS: ${origin}`));
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
app.use(express.urlencoded({ extended: true }));

// Serve uploaded image files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

if (!config.isProd && process.env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger }));
}

app.use('/api', apiRouter);

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
