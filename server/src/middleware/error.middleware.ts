import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config/index.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(config.isProd ? {} : { stack: err.stack }),
  });
}
