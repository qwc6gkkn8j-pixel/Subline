import { prisma } from './db.js';

export async function logAudit(opts: {
  userId: string;
  action: 'created' | 'updated' | 'deleted';
  entityType: 'user' | 'client' | 'subscription';
  entityId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        details: opts.details ?? undefined,
      },
    });
  } catch (err) {
    // Audit failure must never break the main flow
    console.error('audit log failed', err);
  }
}
