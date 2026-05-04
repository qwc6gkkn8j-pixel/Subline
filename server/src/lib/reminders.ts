import { prisma } from './db.js';

/**
 * Generate appointment reminders for appointments happening within the next 24-48 hours.
 * Sends reminders to clients and (optionally) to assigned staff members.
 *
 * Returns count of reminders sent.
 */
export async function sendAppointmentReminders(): Promise<number> {
  const now = new Date();

  // Window: appointments from 20 hours from now to 28 hours from now
  // This gives a reasonable 24h reminder window without spamming
  const remindFrom = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  const remindTo = new Date(now.getTime() + 28 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      // Appointment date is tomorrow (roughly)
      date: {
        gte: new Date(remindFrom.toISOString().split('T')[0]),
        lte: new Date(remindTo.toISOString().split('T')[0]),
      },
      // Not cancelled
      status: { not: 'cancelled' },
      // Not yet reminded
      reminderSentAt: null,
    },
    include: {
      client: { include: { user: true } },
      barber: true,
      staffMember: null,
    },
  });

  let count = 0;

  for (const appt of appointments) {
    try {
      // Create notification for the client
      await prisma.notification.create({
        data: {
          userId: appt.client.userId,
          type: 'appointment_reminder',
          title: `Marcação amanhã às ${appt.startTime}`,
          body: `Lembrete: tens uma marcação com ${appt.barber.name} amanhã às ${appt.startTime}.`,
          data: {
            appointmentId: appt.id,
            barberId: appt.barberId,
            clientId: appt.clientId,
            deepLink: `/client/calendar?appointmentId=${appt.id}`,
          },
        },
      });

      // Mark reminder as sent
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      });

      count++;
    } catch (err) {
      // Log error but continue with other appointments
      console.error(`Failed to send reminder for appointment ${appt.id}:`, err);
    }
  }

  return count;
}
