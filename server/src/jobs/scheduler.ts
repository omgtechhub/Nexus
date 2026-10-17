import { jobQueue, JobType } from './jobQueue.js';
import { logger } from '../utils/logger.js';
import { purgeExpiredTokens } from '../services/auth/tokens.service.js';

/**
 * Runs the recurring jobs.
 *
 * `PROCESS_SUBSCRIPTION_RENEWALS` and `PROCESS_GRACE_PERIODS` existed as job
 * types, were fully implemented, and **nothing ever called them**. No cron, no
 * interval, no endpoint. So subscriptions never reached the end of their
 * period, trials never ended, and cancelled subscriptions never expired — the
 * billing lifecycle simply did not advance. `expireAbandonedOrders` would have
 * had the same fate.
 *
 * This is an in-process `setInterval`, which is the honest shape for the queue
 * it drives: `jobQueue` is an in-memory array with no persistence. It is
 * adequate for a single instance and explicitly not adequate for several —
 * see the warning below and `DEPLOYMENT.md`.
 *
 * ## Running more than one API instance
 *
 * Every instance would run every job. The jobs are written to tolerate that —
 * each claims its row with the current status in the predicate, so a double
 * run is a no-op rather than a double charge or a double stock release — but
 * it is wasted work and it will not scale. Moving the queue onto Redis (which
 * is already in the stack and used by nothing) is the real fix, and
 * `SCHEDULER_ENABLED=false` lets you disable it on all but one instance in the
 * meantime.
 */

interface ScheduledJob {
  type: JobType;
  everyMs: number;
  /** Delay before the first run, to keep boot cheap. */
  initialDelayMs: number;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const SCHEDULE: ScheduledJob[] = [
  // Frequent: it holds a shopper's stock hostage until it runs.
  { type: 'EXPIRE_ABANDONED_ORDERS', everyMs: 15 * MINUTE, initialDelayMs: MINUTE },
  // Billing moves in days, so hourly is ample and keeps the load trivial.
  { type: 'PROCESS_SUBSCRIPTION_RENEWALS', everyMs: 6 * HOUR, initialDelayMs: 2 * MINUTE },
  { type: 'PROCESS_GRACE_PERIODS', everyMs: 6 * HOUR, initialDelayMs: 3 * MINUTE },
];

const timers: NodeJS.Timeout[] = [];

export function schedulerEnabled(): boolean {
  const flag = (process.env.SCHEDULER_ENABLED || 'true').trim().toLowerCase();
  return flag !== 'false' && flag !== '0' && flag !== 'no';
}

export function startScheduler(): void {
  if (!schedulerEnabled()) {
    logger.warn({
      msg: 'Scheduler disabled by SCHEDULER_ENABLED. Subscription renewals, grace periods and '
        + 'abandoned-checkout stock release will NOT run on this instance.',
    });
    return;
  }

  for (const job of SCHEDULE) {
    const timer = setTimeout(() => {
      jobQueue.enqueue(job.type);

      const interval = setInterval(() => jobQueue.enqueue(job.type), job.everyMs);
      // Must not keep the process alive on its own; shutdown clears them.
      interval.unref?.();
      timers.push(interval);
    }, job.initialDelayMs);

    timer.unref?.();
    timers.push(timer);
  }

  /**
   * Expired password-reset and email-verification grants.
   *
   * `purgeExpiredTokens` was written as "safe to call from a scheduled job"
   * and then never scheduled, so consumed and expired grants accumulated for
   * ever. They cannot be redeemed, but keeping redeemable-shaped rows around
   * indefinitely is needless exposure.
   */
  const purgeTimer = setInterval(async () => {
    try {
      const purged = await purgeExpiredTokens();
      if (purged > 0) logger.info({ msg: 'Purged expired auth tokens', count: purged });
    } catch (err) {
      logger.error({ err }, 'Token purge failed');
    }
  }, 12 * HOUR);
  purgeTimer.unref?.();
  timers.push(purgeTimer);

  logger.info({
    msg: 'Scheduler started',
    jobs: SCHEDULE.map(j => `${j.type} every ${Math.round(j.everyMs / MINUTE)}m`),
  });
}

export function stopScheduler(): void {
  for (const timer of timers) {
    clearTimeout(timer);
    clearInterval(timer);
  }
  timers.length = 0;
}
