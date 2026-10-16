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

/**
 * Trust exactly as many proxy hops as the deployment actually has.
 *
 * Left unset, `req.ip` was the address of whatever spoke to the socket — in a
 * container that is nginx, for every single request. The rate limiters key on
 * `req.ip`, so the whole internet shared one bucket: 30 login attempts per 15
 * minutes across all users, and a brute-force attempt that locked out
 * legitimate traffic instead of itself.
 *
 * A hop count rather than `true`: trusting the entire X-Forwarded-For chain
 * lets a client prepend a fabricated address and choose its own rate-limit
 * identity. See the note on TRUST_PROXY in config/index.ts.
 */
if (config.trustProxy > 0) {
  app.set('trust proxy', config.trustProxy);
}

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

/**
 * Uploaded images, served from the API's own origin.
 *
 * `storage.service.ts` now derives the stored extension from the file's actual
 * magic bytes, so nothing reaching this directory should be markup. These
 * options are the second line: they neutralise anything already written to
 * disk by the version that trusted `file.originalname`.
 *
 *  - `nosniff` stops a browser rendering a `.jpg` as HTML on a content guess.
 *  - A restrictive CSP on this path alone means even a served HTML file has no
 *    script, no styles and no network of its own. The app-wide policy above
 *    allows `'unsafe-inline'` for the SPA, which an uploaded document would
 *    otherwise inherit.
 *  - `index: false` keeps the directory from being listed or auto-served.
 */
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'), {
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox");
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

/**
 * Request logging, in production as well as development.
 *
 * This was gated behind `!config.isProd`, so a live deployment logged **no
 * requests at all** — and `errorHandler` logged nothing either, so a 500 was
 * returned to the client and then vanished. There was no way to answer "what
 * happened at 14:02" on a running install.
 *
 * Only the test environment is excluded, where it is pure noise.
 *
 * The level per response keeps the volume survivable without losing anything
 * that matters: a 5xx is an error, a 4xx is a warning (useful — a burst of
 * 401s is an attack, a burst of 403s is a misconfigured FRONTEND_URL), and the
 * health probes are silent so a 30-second Docker healthcheck does not become
 * the entire log.
 */
if (process.env.NODE_ENV !== 'test') {
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/ready',
      },
      // The default serialisers log every header on every request. These keep
      // the useful fields and drop the rest; `logger`'s redact list covers
      // what remains.
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
        }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    })
  );
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
