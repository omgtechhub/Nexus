import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { DomainStatus } from '@prisma/client';
import crypto from 'crypto';
import dns from 'dns';
import { promisify } from 'util';
import { logAuditEvent } from '../utils/auditLogger.js';

const resolveTxtAsync = promisify(dns.resolveTxt);
const resolveCnameAsync = promisify(dns.resolveCname);

/**
 * The host a custom domain is expected to CNAME to.
 *
 * Configurable because it differs per deployment, with the production default
 * as the fallback.
 */
const PLATFORM_CNAME_TARGET = (process.env.PLATFORM_CNAME_TARGET || 'shops.nexuscommerce.io')
  .toLowerCase()
  .replace(/\.$/, '');

/** Exact host, or a subdomain of it — never a substring match. */
function isPlatformCnameTarget(candidate: string): boolean {
  const host = (candidate || '').toLowerCase().replace(/\.$/, '');
  return host === PLATFORM_CNAME_TARGET || host.endsWith(`.${PLATFORM_CNAME_TARGET}`);
}

/**
 * A registrable hostname, and nothing else.
 *
 * `domain` arrived unvalidated, so the table accepted arbitrary strings, and
 * `resolveTxt` was then called on whatever was stored. Labels are
 * alphanumeric with inner hyphens; at least two of them; no trailing dot.
 */
const HOSTNAME_PATTERN =
  /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

/** Hosts a merchant may never claim: they resolve to platform infrastructure. */
const RESERVED_DOMAIN_SUFFIXES = (process.env.RESERVED_DOMAINS || 'nexuscommerce.io')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

function isReservedDomain(host: string): boolean {
  return RESERVED_DOMAIN_SUFFIXES.some((r) => host === r || host.endsWith(`.${r}`));
}

export async function getDomains(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const domains = await prisma.customDomain.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: domains });
  } catch (err) {
    next(err);
  }
}

import { entitlementService } from '../services/billing/entitlement.service.js';

export async function addDomain(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    await entitlementService.assertCustomDomainAllowed(storeId);
    const user = req.user!;
    const { domain } = req.body;

    if (!domain) {
      res.status(400).json({ success: false, error: 'Domain name is required' });
      return;
    }

    if (typeof domain !== 'string') {
      res.status(400).json({ success: false, error: 'Domain name is required' });
      return;
    }

    const cleanDomain = domain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/\.$/, '');

    if (!HOSTNAME_PATTERN.test(cleanDomain) || cleanDomain.length > 253) {
      res.status(400).json({
        success: false,
        error: 'Enter a valid domain name, for example shop.example.com.',
      });
      return;
    }

    // A merchant claiming a platform hostname would be handed a verified
    // record for infrastructure it does not own.
    if (isReservedDomain(cleanDomain)) {
      res.status(400).json({
        success: false,
        error: 'That domain is reserved by the platform and cannot be added.',
      });
      return;
    }

    // Prevent duplicate domain across all stores
    const existing = await prisma.customDomain.findUnique({
      where: { domain: cleanDomain },
    });

    if (existing) {
      res.status(400).json({ success: false, error: `Domain ${cleanDomain} is already registered by another store` });
      return;
    }

    const token = `nexus-verify-${crypto.randomBytes(8).toString('hex')}`;

    const newDomain = await prisma.customDomain.create({
      data: {
        storeId,
        domain: cleanDomain,
        status: DomainStatus.PENDING,
        verificationToken: token,
        isPrimary: false,
      },
    });

    await logAuditEvent({
      storeId,
      userId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'DOMAIN_ADDED',
      resource: 'domain',
      resourceId: newDomain.id,
      metadata: { domain: cleanDomain },
    });

    res.status(201).json({ success: true, data: newDomain });
  } catch (err) {
    next(err);
  }
}

export async function verifyDomain(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;
    const user = req.user!;

    const customDomain = await prisma.customDomain.findFirst({
      where: { id, storeId },
    });

    if (!customDomain) {
      res.status(404).json({ success: false, error: 'Custom domain record not found' });
      return;
    }

    let isDnsVerified = false;

    // Real DNS TXT / CNAME Lookup check
    try {
      const txtRecords = await resolveTxtAsync(`_nexus-verification.${customDomain.domain}`);
      const flatTxt = txtRecords.flat().join(' ');
      if (flatTxt.includes(customDomain.verificationToken)) {
        isDnsVerified = true;
      }
    } catch (e) {
      // Fallback CNAME check
      try {
        /**
         * The CNAME must point at this platform's ingress host, not merely
         * contain "nexus" or "shops" somewhere in it — `nexus.attacker.test`
         * satisfied that substring test.
         */
        const cnames = await resolveCnameAsync(customDomain.domain);
        if (cnames.some((c) => isPlatformCnameTarget(c))) {
          isDnsVerified = true;
        }
      } catch (cnameErr) {
        /**
         * No fallback in a real deployment. A domain is verified by DNS or it
         * is not verified.
         *
         * What stood here was a "dev fallback" that was never gated on the
         * environment:
         *
         *     domain.includes('example.com') || domain.includes('auraapparel')
         *       || domain.includes('nexus') || NODE_ENV === 'test'
         *
         * Three of those four clauses were live in production. Any seller
         * could add a hostname containing the substring `nexus` — including
         * `nexuscommerce.io` itself — and have it marked ACTIVE with no DNS
         * record anywhere, because the lookups fail for a domain you do not
         * control and failure was the branch that granted verification.
         *
         * Only the test environment is exempt now, and explicitly so.
         */
        if (process.env.NODE_ENV === 'test') {
          isDnsVerified = true;
        }
      }
    }

    if (isDnsVerified) {
      const updated = await prisma.customDomain.update({
        where: { id },
        data: {
          status: DomainStatus.ACTIVE,
          verifiedAt: new Date(),
        },
      });

      await logAuditEvent({
        storeId,
        userId: user.id,
        actorName: user.name,
        actorEmail: user.email,
        action: 'DOMAIN_VERIFIED',
        resource: 'domain',
        resourceId: id,
        metadata: { domain: customDomain.domain },
      });

      res.json({
        success: true,
        message: `DNS records verified successfully for ${customDomain.domain}!`,
        data: updated,
      });
    } else {
      res.status(400).json({
        success: false,
        error: `DNS verification failed for ${customDomain.domain}. Add TXT record "_nexus-verification.${customDomain.domain}" with value "${customDomain.verificationToken}" or CNAME record pointing to shops.nexuscommerce.io`,
      });
    }
  } catch (err) {
    next(err);
  }
}

export async function setPrimaryDomain(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;
    const user = req.user!;

    const customDomain = await prisma.customDomain.findFirst({
      where: { id, storeId },
    });

    if (!customDomain) {
      res.status(404).json({ success: false, error: 'Custom domain not found' });
      return;
    }

    await prisma.$transaction([
      prisma.customDomain.updateMany({
        where: { storeId },
        data: { isPrimary: false },
      }),
      prisma.customDomain.update({
        where: { id },
        data: { isPrimary: true },
      }),
      prisma.storeSettings.update({
        where: { storeId },
        data: { customDomain: customDomain.domain },
      }),
    ]);

    await logAuditEvent({
      storeId,
      userId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'PRIMARY_DOMAIN_CHANGED',
      resource: 'domain',
      resourceId: id,
      metadata: { primaryDomain: customDomain.domain },
    });

    res.json({
      success: true,
      message: `${customDomain.domain} is now the primary domain for your store.`,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteDomain(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;
    const user = req.user!;

    const customDomain = await prisma.customDomain.findFirst({
      where: { id, storeId },
    });

    if (!customDomain) {
      res.status(404).json({ success: false, error: 'Custom domain not found' });
      return;
    }

    await prisma.customDomain.delete({ where: { id } });

    await logAuditEvent({
      storeId,
      userId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'DOMAIN_DELETED',
      resource: 'domain',
      resourceId: id,
      metadata: { domain: customDomain.domain },
    });

    res.json({ success: true, message: 'Custom domain deleted' });
  } catch (err) {
    next(err);
  }
}
