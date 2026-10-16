import pino from 'pino';
import { config } from '../config/index.js';

/**
 * Structured logging.
 *
 * `redact` is the part that matters in production. Request logging carries
 * headers and bodies, and this API's traffic includes the session cookie,
 * Authorization headers, passwords on the login and register routes, and
 * password-reset tokens in query strings. Logging a request without redaction
 * puts live credentials into whatever aggregates stdout — which is both a
 * breach waiting to happen and the reason nobody wants to turn request
 * logging on.
 *
 * `censor` rather than `remove`, so a reader can tell a field was present and
 * deliberately hidden instead of wondering whether it was ever sent.
 */
const REDACTED_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'req.headers["x-paystack-signature"]',
  'req.headers["verif-hash"]',
  'res.headers["set-cookie"]',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.token',
  'password',
  'passwordHash',
  'sessionToken',
  'token',
  'secret',
  '*.password',
  '*.passwordHash',
  '*.sessionToken',
];

export const logger = pino({
  level: process.env.LOG_LEVEL || (config.isProd ? 'info' : 'debug'),
  redact: {
    paths: REDACTED_PATHS,
    censor: '[redacted]',
    remove: false,
  },
  // JSON to stdout in production, for a log collector. pino-pretty is a
  // development convenience and a dependency production should not load.
  transport: config.isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true },
      },
});
