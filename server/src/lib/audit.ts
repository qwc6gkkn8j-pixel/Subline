import type { Prisma } from '@prisma/client';
import { prisma } from './db.js';

export async function logAudit(opts: {
  userId: string;
  action: 'created' | 'updated' | 'deleted';
  entityType: 'user' | 'client' | 'subscription' | 'plan' | 'appointment' | 'ticket';
  entityId: string;
  details?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        ...(opts.details !== undefined ? { details: opts.details } : {}),
      },
    });
  } catch (err) {
    // Audit failure must never break the main flow
    console.error('audit log failed', err);
  }
}
