// ─────────────────────────────────────────────────────────────────────────────
// Appointment lifecycle — shared helpers for cancellation refund/penalty.
//
// Used by:
//   - PUT /api/barber/appointments/:id/status (barber cancels)
//   - PUT /api/client/appointments/:id/cancel (client cancels)
//
// Rules (from spec):
//   • > 60 min antes da hora marcada:
//       - Se já existia um Cut associado a esta marcação → devolver
//         (decrementar cutsUsed e apagar Cut). Notificar "corte devolvido".
//       - Se ainda não havia Cut → não cobrar nada. Notificação neutra.
//   • ≤ 60 min antes da hora marcada (cancelamento "tardio"):
//       - Se ainda não havia Cut e o cliente tem subscrição com cortes
//         disponíveis → cobrar um corte (incrementar cutsUsed, criar Cut).
//         Notificar "corte não devolvido".
//       - Se já havia Cut → manter consumido. Notificação "corte não
//         devolvido".
// ─────────────────────────────────────────────────────────────────────────────

import type { Prisma } from '@prisma/client';

interface SubscriptionLite {
  id: string;
  cutsUsed: number;
  cutsTotal: number;
}

export interface AppointmentForCancellation {
  id: string;
  date: Date;
  startTime: string; // "HH:MM"
  client: {
    id: string;
    userId: string;
    name: string;
    subscriptions: SubscriptionLite[];
  };
}

export interface CancellationOutcome {
  refunded: boolean;
  charged: boolean;
  moreThanHour: boolean;
}

/** Minutes from now until the appointment's scheduled start time. */
function minutesUntil(appt: { date: Date; startTime: string }): number {
  const [hh, mm] = appt.startTime.split(':').map(Number);
  const apptDate = new Date(appt.date);
  apptDate.setHours(hh, mm, 0, 0);
  return (apptDate.getTime() - Date.now()) / 60000;
}

/**
 * Applies the cancellation refund/penalty rules and notifies the client.
 * Caller is responsible for then updating the appointment row itself
 * (status, cancelledBy, cancelledAt). This helper only touches Cut,
 * Subscription and Notification.
 */
export async function applyCancellationCutLogic(
  tx: Prisma.TransactionClient,
  appt: AppointmentForCancellation,
): Promise<CancellationOutcome> {
  const moreThanHour = minutesUntil(appt) > 60;
  const sub = appt.client.subscriptions[0];
  const existingCut = await tx.cut.findUnique({
    where: { appointmentId: appt.id },
  });

  let refunded = false;
  let charged = false;

  if (existingCut && sub) {
    // Edge case: appointment had been completed and a Cut was registered.
    if (moreThanHour) {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { cutsUsed: { decrement: 1 } },
      });
      await tx.cut.delete({ where: { id: existingCut.id } });
      refunded = true;
    }
    // ≤60min: keep the cut consumed (no action).
  } else if (!existingCut && sub && !moreThanHour) {
    // Late cancellation of a still-pending/confirmed appointment.
    // Charge a cut as penalty, only if the subscription has room.
    const hasRoom = sub.cutsTotal === 0 || sub.cutsUsed < sub.cutsTotal;
    if (hasRoom) {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { cutsUsed: { increment: 1 } },
      });
      await tx.cut.create({
        data: { subscriptionId: sub.id, appointmentId: appt.id },
      });
      charged = true;
    }
  }

  // Notify the client describing the outcome.
  const body = refunded
    ? 'Marcação cancelada — corte devolvido.'
    : charged
      ? 'Marcação cancelada — corte não devolvido (menos de 1h de antecedência).'
      : moreThanHour
        ? 'Marcação cancelada com sucesso.'
        : 'Marcação cancelada — menos de 1h de antecedência.';

  await tx.notification.create({
    data: {
      userId: appt.client.userId,
      type: 'appointment_cancelled',
      title: 'Marcação cancelada',
      body,
      data: { appointmentId: appt.id, refunded, charged },
    },
  });

  return { refunded, charged, moreThanHour };
}
