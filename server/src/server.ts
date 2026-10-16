import { app, allowedOrigins } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { prisma } from './prisma.js';
import { selectEmailProvider } from './services/email/selectProvider.js';

/**
 * Pick the email transport before accepting traffic.
 *
 * In production this exits the process when no usable SMTP credentials are
 * present, which is deliberate: the alternative is an install that boots
 * cleanly and silently never sends a password reset.
 */
await selectEmailProvider();

const server = app.listen(config.port, () => {
  logger.info(`Nexus Commerce Server listening on port ${config.port} [${config.nodeEnv}]`);
  logger.info(`CORS allowed frontend origins: ${allowedOrigins.join(', ')}`);
});

/**
 * Shutdown: stop accepting connections, close the database, then exit.
 *
 * The database handle was previously left open, so a lingering connection
 * could keep the process alive past `server.close()` until the orchestrator
 * gave up and sent SIGKILL — which turns a rolling deploy into dropped
 * in-flight requests. The timeout is the backstop for exactly that case.
 */
let shuttingDown = false;

const handleShutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Received ${signal}. Shutting down gracefully...`);

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s; exiting anyway.');
    process.exit(1);
  }, 10_000);
  // Do not let the timer itself hold the event loop open.
  forceExit.unref();

  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (err) {
      logger.warn({ err }, 'Error disconnecting Prisma during shutdown');
    }
    clearTimeout(forceExit);
    logger.info('Server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

/**
 * An unhandled rejection used to terminate the process silently under Node's
 * default. Logging it first is the difference between a diagnosable crash and
 * a container that restarts for no stated reason.
 */
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception; shutting down');
  handleShutdown('uncaughtException');
});
