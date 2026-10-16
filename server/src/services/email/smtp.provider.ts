import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import type { EmailOptions, IEmailProvider } from './email.service.js';

/**
 * Real SMTP delivery.
 *
 * Until this existed, `ConsoleEmailProvider` was the only provider and it was
 * unconditionally the default — so on a deployed install **no email was ever
 * sent**. The SMTP_* variables were read into config and never used. The
 * consequences were not cosmetic: nobody could verify an email address, and
 * nobody could recover an account, because the reset link only ever reached
 * the server's stdout.
 *
 * Failures are reported, never swallowed. A caller that needs to know whether
 * the mail went out — password reset, in particular — gets `false` and can say
 * so, rather than telling the user to check an inbox nothing was sent to.
 */
export class SmtpEmailProvider implements IEmailProvider {
  readonly name = 'smtp';
  private transporter: Transporter | null = null;

  constructor(
    private readonly options: {
      host: string;
      port: number;
      user: string;
      pass: string;
      from: string;
    }
  ) {}

  /**
   * Built on first use rather than in the constructor, so importing this
   * module never opens a socket — the test suite imports the app freely.
   */
  private transport(): Transporter {
    if (this.transporter) return this.transporter;

    this.transporter = nodemailer.createTransport({
      host: this.options.host,
      port: this.options.port,
      // 465 is implicit TLS; 587 and 25 start plaintext and upgrade via
      // STARTTLS, which `requireTLS` makes mandatory rather than optional —
      // otherwise a downgrade leaves reset links in the clear.
      secure: this.options.port === 465,
      requireTLS: this.options.port !== 465,
      auth: { user: this.options.user, pass: this.options.pass },
      pool: true,
      maxConnections: 3,
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    return this.transporter;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const info = await this.transport().sendMail({
        from: this.options.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      // Subject and recipient only. The body carries reset tokens and
      // verification links, and a log aggregator is not a place to keep them.
      logger.info({
        msg: 'Transactional email sent',
        to: options.to,
        subject: options.subject,
        messageId: info.messageId,
      });
      return true;
    } catch (err: any) {
      logger.error({
        msg: 'Transactional email FAILED to send',
        to: options.to,
        subject: options.subject,
        error: err?.message,
        code: err?.code,
      });
      return false;
    }
  }

  /** Readiness probe: proves the credentials and the host actually work. */
  async verify(): Promise<boolean> {
    try {
      await this.transport().verify();
      logger.info({ msg: 'SMTP transport verified', host: this.options.host });
      return true;
    } catch (err: any) {
      logger.error({
        msg: 'SMTP transport verification failed — no email will be delivered',
        host: this.options.host,
        error: err?.message,
      });
      return false;
    }
  }
}

/** Values that are present in the env file but are not real credentials. */
const PLACEHOLDER_MARKERS = [
  'placeholder',
  'replace_me',
  'replace-me',
  'your_',
  'your-',
  'changeme',
  'change_me',
  'example.com',
  'smtp_password',
  'todo',
  'xxxx',
];

function isConfigured(value: string | undefined): boolean {
  if (!value) return false;
  const lower = value.trim().toLowerCase();
  if (!lower) return false;
  return !PLACEHOLDER_MARKERS.some(marker => lower.includes(marker));
}

/**
 * Whether real SMTP credentials are present.
 *
 * `server/.env.example` ships with `SMTP_PASS=smtp_password_placeholder`, so
 * "the variable is set" is not the same question as "we can send mail" — the
 * same trap the payment keys had.
 */
export function smtpConfigured(): boolean {
  return (
    isConfigured(config.email.smtpHost)
    && isConfigured(config.email.smtpUser)
    && isConfigured(config.email.smtpPass)
  );
}

export function createSmtpProvider(): SmtpEmailProvider | null {
  if (!smtpConfigured()) return null;

  return new SmtpEmailProvider({
    host: config.email.smtpHost!,
    port: config.email.smtpPort || 587,
    user: config.email.smtpUser!,
    pass: config.email.smtpPass!,
    from: config.email.from,
  });
}
