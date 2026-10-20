import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { Role, InvitationStatus } from '@prisma/client';
import crypto from 'crypto';
import { logAuditEvent } from '../utils/auditLogger.js';
import { escapeHtml } from '../utils/escapeHtml.js';

/**
 * Role assignment rules.
 *
 * `requireRole(['OWNER', 'ADMIN'])` on the routes answers "may this person
 * manage the team at all". It does **not** bound which role they may hand
 * out, and nothing else did either, so an ADMIN could:
 *
 *   - promote themselves to OWNER (`PATCH /team/members/:ownId/role`);
 *   - demote the actual OWNER to VIEWER — `removeMember` refuses to delete an
 *     OWNER, but the role endpoint happily neutralised one, after which the
 *     owner could not remove the ADMIN either; and
 *   - mint an OWNER-level invitation for an outside address.
 *
 * Any one of those is a complete store takeover by a staff-level account.
 *
 * The rules below are the missing half:
 *   1. only an OWNER may grant OWNER — ownership transfer is the owner's call;
 *   2. only an OWNER may change a member who currently holds OWNER;
 *   3. the last OWNER cannot be demoted, so a store always has one.
 */
const ASSIGNABLE_ROLES = [Role.OWNER, Role.ADMIN, Role.STAFF, Role.VIEWER] as const;

/**
 * Parse a role from request input.
 *
 * Previously `role.toUpperCase() as Role` — a cast, which checks nothing. A
 * non-string body value (`{"role": 1}`) threw a TypeError and surfaced as a
 * 500, and an unrecognised string reached Prisma and failed there instead of
 * being reported as the bad request it is.
 */
function parseRole(input: unknown, fallback?: Role): Role | null {
  if (input === undefined || input === null || input === '') return fallback ?? null;
  if (typeof input !== 'string') return null;
  const candidate = input.toUpperCase();
  return (ASSIGNABLE_ROLES as readonly string[]).includes(candidate) ? (candidate as Role) : null;
}

const ROLE_LIST = ASSIGNABLE_ROLES.join(', ');

export async function getTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;

    const [members, invitations] = await Promise.all([
      prisma.merchantMember.findMany({
        where: { merchantId },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true, plan: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.teamInvitation.findMany({
        where: { merchantId, status: InvitationStatus.PENDING },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formattedMembers = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      avatar: m.user.avatar || undefined,
      joinedAt: m.createdAt,
    }));

    const formattedInvitations = invitations.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      token: i.token,
      status: i.status.toLowerCase(),
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    }));

    res.json({
      success: true,
      data: {
        members: formattedMembers,
        invitations: formattedInvitations,
      },
    });
  } catch (err) {
    next(err);
  }
}

import { entitlementService } from '../services/billing/entitlement.service.js';

export async function createInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const user = req.user!;
    const { email, role } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: 'Email address is required for team invitation' });
      return;
    }

    const targetEmail = email.toLowerCase().trim();

    const assignedRole = parseRole(role, Role.STAFF);
    if (!assignedRole) {
      res.status(400).json({ success: false, error: `Invalid role. Expected one of: ${ROLE_LIST}` });
      return;
    }

    // Only an owner may invite another owner.
    //
    // Checked before the entitlement call on purpose: "you are not allowed to
    // do this" does not depend on the plan, and running the billing check
    // first meant a store at its seat limit answered LIMIT_EXCEEDED to an
    // attempted privilege escalation — the right status for the wrong reason,
    // and one that would start permitting it the moment the plan was upgraded.
    if (assignedRole === Role.OWNER && req.memberRole !== Role.OWNER) {
      res.status(403).json({
        success: false,
        error: 'Only the merchant owner can invite someone as OWNER.',
      });
      return;
    }

    await entitlementService.assertCanAddTeamMember(merchantId);

    // Check if user is already a member
    const existingMember = await prisma.merchantMember.findFirst({
      where: {
        merchantId,
        user: { email: targetEmail },
      },
    });

    if (existingMember) {
      res.status(400).json({ success: false, error: `${targetEmail} is already a member of this merchant` });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.teamInvitation.create({
      data: {
        merchantId,
        email: targetEmail,
        role: assignedRole,
        token,
        status: InvitationStatus.PENDING,
        expiresAt,
        invitedBy: user.email,
      },
    });

    // Enqueue transactional invitation email
    try {
      const { emailService } = await import('../services/email/email.service.js');
      await emailService.sendEmail({
        to: targetEmail,
        subject: `Invitation to join ${req.merchant!.name} on Nexus Commerce`,
        // Escaped: the inviter chooses `user.name` and the recipient is a
        // third party, so raw markup here is attacker-authored content inside
        // a genuine Nexus email.
        html: `<p>Hi,</p><p>You have been invited by ${escapeHtml(user.name)} to join <strong>${escapeHtml(req.merchant!.name)}</strong> as a <strong>${assignedRole}</strong>.</p><p>Invitation Token: <code>${escapeHtml(token)}</code></p>`,
        text: `You have been invited by ${user.name} to join ${req.merchant!.name} as a ${assignedRole}. Token: ${token}`,
      });
    } catch (e) {
      // non-blocking
    }

    await logAuditEvent({
      merchantId,
      userId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'TEAM_INVITATION_CREATED',
      resource: 'team',
      resourceId: invitation.id,
      metadata: { targetEmail, role: assignedRole },
    });

    const inviteLink = `${process.env.APP_URL || 'http://localhost:5173'}/accept-invite?token=${token}`;

    res.status(201).json({
      success: true,
      data: {
        invitation,
        inviteLink,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function resendInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;

    const invitation = await prisma.teamInvitation.findFirst({
      where: { id, merchantId, status: InvitationStatus.PENDING },
    });

    if (!invitation) {
      res.status(404).json({ success: false, error: 'Pending invitation not found' });
      return;
    }

    try {
      const { emailService } = await import('../services/email/email.service.js');
      await emailService.sendEmail({
        to: invitation.email,
        subject: `Reminder: Invitation to join ${req.merchant!.name}`,
        html: `<p>Reminder: Token for ${escapeHtml(req.merchant!.name)}: <code>${escapeHtml(invitation.token)}</code></p>`,
        text: `Reminder: Invitation token for ${req.merchant!.name}: ${invitation.token}`,
      });
    } catch (e) {
      // non-blocking
    }

    res.json({ success: true, message: `Invitation email resent to ${invitation.email}` });
  } catch (err) {
    next(err);
  }
}

export async function revokeInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;
    const user = req.user!;

    const invitation = await prisma.teamInvitation.findFirst({
      where: { id, merchantId },
    });

    if (!invitation) {
      res.status(404).json({ success: false, error: 'Invitation not found' });
      return;
    }

    await prisma.teamInvitation.update({
      where: { id },
      data: { status: InvitationStatus.REVOKED },
    });

    await logAuditEvent({
      merchantId,
      userId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'TEAM_INVITATION_REVOKED',
      resource: 'team',
      resourceId: id,
      metadata: { email: invitation.email },
    });

    res.json({ success: true, message: 'Invitation revoked successfully' });
  } catch (err) {
    next(err);
  }
}

export async function acceptInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.body;
    const user = req.user!;

    if (!token) {
      res.status(400).json({ success: false, error: 'Invitation token is required' });
      return;
    }

    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      include: { merchant: true },
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      res.status(400).json({ success: false, error: 'Invalid or already processed invitation token' });
      return;
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      res.status(400).json({ success: false, error: 'Invitation token has expired' });
      return;
    }

    /**
     * The invitation is addressed to someone, and only they may redeem it.
     *
     * Without this the token was a pure bearer credential: an invitation sent
     * to finance@acme.test could be redeemed by *any* signed-in Nexus account
     * that came to hold the string — a forwarded email, a shared inbox, a
     * screenshot in a support thread — and that account then held the role
     * the owner intended for someone else. The token stays secret; this makes
     * it secret *and* bound.
     */
    if (invitation.email.toLowerCase() !== (user.email || '').toLowerCase()) {
      res.status(403).json({
        success: false,
        error: `This invitation was sent to ${invitation.email}. Sign in with that account to accept it.`,
      });
      return;
    }

    // Add user as MerchantMember
    const membership = await prisma.merchantMember.upsert({
      where: {
        userId_merchantId: { userId: user.id, merchantId: invitation.merchantId },
      },
      create: {
        userId: user.id,
        merchantId: invitation.merchantId,
        role: invitation.role,
      },
      update: {
        role: invitation.role,
      },
    });

    await prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.ACCEPTED },
    });

    await logAuditEvent({
      merchantId: invitation.merchantId,
      userId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'TEAM_MEMBER_JOINED',
      resource: 'team',
      resourceId: membership.id,
      metadata: { role: invitation.role },
    });

    res.json({
      success: true,
      message: `Successfully joined ${invitation.merchant.name} as ${invitation.role}`,
      data: { member: membership },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;
    const { role } = req.body;
    const user = req.user!;

    const member = await prisma.merchantMember.findFirst({
      where: { id, merchantId },
      include: { user: true },
    });

    if (!member) {
      res.status(404).json({ success: false, error: 'Team member not found' });
      return;
    }

    const newRole = parseRole(role);
    if (!newRole) {
      res.status(400).json({ success: false, error: `Invalid role. Expected one of: ${ROLE_LIST}` });
      return;
    }

    const actorIsOwner = req.memberRole === Role.OWNER;

    // Granting ownership is the owner's decision alone.
    if (newRole === Role.OWNER && !actorIsOwner) {
      res.status(403).json({
        success: false,
        error: 'Only the merchant owner can grant the OWNER role.',
      });
      return;
    }

    // ...and so is changing what the current owner holds.
    if (member.role === Role.OWNER && !actorIsOwner) {
      res.status(403).json({
        success: false,
        error: "Only the merchant owner can change the owner's role.",
      });
      return;
    }

    /**
     * A store must keep an owner.
     *
     * Checked against the live count rather than assuming one: ownership can
     * be transferred by promoting a second owner first, and that sequence has
     * to stay possible.
     */
    if (member.role === Role.OWNER && newRole !== Role.OWNER) {
      const owners = await prisma.merchantMember.count({
        where: { merchantId, role: Role.OWNER },
      });
      if (owners <= 1) {
        res.status(400).json({
          success: false,
          error: 'This merchant has only one owner. Promote another member to OWNER first.',
        });
        return;
      }
    }

    if (member.role === newRole) {
      res.json({ success: true, data: member });
      return;
    }

    const updated = await prisma.merchantMember.update({
      where: { id },
      data: { role: newRole },
    });

    await logAuditEvent({
      merchantId,
      userId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'TEAM_ROLE_CHANGED',
      resource: 'team',
      resourceId: id,
      metadata: { targetUser: member.user.email, fromRole: member.role, toRole: newRole },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;
    const user = req.user!;

    const member = await prisma.merchantMember.findFirst({
      where: { id, merchantId },
      include: { user: true },
    });

    if (!member) {
      res.status(404).json({ success: false, error: 'Team member not found' });
      return;
    }

    if (member.role === Role.OWNER) {
      res.status(400).json({ success: false, error: 'Merchant OWNER cannot be removed from team' });
      return;
    }

    await prisma.merchantMember.delete({ where: { id } });

    await logAuditEvent({
      merchantId,
      userId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'TEAM_MEMBER_REMOVED',
      resource: 'team',
      resourceId: id,
      metadata: { targetUser: member.user.email },
    });

    res.json({ success: true, message: 'Team member removed' });
  } catch (err) {
    next(err);
  }
}
