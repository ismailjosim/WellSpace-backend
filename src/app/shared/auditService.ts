import { prisma } from '@/config/prisma.config';
import type { Request } from 'express';

interface AuditParams {
  req?: Request;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  oldData?: any;
  newData?: any;
}

export const logAuditEvent = async ({
  req,
  userId,
  userEmail,
  userRole,
  action,
  resourceType,
  resourceId,
  oldData,
  newData,
}: AuditParams) => {
  try {
    const actorUser = (req as any)?.user;
    const finalUserId = userId || actorUser?.userId || null;
    const finalEmail = userEmail || actorUser?.email || null;
    const finalRole = userRole || actorUser?.role || 'SYSTEM';

    await prisma.auditLog.create({
      data: {
        userId: finalUserId,
        userEmail: finalEmail,
        userRole: finalRole,
        action,
        resourceType,
        resourceId,
        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
        newData: newData ? JSON.parse(JSON.stringify(newData)) : undefined,
        ipAddress: req?.ip || req?.socket?.remoteAddress || null,
        userAgent: (req?.headers['user-agent'] as string) || null,
      },
    });
  } catch (error) {
    console.error('[AuditService Error] Failed to write audit log:', error);
  }
};

export const AuditService = {
  logAuditEvent,
};
