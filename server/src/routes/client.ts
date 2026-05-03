import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { env } from '../lib/env.js';
import { BadRequest, Forbidden, NotFound } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { computeAvailableSlots } from '../lib/calendar.js';
import { applyCancellationCutLogic } from '../lib/appointmentLifecycle.js';

export const clientRouter = Router();
clientRouter.use(requireAuth, requireRole('client'));

function ensureClientId(req: { auth?: { clientId?: string } }): string {
  if (!req.auth?.clientId) throw Forbidden('Client profile not found for this user');
  return req.auth.clientId;
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/client/subscription
// ────────────────────────────────────────────────────────────────────────────
clientRouter.get(
  '/subscription',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const subscription = await prisma.subscription.findFirst({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ subscription });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/client/payments
// ────────────────────────────────────────────────────────────────────────────
clientRouter.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
    const where = { subscription: { clientId } };
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { subscription: { select: { planType: true } } },
      }),
      prisma.payment.count({ where }),
    ]);
    res.json({ payments, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/client/barber
// ────────────────────────────────────────────────────────────────────────────
clientRouter.get(
  '/barber',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        barber: {
          include: { user: { select: { email: true } } },
        },
      },
    });
    res.json({ barber: client?.barber ?? null });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/client/profile
// ────────────────────────────────────────────────────────────────────────────
clientRouter.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { user: { select: { email: true, fullName: true, createdAt: true } } },
    });
    res.json({ client });
  }),
);

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
});

clientRouter.put(
  '/profile',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const data = updateProfileSchema.parse(req.body);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw NotFound();

    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: clientId },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.email ? { email: data.email.toLowerCase() } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
        },
      });
      await tx.user.update({
        where: { id: client.userId },
        data: {
          ...(data.name ? { fullName: data.name } : {}),
          ...(data.email ? { email: data.email.toLowerCase() } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
        },
      });
    });

    res.json({ message: 'Profile updated' });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/client/password
// ────────────────────────────────────────────────────────────────────────────
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

clientRouter.put(
  '/password',
  asyncHandler(async (req, res) => {
    const data = passwordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) throw NotFound();
    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) throw BadRequest('Current password is incorrect');
    const passwordHash = await bcrypt.hash(data.newPassword, env.BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.json({ message: 'Password changed' });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/client/subscription/cancel
// ────────────────────────────────────────────────────────────────────────────
const cancelSchema = z.object({ reason: z.string().optional() });

clientRouter.post(
  '/subscription/cancel',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const data = cancelSchema.parse(req.body);
    const sub = await prisma.subscription.findFirst({
      where: { clientId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub) throw NotFound('No active subscription found');
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'cancelled' } });
    res.json({ message: 'Cancellation requested', cancellationId: sub.id, reason: data.reason });
  }),
);

// ════════════════════════════════════════════════════════════════════════════
// V3 — Plans, Appointments, Calendar, Chat, Tickets, Cuts
// ════════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────────────
// GET /api/client/plans — list plans available from this client's barber
// ────────────────────────────────────────────────────────────────────────────
clientRouter.get(
  '/plans',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client?.barberId) {
      return res.json({ plans: [] });
    }
    const plans = await prisma.plan.findMany({
      where: { barberId: client.barberId, isActive: true },
      orderBy: { price: 'asc' },
    });
    res.json({ plans });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/client/cuts — own cut history (across subscriptions)
// ────────────────────────────────────────────────────────────────────────────
clientRouter.get(
  '/cuts',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const subs = await prisma.subscription.findMany({
      where: { clientId },
      select: { id: true },
    });
    const cuts = await prisma.cut.findMany({
      where: { subscriptionId: { in: subs.map((s) => s.id) } },
      orderBy: { performedAt: 'desc' },
      take: 50,
    });
    res.json({ cuts });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS
// ────────────────────────────────────────────────────────────────────────────
const apptListQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

clientRouter.get(
  '/appointments',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const params = apptListQuery.parse(req.query);
    const where: Record<string, unknown> = { clientId };
    if (params.from || params.to) {
      where.date = {
        ...(params.from ? { gte: new Date(params.from) } : {}),
        ...(params.to ? { lte: new Date(params.to) } : {}),
      };
    }
    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: { barber: { select: { id: true, name: true } } },
    });
    res.json({ appointments });
  }),
);

const bookSchema = z.object({
  service: z.enum(['haircut', 'beard', 'haircut_beard', 'other']).default('haircut'),
  date: z.string(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.coerce.number().int().positive().default(30),
  clientNotes: z.string().optional(),
});

clientRouter.post(
  '/appointments',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const data = bookSchema.parse(req.body);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client?.barberId) throw BadRequest('No barber assigned');

    const [hh, mm] = data.startTime.split(':').map(Number);
    const endMinutes = hh * 60 + mm + data.durationMinutes;
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

    const appointment = await prisma.appointment.create({
      data: {
        barberId: client.barberId,
        clientId,
        service: data.service,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime,
        durationMinutes: data.durationMinutes,
        clientNotes: data.clientNotes ?? null,
        status: 'pending',
      },
    });

    // Notify barber
    const barber = await prisma.barber.findUnique({ where: { id: client.barberId } });
    if (barber) {
      await prisma.notification.create({
        data: {
          userId: barber.userId,
          type: 'appointment_request',
          title: 'Nova marcação pendente',
          body: `${client.name} pediu marcação para ${data.date} às ${data.startTime}.`,
          data: { appointmentId: appointment.id },
        },
      });
    }
    res.status(201).json({ appointment });
  }),
);

clientRouter.put(
  '/appointments/:appointmentId/cancel',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.appointmentId, clientId },
      include: {
        client: {
          select: {
            id: true,
            userId: true,
            name: true,
            subscriptions: {
              where: { status: 'active' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    if (!existing) throw NotFound('Appointment not found');

    // Already cancelled — short-circuit so we don't double-refund.
    if (existing.status === 'cancelled') {
      return res.json({ message: 'Appointment already cancelled' });
    }

    await prisma.$transaction(async (tx) => {
      await applyCancellationCutLogic(tx, {
        id: existing.id,
        date: existing.date,
        startTime: existing.startTime,
        client: {
          id: existing.client.id,
          userId: existing.client.userId,
          name: existing.client.name,
          subscriptions: existing.client.subscriptions.map((s) => ({
            id: s.id,
            cutsUsed: s.cutsUsed,
            cutsTotal: s.cutsTotal,
          })),
        },
      });
      await tx.appointment.update({
        where: { id: existing.id },
        data: { status: 'cancelled', cancelledBy: 'client', cancelledAt: new Date() },
      });
    });

    res.json({ message: 'Appointment cancelled' });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// SLOTS — see barber's free slots for a date
// ────────────────────────────────────────────────────────────────────────────
clientRouter.get(
  '/calendar/slots',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const dateStr = typeof req.query.date === 'string' ? req.query.date : null;
    if (!dateStr) throw BadRequest('Missing date query parameter');
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client?.barberId) return res.json({ date: dateStr, slots: [] });

    const date = new Date(dateStr);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [rules, appointments, unavailable] = await Promise.all([
      prisma.barberAvailability.findMany({
        where: { barberId: client.barberId, isActive: true },
      }),
      prisma.appointment.findMany({
        where: {
          barberId: client.barberId,
          date: { gte: dayStart, lte: dayEnd },
          status: { not: 'cancelled' },
        },
        select: { startTime: true, endTime: true },
      }),
      prisma.barberUnavailable.findMany({
        where: { barberId: client.barberId, dateFrom: { lte: dayEnd }, dateTo: { gte: dayStart } },
      }),
    ]);

    const slots = computeAvailableSlots({
      date,
      rules,
      booked: appointments,
      unavailable,
    });
    res.json({ date: dateStr, slots });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// CHAT — conversations + messages
// ────────────────────────────────────────────────────────────────────────────
clientRouter.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const conversations = await prisma.conversation.findMany({
      where: { clientId, type: 'barber_client' },
      orderBy: { updatedAt: 'desc' },
      include: {
        barber: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: {
          select: {
            messages: { where: { isRead: false, NOT: { senderRole: 'client' } } },
          },
        },
      },
    });
    res.json({ conversations });
  }),
);

// Auto-create or fetch the conversation with the client's assigned barber.
clientRouter.post(
  '/conversations/with-barber',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client?.barberId) throw BadRequest('No barber assigned');
    const existing = await prisma.conversation.findFirst({
      where: { type: 'barber_client', barberId: client.barberId, clientId },
    });
    if (existing) return res.json({ conversation: existing });
    const conversation = await prisma.conversation.create({
      data: { type: 'barber_client', barberId: client.barberId, clientId },
    });
    res.status(201).json({ conversation });
  }),
);

clientRouter.get(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const conv = await prisma.conversation.findFirst({
      where: {
        id: req.params.id,
        OR: [{ clientId }, { adminId: req.auth!.userId }],
      },
    });
    if (!conv) throw NotFound('Conversation not found');
    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: { sender: { select: { id: true, fullName: true, role: true, avatarUrl: true } } },
    });
    res.json({ messages });
  }),
);

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  type: z.enum(['text', 'image']).default('text'),
  imageUrl: z.string().url().optional(),
});

clientRouter.post(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const data = sendMessageSchema.parse(req.body);
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, clientId },
    });
    if (!conv) throw NotFound('Conversation not found');
    const message = await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: req.auth!.userId,
        senderRole: 'client',
        content: data.content,
        type: data.type,
        imageUrl: data.imageUrl ?? null,
      },
    });
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });
    if (conv.barberId) {
      const barber = await prisma.barber.findUnique({ where: { id: conv.barberId } });
      if (barber) {
        await prisma.notification.create({
          data: {
            userId: barber.userId,
            type: 'message_received',
            title: 'Nova mensagem',
            body: data.content.slice(0, 100),
            data: { conversationId: conv.id },
          },
        });
      }
    }
    res.status(201).json({ message });
  }),
);

clientRouter.post(
  '/conversations/:id/read',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, clientId },
    });
    if (!conv) throw NotFound('Conversation not found');
    await prisma.message.updateMany({
      where: { conversationId: conv.id, NOT: { senderRole: 'client' } },
      data: { isRead: true },
    });
    res.json({ message: 'Marked as read' });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// SUPPORT TICKETS — client side
// ────────────────────────────────────────────────────────────────────────────
clientRouter.get(
  '/tickets',
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const tickets = await prisma.supportTicket.findMany({
      where: { requesterId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        conversation: {
          include: {
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });
    res.json({ tickets });
  }),
);

const createTicketSchema = z.object({
  subject: z.string().min(2).max(200),
  category: z.enum(['payment', 'account', 'booking', 'other']).default('other'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  message: z.string().min(2).max(4000),
});

clientRouter.post(
  '/tickets',
  asyncHandler(async (req, res) => {
    const clientId = ensureClientId(req);
    const userId = req.auth!.userId;
    const data = createTicketSchema.parse(req.body);
    const result = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: { type: 'support', clientId },
      });
      const ticket = await tx.supportTicket.create({
        data: {
          requesterId: userId,
          requesterRole: 'client',
          conversationId: conv.id,
          subject: data.subject,
          category: data.category,
          priority: data.priority,
        },
      });
      await tx.message.create({
        data: {
          conversationId: conv.id,
          senderId: userId,
          senderRole: 'client',
          content: data.message,
          type: 'text',
        },
      });
      return { ticket, conversation: conv };
    });
    res.status(201).json(result);
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// Public: GET /api/public/barbers — used by signup form to pick a barber
// ────────────────────────────────────────────────────────────────────────────
export const publicRouter = Router();
publicRouter.get(
  '/barbers',
  asyncHandler(async (_req, res) => {
    const barbers = await prisma.barber.findMany({
      select: { id: true, name: true, address: true, rating: true },
      orderBy: { name: 'asc' },
    });
    res.json({ barbers });
  }),
);
