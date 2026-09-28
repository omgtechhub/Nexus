import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { Role, StoreStatus, PlatformRole } from '@prisma/client';
import crypto from 'crypto';
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
      sessionToken,
      userId,
      expiresAt,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
    },
  });

  return sessionToken;
}

/** A store, its OWNER membership and default settings — created together. */
async function provisionStoreForUser(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  user: { id: string; name: string },
  storeName: string
) {
  const domainSlug =
    storeName.toLowerCase().replace(/[^a-z0-9]/g, '') || `store${Date.now()}`;
  const domain = `${domainSlug}-${crypto.randomBytes(2).toString('hex')}.nexuscommerce.io`;

  const store = await tx.store.create({
    data: {
      name: storeName,
      domain,
      currency: 'USD — US Dollar',
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
      currency: 'USD — US Dollar',
      industry: 'General Commerce',
      announcementText: '🎉 Welcome to your new Nexus Commerce store!',
      activeTheme: 'nexus-dark',
      primaryColor: '#FFBD2E',
      customDomain: domain,
    },
  });

  return { store, membership };
}

/** Single source of truth for which portal an authenticated user belongs to. */
function resolveAccountType(
  platformRole: PlatformRole | null | undefined,
  store: unknown
): 'ADMIN' | 'SELLER' | 'CUSTOMER' {
  if (platformRole) return 'ADMIN';
  return store ? 'SELLER' : 'CUSTOMER';
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
            plan: 'customer',
            isVerified: true,
          },
        });

        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

        const session = await tx.session.create({
          data: {
            sessionToken,
            userId: user.id,
            expiresAt,
            userAgent: req.headers['user-agent'] || null,
            ipAddress: req.ip || null,
          },
        });

        return { user, store: null, membership: null, sessionToken };
      });

      setSessionCookie(res, result.sessionToken);

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
          plan: 'starter',
          isVerified: true,
        },
      });

      const store = await tx.store.create({
        data: {
          name: data.storeName ? data.storeName.trim() : `${user.name}'s Store`,
          domain,
          currency: 'USD — US Dollar',
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
          currency: 'USD — US Dollar',
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
          sessionToken,
          userId: user.id,
          expiresAt,
          userAgent: req.headers['user-agent'] || null,
          ipAddress: req.ip || null,
        },
      });

      return { user, store, membership, sessionToken };
    });

    setSessionCookie(res, result.sessionToken);

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

    const activeMembership = user.memberships[0] || null;

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expiresAt,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
      },
    });

    setSessionCookie(res, sessionToken);

    const { passwordHash, ...safeUser } = user;

    const accountType = safeUser.platformRole
      ? 'ADMIN'
      : (activeMembership?.store ? 'SELLER' : 'CUSTOMER');

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

    const accountType = req.user.platformRole
      ? 'ADMIN'
      : (req.store && req.membership ? 'SELLER' : 'CUSTOMER');

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
        where: { sessionToken: token },
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
      const sessionToken = await createSessionFor(existingUser.id, req);
      setSessionCookie(res, sessionToken);

      const activeMembership = existingUser.memberships[0] || null;
      const { passwordHash, ...safeUser } = existingUser;

      res.json({
        success: true,
        message: 'Signed in successfully',
        data: {
          user: safeUser,
          store: activeMembership?.store || null,
          membership: activeMembership || null,
          accountType: resolveAccountType(safeUser.platformRole, activeMembership?.store),
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
            plan: 'customer',
            isVerified: true,
          },
        });
        return user;
      });

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
          plan: 'starter',
          isVerified: true,
        },
      });

      const { store, membership } = await provisionStoreForUser(tx, user, `${displayName}'s Store`);
      return { user, store, membership };
    });

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
