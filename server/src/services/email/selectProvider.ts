import { emailService, ConsoleEmailProvider } from './email.service.js';
import { createSmtpProvider, smtpConfigured } from './smtp.provider.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Choose the email transport at startup.
 *
 * Kept out of `email.service.ts` so that importing the service — which the
 * whole job queue does — never pulls nodemailer in. The test suite and every
 * controller get the console provider by default; only this function, called
 * once from `server.ts`, can replace it.
 *
 * **A production install with no usable SMTP credentials is a hard failure.**
 * Not a warning. The install that prompted this shipped with the console
 * provider as the only transport, so no email was ever sent — and the symptom
 * was not "email is broken", it was "nobody can reset their password" and
 * "verification links never arrive", reported weeks later as unrelated faults.
 * Refusing to boot makes a missing transport a deploy-time error instead of a
 * silent, permanent one.
 */
export async function selectEmailProvider(): Promise<void> {
  const smtp = createSmtpProvider();

  if (smtp) {
    emailService.setProvider(smtp);
    logger.info({ msg: 'Email transport: SMTP', host: config.email.smtpHost });

    // Non-blocking: a transient SMTP outage at boot must not stop the API
    // serving, but it must be loud about it.
    void smtp.verify();
    return;
  }

  if (config.isProd) {
    logger.fatal({
      msg:
        'No SMTP transport is configured, so this install cannot send email. '
        + 'Password resets and email verification would both be silently dead. '
        + 'Set SMTP_HOST, SMTP_USER and SMTP_PASS to real credentials.',
      smtpConfigured: smtpConfigured(),
      smtpHost: config.email.smtpHost || '(unset)',
    });
    process.exit(1);
  }

  emailService.setProvider(new ConsoleEmailProvider());
  logger.warn({
    msg: 'Email transport: console. Messages are printed, not delivered. Set SMTP_* to send real email.',
  });
}
