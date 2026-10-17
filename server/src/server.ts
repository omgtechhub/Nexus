import { app, allowedOrigins } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { prisma } from './prisma.js';
import { selectEmailProvider } from './services/email/selectProvider.js';
import { checkSessionCookieViability } from './utils/deploymentChecks.js';
import { backfillMissingCommissions } from './services/payouts/payout.service.js';
import { startScheduler, stopScheduler } from './jobs/scheduler.js';
import { shutdownTranscriber } from './services/voice/stt.service.js';

/**
 * Refuse to serve a production install that cannot hold a session.
 *
 * The rule itself lives in `utils/deploymentChecks.ts` as a pure function so
 * it can be tested without terminating the test runner; this is only the part
 * that acts on the verdict.
 */
function assertSessionCookieCanWork(): void {
  const verdict = checkSessionCookieViability(config.frontendUrl, config.isProd);

  if (verdict.fatal) {
    logger.fatal({
      msg:
        'FRONTEND_URL is http:// on a production build. The session cookie is issued '
        + 'SameSite=None; Secure, which a browser discards over plain HTTP — every login '
        + 'would appear to succeed and then fail. Serve the app over https and set '
        + 'FRONTEND_URL accordingly.',
      frontendUrl: config.frontendUrl,
      insecureOrigins: verdict.insecureOrigins,
    });
    process.exit(1);
  }

  if (verdict.insecureOrigins.length > 0) {
    // Loopback only: browsers treat localhost as a secure context, so the
    // cookie survives. Fine locally; not a deployable configuration.
    logger.warn({
      msg: 'Production build serving a loopback origin over http. Fine locally; not deployable.',
      frontendUrl: config.frontendUrl,
    });
  }
}

assertSessionCookieCanWork();

/**
 * Pick the email transport before accepting traffic.
 *
 * In production this exits the process when no usable SMTP credentials are
 * present, which is deliberate: the alternative is an install that boots
 * cleanly and silently never sends a password reset.
 */
await selectEmailProvider();

/**
 * Give every already-settled payment a merchant/platform split.
 *
 * Payments taken before payouts existed have a null `merchantNetAmount`, which
 * would read as a zero balance and tell merchants they are owed nothing.
 * Idempotent and cheap; failure must not stop the API serving, so it is logged
 * rather than fatal.
 */
try {
  await backfillMissingCommissions();
} catch (err) {
  logger.error({ err }, 'Commission backfill failed; merchant balances may read low until it succeeds');
}

/**
 * Start the recurring jobs.
 *
 * Subscription renewals, grace periods and abandoned-checkout stock release
 * were all implemented and never scheduled, so none of them had ever run.
 */
startScheduler();

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

  stopScheduler();

  server.close(async () => {
    try {
      // Worker threads keep the process alive on their own, so a pool left
      // running turns a graceful shutdown into a SIGKILL after the timeout.
      await shutdownTranscriber();
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
