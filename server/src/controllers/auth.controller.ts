import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { Role, StoreStatus, PlatformRole, AccountType } from '@prisma/client';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { emailService } from '../services/email/email.service.js';
import { issueEmailVerificationToken, hashSessionToken } from '../services/auth/tokens.service.js';
import { activeMembershipOf } from '../services/auth/membership.js';
import { defaultCurrencyLabel } from '../config/currency.js';
import { verifyOAuthToken, OAuthVerificationError } from '../services/auth/oauthVerifier.service.js';

const SESSION_COOKIE_NAME = 'nexus_session';
const SESSION_DURATION_DAYS = 30;

function setSessionCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSite: 'none' | 'lax' = isProd ? 'none' : 'lax';
  const secure = sameSite === 'none' ? true : false;

  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

/** Create a persisted session row and return its opaque token. */
async function createSessionFor(userId: string, req: Request): Promise<string> {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await prisma.session.create({
    data: {
      sessionToken: hashSessionToken(sessionToken),
      userId,
      expiresAt,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
    },
  });

  return sessionToken;
}

/**
 * A merchant account, its OWNER membership and default settings — created
 * together.
 *
 * Refuses outright if the user already owns one. A partial unique index
 * enforces the same rule in the database, but reaching it would surface as a
 * raw constraint violation; a merchant who already has an account deserves to
 * be told that, not a 500.
 */
async function provisionStoreForUser(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  user: { id: string; name: string },
  storeName: string
) {
  const existingOwnership = await tx.storeMember.findFirst({
    where: { userId: user.id, role: 'OWNER' },
    include: { store: { select: { name: true } } },
  });

  if (existingOwnership) {
    const err: any = new Error(
      `This account already sells on Nexus as "${existingOwnership.store.name}". `
      + 'One merchant account per seller — sign in to the one you have.'
    );
    err.statusCode = 409;
    throw err;
  }

  const domainSlug =
    storeName.toLowerCase().replace(/[^a-z0-9]/g, '') || `store${Date.now()}`;
  const domain = `${domainSlug}-${crypto.randomBytes(2).toString('hex')}.nexuscommerce.io`;

  const store = await tx.store.create({
    data: {
      name: storeName,
      domain,
      currency: defaultCurrencyLabel(),
      timezone: 'America/New_York',
      industry: 'General Commerce',
      status: StoreStatus.ACTIVE,
      ownerId: user.id,
    },
  });

  const membership = await tx.storeMember.create({
    data: { userId: user.id, storeId: store.id, role: Role.OWNER },
  });

  await tx.storeSettings.create({
    data: {
      storeId: store.id,
      storeName: store.name,
      storeUrl: domainSlug,
      currency: defaultCurrencyLabel(),
      industry: 'General Commerce',
      announcementText: '🎉 Welcome to your new Nexus Commerce store!',
      activeTheme: 'nexus-dark',
      primaryColor: '#FFBD2E',
      customDomain: domain,
    },
  });

  return { store, membership };
}

/**
 * Send a confirmation link after sign-up.
 *
 * Deliberately best-effort: a mail outage must not fail an otherwise valid
 * registration, and the user can request a fresh link from their settings.
 */
async function sendVerificationOnSignup(user: { id: string; email: string; name: string }) {
  try {
    const token = await issueEmailVerificationToken(user.id);
    const base = (config.frontendUrl || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '');
    await emailService.sendEmailVerification({
      to: user.email,
      name: user.name,
      verifyUrl: `${base}/verify-email?token=${token}`,
    });
  } catch (err) {
    logger.warn({ err, userId: user.id }, 'Could not send verification email at signup');
  }
}

/**
 * Claim any per-store CRM records that share this account's email.
 *
 * Guest checkouts create a Customer row with no owner. Linking them on sign-in
 * is what makes one Nexus account show its whole purchase history across every
 * store it has bought from, rather than a per-store island.
 */
async function linkCustomerProfiles(userId: string, email: string): Promise<number> {
  const { count } = await prisma.customer.updateMany({
    where: { email: { equals: email, mode: 'insensitive' }, userId: null },
    data: { userId },
  });
  if (count > 0) {
    logger.info({ userId, count }, 'Linked guest customer records to account');
  }
  return count;
}

/** Record the verified provider identity so returning users match on subject id. */
async function linkOAuthAccount(
  userId: string,
  provider: string,
  providerAccountId: string
): Promise<void> {
  await prisma.oAuthAccount.upsert({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    create: { userId, provider, providerAccountId },
    update: { userId },
  });
}

/**
 * Single source of truth for which portal a user belongs to.
 * ADMIN is expressed by platformRole; everything else is the stored
 * accountType column. Nothing here is inferred from `plan` or store presence.
 */
function resolveAccountType(user: {
  platformRole?: PlatformRole | null;
  accountType?: AccountType | null;
}): 'ADMIN' | 'SELLER' | 'CUSTOMER' {
  if (user.platformRole) return 'ADMIN';
  return user.accountType === AccountType.CUSTOMER ? 'CUSTOMER' : 'SELLER';
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please log in instead.',
      });
      return;
    }

    const hashedPassword = await hashPassword(data.password);
    const isCustomer = data.userType === 'CUSTOMER';

    if (isCustomer) {
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            name: data.name.trim(),
            passwordHash: hashedPassword,
            accountType: AccountType.CUSTOMER,
            plan: 'customer',
            isVerified: false,
          },
        });

        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

        const session = await tx.session.create({
          data: {
            sessionToken: hashSessionToken(sessionToken),
            userId: user.id,
            expiresAt,
            userAgent: req.headers['user-agent'] || null,
            ipAddress: req.ip || null,
          },
        });

        return { user, store: null, membership: null, sessionToken };
      });

      setSessionCookie(res, result.sessionToken);
      await linkCustomerProfiles(result.user.id, result.user.email);
      await sendVerificationOnSignup(result.user);

      const { passwordHash, ...safeUser } = result.user;
      res.status(201).json({
        success: true,
        message: 'Customer account created successfully',
        data: {
          user: safeUser,
          store: null,
          membership: null,
        },
      });
      return;
    }

    const domainSlug = (data.storeName || data.name).toLowerCase().replace(/[^a-z0-9]/g, '') || `store${Date.now()}`;
    const domain = `${domainSlug}-${Math.random().toString(36).substring(2, 6)}.nexuscommerce.io`;

    // Atomic creation of User, Store, StoreMember(OWNER), StoreSettings, and Session
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: data.name.trim(),
          passwordHash: hashedPassword,
          accountType: AccountType.SELLER,
          plan: 'starter',
          isVerified: false,
        },
      });

      const store = await tx.store.create({
        data: {
          name: data.storeName ? data.storeName.trim() : `${user.name}'s Store`,
          domain,
          currency: defaultCurrencyLabel(),
          timezone: 'America/New_York',
          industry: 'General Commerce',
          status: StoreStatus.ACTIVE,
          ownerId: user.id,
        },
      });

      const membership = await tx.storeMember.create({
        data: {
          userId: user.id,
          storeId: store.id,
          role: Role.OWNER,
        },
      });

      await tx.storeSettings.create({
        data: {
          storeId: store.id,
          storeName: store.name,
          storeUrl: domainSlug,
          currency: defaultCurrencyLabel(),
          industry: 'General Commerce',
          announcementText: '🎉 Welcome to your new Nexus Commerce store!',
          activeTheme: 'nexus-dark',
          primaryColor: '#FFBD2E',
          customDomain: domain,
        },
      });

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

      const session = await tx.session.create({
        data: {
          sessionToken: hashSessionToken(sessionToken),
          userId: user.id,
          expiresAt,
          userAgent: req.headers['user-agent'] || null,
          ipAddress: req.ip || null,
        },
      });

      return { user, store, membership, sessionToken };
    });

    setSessionCookie(res, result.sessionToken);
    await sendVerificationOnSignup(result.user);

    const { passwordHash, ...safeUser } = result.user;
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: safeUser,
        store: result.store,
        membership: result.membership,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const email = data.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'No account found with this email address.',
      });
      return;
    }

    const isValidPassword = await verifyPassword(data.password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Incorrect password. Please check your credentials and try again.',
      });
      return;
    }

    const activeMembership = activeMembershipOf(user.memberships) ?? null;

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    await prisma.session.create({
      data: {
        sessionToken: hashSessionToken(sessionToken),
        userId: user.id,
        expiresAt,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
      },
    });

    setSessionCookie(res, sessionToken);

    const { passwordHash, ...safeUser } = user;

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accountType = resolveAccountType(safeUser);
    if (accountType === 'CUSTOMER') {
      await linkCustomerProfiles(user.id, user.email);
    }

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: safeUser,
        store: activeMembership?.store || null,
        membership: activeMembership || null,
        accountType,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const accountType = resolveAccountType(req.user as any);

    res.json({
      success: true,
      data: {
        user: req.user,
        store: req.store || null,
        membership: req.membership || null,
        accountType,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.nexus_session;
    if (token) {
      await prisma.session.updateMany({
        where: { sessionToken: hashSessionToken(token) },
        data: { revokedAt: new Date() },
      });
    }

    const isProd = process.env.NODE_ENV === 'production';
    const sameSite: 'none' | 'lax' = isProd ? 'none' : 'lax';
    const secure = sameSite === 'none' ? true : false;

    res.clearCookie(SESSION_COOKIE_NAME, {
      path: '/',
      sameSite,
      secure,
      httpOnly: true,
    });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function oauthLogin(req: Request, res: Response, next: NextFunction) {
  try {
    // SECURITY: identity comes from the provider, never from the request body.
    // The caller must present a token they could only obtain by actually
    // signing in with the provider; we verify it before trusting any field.
    let profile;
    try {
      profile = await verifyOAuthToken({
        provider: req.body?.provider,
        idToken: req.body?.idToken ?? req.body?.credential,
        accessToken: req.body?.accessToken,
      });
    } catch (err) {
      if (err instanceof OAuthVerificationError) {
        res.status(err.status).json({ success: false, error: err.message });
        return;
      }
      throw err;
    }

    const targetEmail = profile.email;
    const requestedAccountType = req.body?.userType === 'CUSTOMER' ? 'CUSTOMER' : 'SELLER';

    const existingUser = await prisma.user.findUnique({
      where: { email: targetEmail },
      include: { memberships: { include: { store: true } } },
    });

    // ---- Existing account: sign in. Never mutate what kind of account it is. ----
    if (existingUser) {
      await linkOAuthAccount(existingUser.id, profile.provider, profile.providerAccountId);
      if (resolveAccountType(existingUser) === 'CUSTOMER') {
        await linkCustomerProfiles(existingUser.id, existingUser.email);
      }

      const sessionToken = await createSessionFor(existingUser.id, req);
      setSessionCookie(res, sessionToken);

      const activeMembership = activeMembershipOf(existingUser.memberships) ?? null;
      const { passwordHash, ...safeUser } = existingUser;

      res.json({
        success: true,
        message: 'Signed in successfully',
        data: {
          user: safeUser,
          store: activeMembership?.store || null,
          membership: activeMembership || null,
          accountType: resolveAccountType(safeUser),
        },
      });
      return;
    }

    // ---- New account: create the kind of account the user actually asked for. ----
    const randomPassword = await hashPassword(
      `oauth_${profile.provider}_${crypto.randomBytes(24).toString('hex')}`
    );
    const displayName = profile.name || targetEmail.split('@')[0];

    if (requestedAccountType === 'CUSTOMER') {
      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: targetEmail,
            name: displayName,
            passwordHash: randomPassword,
            avatar: profile.picture,
            accountType: AccountType.CUSTOMER,
            plan: 'customer',
            isVerified: true,
            emailVerifiedAt: new Date(),
          },
        });
        return user;
      });

      await linkOAuthAccount(created.id, profile.provider, profile.providerAccountId);
      await linkCustomerProfiles(created.id, created.email);

      const sessionToken = await createSessionFor(created.id, req);
      setSessionCookie(res, sessionToken);

      const { passwordHash, ...safeUser } = created;
      res.status(201).json({
        success: true,
        message: 'Customer account created successfully',
        data: { user: safeUser, store: null, membership: null, accountType: 'CUSTOMER' },
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: targetEmail,
          name: displayName,
          passwordHash: randomPassword,
          avatar: profile.picture,
          accountType: AccountType.SELLER,
          plan: 'starter',
          isVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      const { store, membership } = await provisionStoreForUser(tx, user, `${displayName}'s Store`);
      return { user, store, membership };
    });

    await linkOAuthAccount(result.user.id, profile.provider, profile.providerAccountId);

    const sessionToken = await createSessionFor(result.user.id, req);
    setSessionCookie(res, sessionToken);

    const { passwordHash, ...safeUser } = result.user;
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: safeUser,
        store: result.store,
        membership: result.membership,
        accountType: 'SELLER',
      },
    });
  } catch (err) {
    next(err);
  }
}


export async function googleOAuth(req: Request, res: Response, next: NextFunction) {
  res.status(501).json({
    success: false,
    error: 'Google OAuth callback URL established. Set GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET to enable server flow.',
  });
}

export async function githubOAuth(req: Request, res: Response, next: NextFunction) {
  res.status(501).json({
    success: false,
    error: 'GitHub OAuth callback URL established. Set GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET to enable server flow.',
  });
}
