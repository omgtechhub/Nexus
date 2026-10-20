import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 chars'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  /**
   * How many reverse proxies sit in front of this process.
   *
   * Express resolves `req.ip` from the socket unless told otherwise, so behind
   * nginx every request appeared to come from the proxy's address. The
   * rate limiters key on `req.ip`, which meant all traffic shared a single
   * bucket: one busy shopper could exhaust the login limit for everybody, and
   * a real attacker was never isolated.
   *
   * It is a hop count, not a boolean, on purpose. `trust proxy: true` trusts
   * the whole X-Forwarded-For chain, and a client can prepend anything it
   * likes to that header — which hands out a trivially spoofable identity to
   * the thing deciding who gets rate limited. `1` means "take the address one
   * hop back", i.e. the one our own nginx wrote. Set it to the real number of
   * proxies (a CDN in front of nginx makes it 2); `0` disables it.
   */
  TRUST_PROXY: z.string().optional().default('0'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional().default('Nexus Commerce <no-reply@nexuscommerce.io>'),
  /**
   * Where messages from the public contact form are delivered.
   *
   * Falls back to SMTP_USER, which is an address that provably exists -- it is
   * the one the server authenticates as. A contact form that posts into a
   * mailbox nobody owns is the same defect as one that posts nowhere at all.
   */
  SUPPORT_EMAIL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid server environment variables:', parsed.error.format());
  process.exit(1);
}

export const config = {
  port: parseInt(parsed.data.PORT, 10),
  nodeEnv: parsed.data.NODE_ENV,
  databaseUrl: parsed.data.DATABASE_URL,
  sessionSecret: parsed.data.SESSION_SECRET,
  frontendUrl: parsed.data.FRONTEND_URL,
  redisUrl: parsed.data.REDIS_URL,
  trustProxy: Number.isFinite(parseInt(parsed.data.TRUST_PROXY, 10))
    ? Math.max(0, parseInt(parsed.data.TRUST_PROXY, 10))
    : 0,
  isProd: parsed.data.NODE_ENV === 'production',
  email: {
    smtpHost: parsed.data.SMTP_HOST,
    smtpPort: parseInt(parsed.data.SMTP_PORT, 10),
    smtpUser: parsed.data.SMTP_USER,
    smtpPass: parsed.data.SMTP_PASS,
    from: parsed.data.EMAIL_FROM,
    supportTo: parsed.data.SUPPORT_EMAIL || parsed.data.SMTP_USER || '',
  },
  google: {
    clientId: parsed.data.GOOGLE_CLIENT_ID,
    clientSecret: parsed.data.GOOGLE_CLIENT_SECRET,
  },
  github: {
    clientId: parsed.data.GITHUB_CLIENT_ID,
    clientSecret: parsed.data.GITHUB_CLIENT_SECRET,
  },
};
