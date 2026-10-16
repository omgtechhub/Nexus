import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { emailService } from '../services/email/email.service.js';
import {
  issuePasswordResetToken,
  consumePasswordResetToken,
  issueEmailVerificationToken,
  consumeEmailVerificationToken,
} from '../services/auth/tokens.service.js';

const PASSWORD_RESET_TTL_MINUTES = 60;

/** Matches the registration rules so a reset cannot weaken an account. */
const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const forgotPasswordSchema = z.object({ email: z.string().email('A valid email address is required') });
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'A reset token is required'),
  password: strongPassword,
});
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Your current password is required'),
  newPassword: strongPassword,
});

function frontendUrl(path: string): string {
  const base = (config.frontendUrl || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '');
  return `${base}${path}`;
}

/**
 * Start a password reset.
 *
 * Always answers 200 with the same message. Telling an anonymous caller whether
 * an address is registered turns this endpoint into an account-enumeration
 * oracle, which is how attackers build target lists.
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  const genericResponse = {
    success: true,
    message: 'If an account exists for that email address, a reset link is on its way.',
  };

  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      res.json(genericResponse);
      return;
    }

    const token = await issuePasswordResetToken(user.id);

    const delivered = await emailService.sendPasswordReset({
      to: user.email,
      name: user.name,
      resetUrl: frontendUrl(`/reset-password?token=${token}`),
      expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
    });

    /**
     * The response stays generic either way — the enumeration oracle above is
     * the reason — but a delivery failure must not pass in silence. This is
     * the request where a broken transport is least survivable and hardest to
     * notice: the caller is told a link is on its way whatever happens, so
     * without this line a dead SMTP host looks exactly like a working one.
     */
    if (!delivered) {
      logger.error({
        msg: 'Password reset email was NOT delivered; the user cannot recover their account',
        userId: user.id,
        transport: emailService.providerName,
      });
    }

    res.json(genericResponse);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.issues[0]?.message || 'Invalid request' });
      return;
    }
    next(err);
  }
}

/**
 * Complete a password reset and revoke every existing session, so a stolen
 * session cookie does not survive the recovery that was meant to stop it.
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    const userId = await consumePasswordResetToken(token);
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'This reset link is invalid or has expired. Request a new one.',
      });
      return;
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    logger.info({ userId }, 'Password reset completed; all sessions revoked');

    res.json({
      success: true,
      message: 'Your password has been changed. Sign in with your new password.',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.issues[0]?.message || 'Invalid request' });
      return;
    }
    next(err);
  }
}

/** Change password while signed in. Keeps the current session, drops the rest. */
export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      res.status(401).json({ success: false, error: 'Your current password is incorrect.' });
      return;
    }

    if (await verifyPassword(newPassword, user.passwordHash)) {
      res.status(400).json({
        success: false,
        error: 'Your new password must be different from your current one.',
      });
      return;
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null, id: { not: req.sessionId } },
        data: { revokedAt: new Date() },
      }),
    ]);

    res.json({ success: true, message: 'Password updated. Other devices have been signed out.' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.issues[0]?.message || 'Invalid request' });
      return;
    }
    next(err);
  }
}

/** Send (or resend) an email verification link to the signed-in user. */
export async function sendVerificationEmail(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    if (req.user.isVerified) {
      res.json({ success: true, message: 'Your email address is already confirmed.' });
      return;
    }

    const token = await issueEmailVerificationToken(req.user.id);

    await emailService.sendEmailVerification({
      to: req.user.email,
      name: req.user.name,
      verifyUrl: frontendUrl(`/verify-email?token=${token}`),
    });

    res.json({ success: true, message: 'Confirmation email sent. Check your inbox.' });
  } catch (err) {
    next(err);
  }
}

/** Confirm an email address. Public: the token itself is the credential. */
export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const token = String(req.body?.token ?? req.query?.token ?? '').trim();

    const userId = await consumeEmailVerificationToken(token);
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'This confirmation link is invalid or has expired. Request a new one.',
      });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true, emailVerifiedAt: new Date() },
    });

    res.json({ success: true, message: 'Email address confirmed.' });
  } catch (err) {
    next(err);
  }
}
