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
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional().default('Nexus Commerce <no-reply@nexuscommerce.io>'),
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
  isProd: parsed.data.NODE_ENV === 'production',
  email: {
    smtpHost: parsed.data.SMTP_HOST,
    smtpPort: parseInt(parsed.data.SMTP_PORT, 10),
    smtpUser: parsed.data.SMTP_USER,
    smtpPass: parsed.data.SMTP_PASS,
    from: parsed.data.EMAIL_FROM,
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
