import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { env } from '../lib/env.js';
import { logAudit } from '../lib/audit.js';
import { BadRequest, Conflict, Forbidden, NotFound } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { computeAvailableSlots } from '../lib/calendar.js';
import {
  buildConnectOAuthUrl,
  createPlanOnConnectedAccount,
  isStripeConfigured,
  StripeNotConfigured,
} from '../lib/stripe.js';

export const barberRouter = Router();
barberRouter.use(requireAuth, requireRole('barber'));

// Plan pricing (cents-safe but stored as decimals for display)
const PLAN_PRICE: Record<'bronze' | 'silver' | 'gold', number> = {
  bronze: 9.99,
  silver: 19.99,
  gold: 49.99,
};

function ensureBarberId(req: { auth?: { barberId?: string } }): string {
  if (!req.auth?.barberId) throw Forbidden('Barber profile not found for this user');
  return req.auth.barberId;
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/barber/statistics
// ────────────────────────────────────────────────────────────────────────────
barberRouter.get(
  '/statistics',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const [activeClients, barber, payments] = await Promise.all([
      prisma.client.count({
        where: {
          barberId,
          subscriptions: { some: { status: 'active' } },
        },
      }),
      prisma.barber.findUnique({ where: { id: barberId } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'paid',
          paymentDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          subscription: { client: { barberId } },
        },
      }),
    ]);
    res.json({
      activeClients,
      monthlyRevenue: Number(payments._sum.amount ?? 0),
      rating: barber?.rating ? Number(barber.rating) : 0,
    });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/barber/clients
// ────────────────────────────────────────────────────────────────────────────
barberRouter.get(
  '/clients',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const status = req.query.status === 'active' || req.query.status === 'inactive' ? req.query.status : undefined;

    const clients = await prisma.client.findMany({
      where: {
        barberId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' as const } },
                { email: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = status
      ? clients.filter((c) => (c.subscriptions[0]?.status ?? 'inactive') === status)
      : clients;

    res.json({ clients: filtered, total: filtered.length });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/barber/clients  (create client + login + initial subscription)
// ────────────────────────────────────────────────────────────────────────────
const createClientSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8).default('TempPass123!'),
  planType: z.enum(['bronze', 'silver', 'gold']).default('bronze'),
});

barberRouter.post(
  '/clients',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const data = createClientSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw Conflict('A user with that email already exists');

    const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          role: 'client',
          fullName: data.fullName,
          phone: data.phone,
        },
      });
      const client = await tx.client.create({
        data: {
          userId: user.id,
          barberId,
          name: data.fullName,
          email: data.email.toLowerCase(),
          phone: data.phone,
        },
      });
      const renewal = new Date();
      renewal.setMonth(renewal.getMonth() + 1);
      const subscription = await tx.subscription.create({
        data: {
          clientId: client.id,
          planType: data.planType,
          status: 'active',
          renewalDate: renewal,
          price: PLAN_PRICE[data.planType],
        },
      });
      return { user, client, subscription };
    });

    await logAudit({
      userId: req.auth!.userId,
      action: 'created',
      entityType: 'client',
      entityId: result.client.id,
    });
    res.status(201).json({ client: result.client, subscription: result.subscription });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/barber/clients/:clientId
// ────────────────────────────────────────────────────────────────────────────
const updateClientSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  planType: z.enum(['bronze', 'silver', 'gold']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

barberRouter.put(
  '/clients/:clientId',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const client = await prisma.client.findFirst({
      where: { id: req.params.clientId, barberId },
      include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!client) throw NotFound('Client not found or not yours');

    const data = updateClientSchema.parse(req.body);

    await prisma.$transaction(async (tx) => {
      if (data.fullName || data.email || data.phone !== undefined) {
        await tx.client.update({
          where: { id: client.id },
          data: {
            ...(data.fullName ? { name: data.fullName } : {}),
            ...(data.email ? { email: data.email.toLowerCase() } : {}),
            ...(data.phone !== undefined ? { phone: data.phone } : {}),
          },
        });
        await tx.user.update({
          where: { id: client.userId },
          data: {
            ...(data.fullName ? { fullName: data.fullName } : {}),
            ...(data.email ? { email: data.email.toLowerCase() } : {}),
            ...(data.phone !== undefined ? { phone: data.phone } : {}),
          },
        });
      }
      if (data.planType || data.status) {
        const current = client.subscriptions[0];
        if (current) {
          await tx.subscription.update({
            where: { id: current.id },
            data: {
              ...(data.planType ? { planType: data.planType, price: PLAN_PRICE[data.planType] } : {}),
              ...(data.status ? { status: data.status } : {}),
            },
          });
        } else if (data.planType) {
          const renewal = new Date();
          renewal.setMonth(renewal.getMonth() + 1);
          await tx.subscription.create({
            data: {
              clientId: client.id,
              planType: data.planType,
              status: data.status ?? 'active',
              renewalDate: renewal,
              price: PLAN_PRICE[data.planType],
            },
          });
        }
      }
    });

    await logAudit({
      userId: req.auth!.userId,
      action: 'updated',
      entityType: 'client',
      entityId: client.id,
    });
    res.json({ message: 'Client updated' });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/barber/clients/:clientId
// ────────────────────────────────────────────────────────────────────────────
barberRouter.delete(
  '/clients/:clientId',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const client = await prisma.client.findFirst({
      where: { id: req.params.clientId, barberId },
    });
    if (!client) throw NotFound('Client not found or not yours');
    await prisma.user.delete({ where: { id: client.userId } });
    await logAudit({
      userId: req.auth!.userId,
      action: 'deleted',
      entityType: 'client',
      entityId: client.id,
    });
    res.json({ message: 'Client deleted' });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/barber/profile
// ────────────────────────────────────────────────────────────────────────────
barberRouter.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
      include: { user: { select: { email: true, fullName: true } } },
    });
    res.json({ barber });
  }),
);

const profileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
});

barberRouter.put(
  '/profile',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const data = profileSchema.parse(req.body);
    const barber = await prisma.barber.update({
      where: { id: barberId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
      },
    });
    if (data.name) {
      await prisma.user.update({ where: { id: barber.userId }, data: { fullName: data.name } });
    }
    res.json({ barber });
  }),
);

// password change shared with client; lightweight inline here
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

barberRouter.put(
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

// ════════════════════════════════════════════════════════════════════════════
// V3 — Plans, Cuts, Calendar, Chat, Tickets, Stripe Connect
// ════════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────────────
// PLANS — barber views own plans (admin creates them)
// ────────────────────────────────────────────────────────────────────────────
barberRouter.get(
  '/plans',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const plans = await prisma.plan.findMany({
      where: { barberId },
      orderBy: { price: 'asc' },
      include: { _count: { select: { subscriptions: true } } },
    });
    res.json({ plans });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// CUT TRACKING — register a haircut, increment subscription.cutsUsed
// ────────────────────────────────────────────────────────────────────────────
const registerCutSchema = z.object({
  notes: z.string().optional(),
  appointmentId: z.string().uuid().optional(),
});

barberRouter.post(
  '/clients/:clientId/register-cut',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const data = registerCutSchema.parse(req.body);
    const client = await prisma.client.findFirst({
      where: { id: req.params.clientId, barberId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!client) throw NotFound('Client not found or not yours');
    const subscription = client.subscriptions[0];
    if (!subscription) throw BadRequest('Client has no active subscription');

    const result = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.update({
        where: { id: subscription.id },
        data: { cutsUsed: { increment: 1 } },
      });
      const cut = await tx.cut.create({
        data: {
          subscriptionId: subscription.id,
          appointmentId: data.appointmentId ?? null,
          notes: data.notes ?? null,
        },
      });
      // Notification when limit reached
      if (sub.cutsTotal > 0 && sub.cutsUsed >= sub.cutsTotal) {
        await tx.notification.create({
          data: {
            userId: client.userId,
            type: 'cuts_limit_reached',
            title: 'Limite de cortes atingido',
            body: `Usaste ${sub.cutsUsed} de ${sub.cutsTotal} cortes este mês.`,
          },
        });
      }
      return { sub, cut };
    });
    await logAudit({
      userId: req.auth!.userId,
      action: 'registered_cut',
      entityType: 'subscription',
      entityId: subscription.id,
      details: { cutsUsed: result.sub.cutsUsed, cutsTotal: result.sub.cutsTotal },
    });
    res.json({
      subscription: result.sub,
      cut: result.cut,
    });
  }),
);

barberRouter.get(
  '/clients/:clientId/cuts',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const client = await prisma.client.findFirst({
      where: { id: req.params.clientId, barberId },
      include: {
        subscriptions: { select: { id: true } },
      },
    });
    if (!client) throw NotFound('Client not found or not yours');
    const subIds = client.subscriptions.map((s) => s.id);
    const cuts = await prisma.cut.findMany({
      where: { subscriptionId: { in: subIds } },
      orderBy: { performedAt: 'desc' },
      take: 50,
    });
    res.json({ cuts });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// PAYMENT LINK — generate Stripe checkout URL for a client/plan
// Returns 503 with code "stripe_not_configured" until env is set.
// ────────────────────────────────────────────────────────────────────────────
const paymentLinkSchema = z.object({
  planId: z.string().uuid(),
});

barberRouter.post(
  '/clients/:clientId/payment-link',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const data = paymentLinkSchema.parse(req.body);
    const [client, plan, barber] = await Promise.all([
      prisma.client.findFirst({ where: { id: req.params.clientId, barberId } }),
      prisma.plan.findFirst({ where: { id: data.planId, barberId, isActive: true } }),
      prisma.barber.findUnique({ where: { id: barberId } }),
    ]);
    if (!client) throw NotFound('Client not found or not yours');
    if (!plan) throw NotFound('Plan not found or inactive');
    if (!barber) throw NotFound('Barber not found');

    // If we already have a payment link cached on the plan, return it
    if (plan.stripePaymentLink) {
      return res.json({
        paymentUrl: plan.stripePaymentLink,
        productId: plan.stripeProductId,
        priceId: plan.stripePriceId,
        cached: true,
      });
    }

    // Otherwise create one — requires Stripe configured + barber connected
    if (!isStripeConfigured()) throw new StripeNotConfigured();
    if (!barber.stripeAccountId) {
      throw BadRequest('Barber has not connected their Stripe account yet', 'stripe_not_connected');
    }

    const result = await createPlanOnConnectedAccount({
      stripeAccountId: barber.stripeAccountId,
      name: plan.name,
      description: plan.description ?? undefined,
      priceEUR: Number(plan.price),
      metadata: { planId: plan.id, barberId, clientId: client.id },
    });

    await prisma.plan.update({
      where: { id: plan.id },
      data: {
        stripeProductId: result.productId,
        stripePriceId: result.priceId,
        stripePaymentLink: result.paymentLinkUrl,
      },
    });

    res.json({
      paymentUrl: result.paymentLinkUrl,
      productId: result.productId,
      priceId: result.priceId,
      cached: false,
    });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS — calendar
// ────────────────────────────────────────────────────────────────────────────
const appointmentListQuery = z.object({
  from: z.string().optional(), // YYYY-MM-DD
  to: z.string().optional(),
  status: z
    .enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])
    .optional(),
});

barberRouter.get(
  '/appointments',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const params = appointmentListQuery.parse(req.query);
    const where: Record<string, unknown> = { barberId };
    if (params.from || params.to) {
      where.date = {
        ...(params.from ? { gte: new Date(params.from) } : {}),
        ...(params.to ? { lte: new Date(params.to) } : {}),
      };
    }
    if (params.status) where.status = params.status;
    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: { client: { select: { id: true, name: true, email: true, phone: true } } },
    });
    res.json({ appointments });
  }),
);

const appointmentSchema = z.object({
  clientId: z.string().uuid(),
  service: z.enum(['haircut', 'beard', 'haircut_beard', 'other']).default('haircut'),
  date: z.string(), // YYYY-MM-DD
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.coerce.number().int().positive().default(30),
  notes: z.string().optional(),
  status: z
    .enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])
    .default('pending'),
});

barberRouter.post(
  '/appointments',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const data = appointmentSchema.parse(req.body);
    const client = await prisma.client.findFirst({ where: { id: data.clientId, barberId } });
    if (!client) throw NotFound('Client not found or not yours');

    const [hh, mm] = data.startTime.split(':').map(Number);
    const endMinutes = hh * 60 + mm + data.durationMinutes;
    const endTime = `${Math.floor(endMinutes / 60)
      .toString()
      .padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

    const appointment = await prisma.appointment.create({
      data: {
        barberId,
        clientId: data.clientId,
        service: data.service,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime,
        durationMinutes: data.durationMinutes,
        notes: data.notes ?? null,
        status: data.status,
      },
    });

    // Notify client
    await prisma.notification.create({
      data: {
        userId: client.userId,
        type: 'appointment_created',
        title: 'Nova marcação',
        body: `Marcação confirmada para ${data.date} às ${data.startTime}.`,
        data: { appointmentId: appointment.id },
      },
    });

    res.status(201).json({ appointment });
  }),
);

const appointmentUpdateSchema = appointmentSchema.partial().omit({ clientId: true });

barberRouter.put(
  '/appointments/:appointmentId',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const data = appointmentUpdateSchema.parse(req.body);
    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.appointmentId, barberId },
    });
    if (!existing) throw NotFound('Appointment not found');

    const update: Record<string, unknown> = {};
    if (data.service) update.service = data.service;
    if (data.date) update.date = new Date(data.date);
    if (data.notes !== undefined) update.notes = data.notes;
    if (data.status) {
      update.status = data.status;
      if (data.status === 'cancelled') {
        update.cancelledBy = 'barber';
        update.cancelledAt = new Date();
      }
    }
    if (data.startTime || data.durationMinutes) {
      const startTime = data.startTime ?? existing.startTime;
      const duration = data.durationMinutes ?? existing.durationMinutes;
      const [hh, mm] = startTime.split(':').map(Number);
      const endMinutes = hh * 60 + mm + duration;
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
      update.startTime = startTime;
      update.endTime = endTime;
      update.durationMinutes = duration;
    }

    const appointment = await prisma.appointment.update({
      where: { id: existing.id },
      data: update,
    });
    res.json({ appointment });
  }),
);

barberRouter.delete(
  '/appointments/:appointmentId',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.appointmentId, barberId },
    });
    if (!existing) throw NotFound('Appointment not found');
    await prisma.appointment.update({
      where: { id: existing.id },
      data: { status: 'cancelled', cancelledBy: 'barber', cancelledAt: new Date() },
    });
    res.json({ message: 'Appointment cancelled' });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// AVAILABILITY — barber's weekly schedule + blocked dates
// ────────────────────────────────────────────────────────────────────────────
barberRouter.get(
  '/availability',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const [rules, unavailable] = await Promise.all([
      prisma.barberAvailability.findMany({
        where: { barberId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      prisma.barberUnavailable.findMany({
        where: { barberId, dateTo: { gte: new Date() } },
        orderBy: { dateFrom: 'asc' },
      }),
    ]);
    res.json({ rules, unavailable });
  }),
);

const availabilitySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDuration: z.coerce.number().int().positive().default(30),
  isActive: z.boolean().default(true),
});

barberRouter.post(
  '/availability',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const data = availabilitySchema.parse(req.body);
    const rule = await prisma.barberAvailability.create({
      data: { barberId: barberId, dayOfWeek: data.dayOfWeek, startTime: data.startTime, endTime: data.endTime, slotDuration: data.slotDuration, isActive: data.isActive },
    });
    res.status(201).json({ rule });
  }),
);

barberRouter.put(
  '/availability/:ruleId',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const data = availabilitySchema.partial().parse(req.body);
    const existing = await prisma.barberAvailability.findFirst({
      where: { id: req.params.ruleId, barberId },
    });
    if (!existing) throw NotFound('Rule not found');
    const rule = await prisma.barberAvailability.update({
      where: { id: existing.id },
      data,
    });
    res.json({ rule });
  }),
);

barberRouter.delete(
  '/availability/:ruleId',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const existing = await prisma.barberAvailability.findFirst({
      where: { id: req.params.ruleId, barberId },
    });
    if (!existing) throw NotFound('Rule not found');
    await prisma.barberAvailability.delete({ where: { id: existing.id } });
    res.json({ message: 'Rule deleted' });
  }),
);

const unavailableSchema = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  reason: z.string().optional().nullable(),
});

barberRouter.post(
  '/availability/unavailable',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const data = unavailableSchema.parse(req.body);
    const range = await prisma.barberUnavailable.create({
      data: {
        barberId,
        dateFrom: new Date(data.dateFrom),
        dateTo: new Date(data.dateTo),
        reason: data.reason ?? null,
      },
    });
    res.status(201).json({ range });
  }),
);

barberRouter.delete(
  '/availability/unavailable/:rangeId',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const existing = await prisma.barberUnavailable.findFirst({
      where: { id: req.params.rangeId, barberId },
    });
    if (!existing) throw NotFound('Range not found');
    await prisma.barberUnavailable.delete({ where: { id: existing.id } });
    res.json({ message: 'Range deleted' });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// SLOTS — compute available slots for a given date
// ────────────────────────────────────────────────────────────────────────────
barberRouter.get(
  '/calendar/slots',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const dateStr = typeof req.query.date === 'string' ? req.query.date : null;
    if (!dateStr) throw BadRequest('Missing date query parameter');
    const date = new Date(dateStr);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [rules, appointments, unavailable] = await Promise.all([
      prisma.barberAvailability.findMany({ where: { barberId, isActive: true } }),
      prisma.appointment.findMany({
        where: {
          barberId,
          date: { gte: dayStart, lte: dayEnd },
          status: { not: 'cancelled' },
        },
        select: { startTime: true, endTime: true },
      }),
      prisma.barberUnavailable.findMany({
        where: { barberId, dateFrom: { lte: dayEnd }, dateTo: { gte: dayStart } },
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
barberRouter.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const conversations = await prisma.conversation.findMany({
      where: { barberId, type: 'barber_client' },
      orderBy: { updatedAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            messages: { where: { isRead: false, NOT: { senderRole: 'barber' } } },
          },
        },
      },
    });
    res.json({ conversations });
  }),
);

const startConversationSchema = z.object({ clientId: z.string().uuid() });

barberRouter.post(
  '/conversations',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const data = startConversationSchema.parse(req.body);
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, barberId },
    });
    if (!client) throw NotFound('Client not found or not yours');
    const existing = await prisma.conversation.findFirst({
      where: { type: 'barber_client', barberId, clientId: client.id },
    });
    if (existing) return res.json({ conversation: existing });
    const conversation = await prisma.conversation.create({
      data: { type: 'barber_client', barberId, clientId: client.id },
    });
    res.status(201).json({ conversation });
  }),
);

barberRouter.get(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, OR: [{ barberId }, { clientId: undefined }] },
    });
    // tighten: barber must be participant (barberId match or admin assigned to one of barber's tickets)
    if (!conv || (conv.barberId !== barberId && !conv.adminId)) throw NotFound('Conversation not found');
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

barberRouter.post(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const data = sendMessageSchema.parse(req.body);
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, OR: [{ barberId }, { adminId: req.auth!.userId }] },
    });
    if (!conv) throw NotFound('Conversation not found');
    const message = await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: req.auth!.userId,
        senderRole: 'barber',
        content: data.content,
        type: data.type,
        imageUrl: data.imageUrl ?? null,
      },
    });
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });
    // notify the other party
    if (conv.clientId) {
      const client = await prisma.client.findUnique({ where: { id: conv.clientId } });
      if (client) {
        await prisma.notification.create({
          data: {
            userId: client.userId,
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

barberRouter.post(
  '/conversations/:id/read',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, barberId },
    });
    if (!conv) throw NotFound('Conversation not found');
    await prisma.message.updateMany({
      where: { conversationId: conv.id, NOT: { senderRole: 'barber' } },
      data: { isRead: true },
    });
    res.json({ message: 'Marked as read' });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// SUPPORT TICKETS — barber side
// ────────────────────────────────────────────────────────────────────────────
barberRouter.get(
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

barberRouter.post(
  '/tickets',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const userId = req.auth!.userId;
    const data = createTicketSchema.parse(req.body);
    const result = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: { type: 'support', barberId },
      });
      const ticket = await tx.supportTicket.create({
        data: {
          requesterId: userId,
          requesterRole: 'barber',
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
          senderRole: 'barber',
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
// STRIPE CONNECT — barber-side onboarding
// ────────────────────────────────────────────────────────────────────────────
barberRouter.get(
  '/stripe/status',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
      select: { stripeConnected: true, stripeAccountId: true },
    });
    res.json({
      configured: isStripeConfigured(),
      barberConnected: barber?.stripeConnected ?? false,
      stripeAccountId: barber?.stripeAccountId ?? null,
    });
  }),
);

barberRouter.get(
  '/stripe/connect-url',
  asyncHandler(async (req, res) => {
    const barberId = ensureBarberId(req);
    if (!isStripeConfigured()) throw new StripeNotConfigured();
    const url = buildConnectOAuthUrl(barberId);
    res.json({ url });
  }),
);
