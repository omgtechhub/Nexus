import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { Role, InvitationStatus } from '@prisma/client';
import crypto from 'crypto';
import { logAuditEvent } from '../utils/auditLogger.js';

export async function getTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;

    const [members, invitations] = await Promise.all([
      prisma.storeMember.findMany({
        where: { storeId },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true, plan: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.teamInvitation.findMany({
        where: { storeId, status: InvitationStatus.PENDING },
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
    const storeId = req.store!.id;
    await entitlementService.assertCanAddTeamMember(storeId);
    const user = req.user!;
    const { email, role } = req.body;

    if (!email) {
      res.status(400).json({ success: false, error: 'Email address is required for team invitation' });
      return;
    }

    const targetEmail = email.toLowerCase().trim();
    const assignedRole = (role ? role.toUpperCase() : 'STAFF') as Role;

    // Check if user is already a member
    const existingMember = await prisma.storeMember.findFirst({
      where: {
        storeId,
        user: { email: targetEmail },
      },
    });

    if (existingMember) {
      res.status(400).json({ success: false, error: `${targetEmail} is already a member of this store` });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.teamInvitation.create({
      data: {
        storeId,
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
        subject: `Invitation to join ${req.store!.name} on Nexus Commerce`,
        html: `<p>Hi,</p><p>You have been invited by ${user.name} to join <strong>${req.store!.name}</strong> as a <strong>${assignedRole}</strong>.</p><p>Invitation Token: <code>${token}</code></p>`,
        text: `You have been invited by ${user.name} to join ${req.store!.name} as a ${assignedRole}. Token: ${token}`,
      });
    } catch (e) {
      // non-blocking
    }

    await logAuditEvent({
      storeId,
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
    const storeId = req.store!.id;
    const { id } = req.params;

    const invitation = await prisma.teamInvitation.findFirst({
      where: { id, storeId, status: InvitationStatus.PENDING },
    });

    if (!invitation) {
      res.status(404).json({ success: false, error: 'Pending invitation not found' });
      return;
    }

    try {
      const { emailService } = await import('../services/email/email.service.js');
      await emailService.sendEmail({
        to: invitation.email,
        subject: `Reminder: Invitation to join ${req.store!.name}`,
        html: `<p>Reminder: Token for ${req.store!.name}: <code>${invitation.token}</code></p>`,
        text: `Reminder: Invitation token for ${req.store!.name}: ${invitation.token}`,
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
    const storeId = req.store!.id;
    const { id } = req.params;
    const user = req.user!;

    const invitation = await prisma.teamInvitation.findFirst({
      where: { id, storeId },
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
      storeId,
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
      include: { store: true },
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

    // Add user as StoreMember
    const membership = await prisma.storeMember.upsert({
      where: {
        userId_storeId: { userId: user.id, storeId: invitation.storeId },
      },
      create: {
        userId: user.id,
        storeId: invitation.storeId,
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
      storeId: invitation.storeId,
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
      message: `Successfully joined ${invitation.store.name} as ${invitation.role}`,
      data: { member: membership },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.store!.id;
    const { id } = req.params;
    const { role } = req.body;
    const user = req.user!;

    const member = await prisma.storeMember.findFirst({
      where: { id, storeId },
      include: { user: true },
    });

    if (!member) {
      res.status(404).json({ success: false, error: 'Team member not found' });
      return;
    }

    const newRole = role.toUpperCase() as Role;

    const updated = await prisma.storeMember.update({
      where: { id },
      data: { role: newRole },
    });

    await logAuditEvent({
      storeId,
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
    const storeId = req.store!.id;
    const { id } = req.params;
    const user = req.user!;

    const member = await prisma.storeMember.findFirst({
      where: { id, storeId },
      include: { user: true },
    });

    if (!member) {
      res.status(404).json({ success: false, error: 'Team member not found' });
      return;
    }

    if (member.role === Role.OWNER) {
      res.status(400).json({ success: false, error: 'Store OWNER cannot be removed from team' });
      return;
    }

    await prisma.storeMember.delete({ where: { id } });

    await logAuditEvent({
      storeId,
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
