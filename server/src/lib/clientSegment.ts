import type { ClientSegment } from '@prisma/client';
import { prisma } from './db.js';

/**
 * Recalculates and persists the segment for a client based on their
 * visit frequency and subscription status:
 *   vip       — active subscription + ≥3 completed visits in last 30 days
 *   mensal    — active subscription + 1–2 visits in last 30 days
 *   ocasional — some activity but no active subscription
 *   inativo   — no completed visit in the last 60 days
 */
export async function recalculateClientSegment(clientId: string): Promise<ClientSegment> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      subscriptions: { where: { status: 'active' }, take: 1 },
      appointments: {
        where: { status: 'completed' },
        orderBy: { date: 'desc' },
        take: 30,
        select: { date: true },
      },
    },
  });

  if (!client) throw new Error(`Client ${clientId} not found`);

  const hasActiveSub = client.subscriptions.length > 0;
  const lastVisit = client.appointments[0];

  let segment: ClientSegment;

  if (!lastVisit || new Date(lastVisit.date) < sixtyDaysAgo) {
    segment = 'inativo';
  } else {
    const recentVisits = client.appointments.filter(
      (a) => new Date(a.date) >= thirtyDaysAgo,
    ).length;

    if (hasActiveSub && recentVisits >= 3) segment = 'vip';
    else if (hasActiveSub && recentVisits >= 1) segment = 'mensal';
    else segment = 'ocasional';
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { segment, segmentUpdatedAt: now },
  });

  return segment;
}
