import { prisma } from '../prisma.js';

export async function logAuditEvent(params: {
  merchantId: string;
  userId?: string;
  actorName: string;
  actorEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: any;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        merchantId: params.merchantId,
        userId: params.userId,
        actorName: params.actorName,
        actorEmail: params.actorEmail,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: params.metadata || undefined,
      },
    });
  } catch (e) {
    console.error('Failed to record audit log:', e);
  }
}
