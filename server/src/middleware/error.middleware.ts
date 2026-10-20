import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * The last stop for an unhandled error.
 *
 * Two things were wrong, and together they made production faults
 * undiagnosable *and* leaky:
 *
 *  1. **Nothing was logged.** The error was serialised into the response and
 *     dropped. With `pino-http` also disabled in production, a 500 left no
 *     trace anywhere — no stack, no route, no timestamp.
 *
 *  2. **`err.message` was returned verbatim on a 500.** Prisma's errors quote
 *     table names, column names and fragments of the failing query; a Node
 *     error quotes filesystem paths. All of that went to the client.
 *
 * Now: everything is logged with the request context, and a 5xx answers with a
 * fixed message plus a correlation id that also appears in the log line. The
 * operator can find the exact error from what the user quotes, and the user
 * learns nothing about the internals.
 *
 * Errors a route raised on purpose — those carrying a 4xx `statusCode` — keep
 * their message, because that message *is* the API contract.
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const statusCode = err?.status || err?.statusCode || 500;

  if (statusCode < 500) {
    // A deliberate client-facing refusal. Logged at warn, message preserved.
    logger.warn({
      msg: 'Request rejected',
      statusCode,
      method: req.method,
      path: req.originalUrl,
      error: err?.message,
      code: err?.code,
    });

    res.status(statusCode).json({
      success: false,
      error: err?.message || 'Request could not be completed',
      ...(err?.code ? { code: err.code } : {}),
      ...(err?.details ? { details: err.details } : {}),
    });
    return;
  }

  // Short enough to read down a phone line, long enough not to collide.
  const errorId = crypto.randomBytes(6).toString('hex');

  logger.error({
    msg: 'Unhandled error',
    errorId,
    statusCode,
    method: req.method,
    path: req.originalUrl,
    userId: (req as any).user?.id,
    merchantId: (req as any).merchant?.id,
    error: err?.message,
    code: err?.code,
    // Prisma attaches these and they are the fastest route to a cause.
    prismaCode: err?.code?.startsWith?.('P') ? err.code : undefined,
    prismaMeta: err?.meta,
    stack: err?.stack,
  });

  res.status(500).json({
    success: false,
    error: 'Something went wrong on our end. Please try again.',
    // Quote this back to support and the log line is one search away.
    errorId,
    // The stack stays available in development, where the developer IS the
    // operator and there is nobody to leak it to.
    ...(config.isProd ? {} : { debug: err?.message, stack: err?.stack }),
  });
}
