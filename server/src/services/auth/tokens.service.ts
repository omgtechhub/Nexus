import crypto from 'crypto';
import { prisma } from '../../prisma.js';

/**
 * Single-use, expiring grants for password reset and email verification.
 *
 * The raw token is handed to the user once, over email, and never stored. Only
 * its SHA-256 digest is persisted, so a leaked database snapshot cannot be
 * replayed to take over accounts. Lookup is by digest, which is why the column
 * is indexed and unique.
 */

const PASSWORD_RESET_TTL_MINUTES = 60;
const EMAIL_VERIFICATION_TTL_HOURS = 48;

export function generateToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Issue a password reset grant, invalidating any outstanding one so a user
 * cannot hold several live reset links at once.
 */
export async function issuePasswordResetToken(userId: string): Promise<string> {
  const { token, tokenHash } = generateToken();

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt: minutesFromNow(PASSWORD_RESET_TTL_MINUTES) },
    }),
  ]);

  return token;
}

/**
 * Consume a reset token. Returns the userId on success, null for anything
 * invalid — unknown, expired or already used — so callers cannot distinguish
 * between those cases and probe for valid tokens.
 */
export async function consumePasswordResetToken(token: string): Promise<string | null> {
  if (!token) return null;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  // Mark used in the same breath as the check: updateMany with the null guard
  // makes a concurrent second redemption a no-op rather than a second success.
  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  return claimed.count === 1 ? record.userId : null;
}

export async function issueEmailVerificationToken(userId: string): Promise<string> {
  const { token, tokenHash } = generateToken();

  await prisma.$transaction([
    prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt: minutesFromNow(EMAIL_VERIFICATION_TTL_HOURS * 60) },
    }),
  ]);

  return token;
}

export async function consumeEmailVerificationToken(token: string): Promise<string | null> {
  if (!token) return null;

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  const claimed = await prisma.emailVerificationToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  return claimed.count === 1 ? record.userId : null;
}

/** Housekeeping for expired grants; safe to call from a scheduled job. */
export async function purgeExpiredTokens(): Promise<number> {
  const cutoff = new Date();
  const [resets, verifications] = await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
    prisma.emailVerificationToken.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
  ]);
  return resets.count + verifications.count;
}
