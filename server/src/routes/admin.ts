import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { env } from '../lib/env.js';
import { logAudit } from '../lib/audit.js';
import { BadRequest, Conflict, NotFound } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { sendAppointmentReminders } from '../lib/reminders.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard
// ────────────────────────────────────────────────────────────────────────────
adminRouter.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const [totalUsers, activeSubscriptions, revenueAgg, lastMonthUsers] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'paid',
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    const monthRevenue = Number(revenueAgg._sum.amount ?? 0);
    const thisMonthUsers = await prisma.user.count({
      where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
    });
    const growth = lastMonthUsers === 0 ? 0 : ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100;

    res.json({
      totalUsers,
      activeSubscriptions,
      monthlyRevenue: monthRevenue,
      growthPercent: Number(growth.toFixed(1)),
    });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users
// ────────────────────────────────────────────────────────────────────────────
const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  role: z.enum(['admin', 'barber', 'client']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  q: z.string().optional(),
  sort: z.enum(['name', 'email', 'role', 'status', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const params = listQuery.parse(req.query);
    const where = {
      ...(params.role ? { role: params.role } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.q
        ? {
            OR: [
              { email: { contains: params.q, mode: 'insensitive' as const } },
              { fullName: { contains: params.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const orderBy =
      params.sort === 'name' ? { fullName: params.order } : { [params.sort]: params.order };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          fullName: true,
          phone: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      total,
      page: params.page,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/admin/users
// ────────────────────────────────────────────────────────────────────────────
const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(['admin', 'barber', 'client']),
  status: z.enum(['active', 'inactive']).default('active'),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
});

adminRouter.post(
  '/users',
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() }, select: { id: true } });
    if (existing) throw Conflict('Email already registered');
    const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          role: data.role,
          status: data.status,
          fullName: data.fullName,
          phone: data.phone,
        },
      });
      if (data.role === 'barber') {
        await tx.barber.create({
          data: {
            userId: u.id,
            name: data.fullName,
            phone: data.phone,
            address: data.address,
            bio: data.bio,
          },
        });
      } else if (data.role === 'client') {
        await tx.client.create({
          data: {
            userId: u.id,
            name: data.fullName,
            email: data.email.toLowerCase(),
            phone: data.phone,
          },
        });
      }
      return u;
    });
    await logAudit({
      userId: req.auth!.userId,
      action: 'created',
      entityType: 'user',
      entityId: user.id,
      details: { role: user.role },
    });
    res.status(201).json({ user });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/users/:userId
// ────────────────────────────────────────────────────────────────────────────
const updateSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(2).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  phone: z.string().optional().nullable(),
  password: z.string().min(8).optional(),
});

adminRouter.put(
  '/users/:userId',
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.params.userId }, select: { id: true, email: true, role: true } });
    if (!user) throw NotFound('User not found');

    if (data.email && data.email.toLowerCase() !== user.email) {
      const dup = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() }, select: { id: true } });
      if (dup) throw Conflict('Email already registered');
    }

    const passwordHash = data.password ? await bcrypt.hash(data.password, env.BCRYPT_ROUNDS) : undefined;

    const updated = await prisma.user.update({
      where: { id: req.params.userId },
      data: {
        ...(data.email ? { email: data.email.toLowerCase() } : {}),
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        fullName: true,
        phone: true,
        createdAt: true,
      },
    });
    await logAudit({
      userId: req.auth!.userId,
      action: 'updated',
      entityType: 'user',
      entityId: updated.id,
    });
    res.json({ user: updated });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/users/:userId
// ────────────────────────────────────────────────────────────────────────────
adminRouter.delete(
  '/users/:userId',
  asyncHandler(async (req, res) => {
    if (req.params.userId === req.auth!.userId) throw BadRequest('Cannot delete your own account');
    const user = await prisma.user.findUnique({ where: { id: req.params.userId }, select: { id: true, email: true, role: true } });
    if (!user) throw NotFound('User not found');
    await prisma.user.delete({ where: { id: req.params.userId } });
    await logAudit({
      userId: req.auth!.userId,
      action: 'deleted',
      entityType: 'user',
      entityId: req.params.userId,
    });
    res.json({ message: 'User deleted' });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/barbers — List all barbers (for dropdown selects)
// ────────────────────────────────────────────────────────────────────────────
adminRouter.get(
  '/barbers',
  asyncHandler(async (req, res) => {
    const barbers = await prisma.barber.findMany({
      where: { user: { status: 'active' } },
      select: {
        id: true,
        userId: true,
        name: true,
        phone: true,
        address: true,
        bio: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ barbers });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/audit-logs
// ────────────────────────────────────────────────────────────────────────────
adminRouter.get(
  '/audit-logs',
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page ?? 1);
    const limit = Math.min(50, Number(req.query.limit ?? 20));
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { fullName: true, email: true } } },
      }),
      prisma.auditLog.count(),
    ]);
    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// PLANS — admin manages plans across all barbers
// ────────────────────────────────────────────────────────────────────────────
adminRouter.get(
  '/plans',
  asyncHandler(async (req, res) => {
    const barberId = typeof req.query.barberId === 'string' ? req.query.barberId : undefined;
    const plans = await prisma.plan.findMany({
      where: barberId ? { barberId } : undefined,
      orderBy: [{ barberId: 'asc' }, { price: 'asc' }],
      include: {
        barber: { select: { id: true, name: true } },
        _count: { select: { subscriptions: true } },
      },
    });
    res.json({ plans });
  }),
);

const planSchema = z.object({
  barberId: z.string().uuid(),
  name: z.string().min(1).max(60),
  description: z.string().optional().nullable(),
  price: z.coerce.number().positive(),
  cutsPerMonth: z.coerce.number().int().nonnegative().nullable().optional(),
  isActive: z.boolean().optional(),
});

adminRouter.post(
  '/plans',
  asyncHandler(async (req, res) => {
    const data = planSchema.parse(req.body);
    const barber = await prisma.barber.findUnique({ where: { id: data.barberId }, select: { id: true } });
    if (!barber) throw NotFound('Barber not found');
    const plan = await prisma.plan.create({
      data: {
        barberId: data.barberId,
        name: data.name,
        description: data.description ?? null,
        price: data.price,
        cutsPerMonth: data.cutsPerMonth ?? null,
        isActive: data.isActive ?? true,
      },
    });
    await logAudit({
      userId: req.auth!.userId,
      action: 'created',
      entityType: 'plan',
      entityId: plan.id,
      details: { barberId: plan.barberId, name: plan.name, price: Number(plan.price) },
    });
    res.status(201).json({ plan });
  }),
);

const planUpdateSchema = planSchema.partial().omit({ barberId: true });

adminRouter.put(
  '/plans/:planId',
  asyncHandler(async (req, res) => {
    const data = planUpdateSchema.parse(req.body);
    const existing = await prisma.plan.findUnique({ where: { id: req.params.planId } });
    if (!existing) throw NotFound('Plan not found');
    const plan = await prisma.plan.update({
      where: { id: req.params.planId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.cutsPerMonth !== undefined ? { cutsPerMonth: data.cutsPerMonth } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
    await logAudit({
      userId: req.auth!.userId,
      action: 'updated',
      entityType: 'plan',
      entityId: plan.id,
    });
    res.json({ plan });
  }),
);

adminRouter.delete(
  '/plans/:planId',
  asyncHandler(async (req, res) => {
    const existing = await prisma.plan.findUnique({ where: { id: req.params.planId } });
    if (!existing) throw NotFound('Plan not found');
    // Soft delete: subscriptions still reference the plan, so just deactivate.
    await prisma.plan.update({
      where: { id: req.params.planId },
      data: { isActive: false },
    });
    await logAudit({
      userId: req.auth!.userId,
      action: 'deleted',
      entityType: 'plan',
      entityId: req.params.planId,
    });
    res.json({ message: 'Plan deactivated' });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// SUPPORT TICKETS — admin sees all, can update status
// ────────────────────────────────────────────────────────────────────────────
const ticketListQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  category: z.enum(['payment', 'account', 'booking', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

adminRouter.get(
  '/tickets',
  asyncHandler(async (req, res) => {
    const params = ticketListQuery.parse(req.query);
    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.priority ? { priority: params.priority } : {}),
    };
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          requester: { select: { id: true, fullName: true, email: true, role: true } },
          conversation: {
            include: {
              messages: { orderBy: { createdAt: 'desc' }, take: 1 },
              _count: {
                select: {
                  messages: { where: { isRead: false, NOT: { senderRole: 'admin' } } },
                },
              },
            },
          },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);
    res.json({
      tickets,
      total,
      page: params.page,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    });
  }),
);

const ticketUpdateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignToMe: z.boolean().optional(),
});

adminRouter.put(
  '/tickets/:ticketId',
  asyncHandler(async (req, res) => {
    const data = ticketUpdateSchema.parse(req.body);
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.ticketId },
      include: { conversation: true },
    });
    if (!ticket) throw NotFound('Ticket not found');

    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.supportTicket.update({
        where: { id: ticket.id },
        data: {
          ...(data.status ? { status: data.status } : {}),
          ...(data.priority ? { priority: data.priority } : {}),
          ...(data.status === 'resolved' || data.status === 'closed'
            ? { resolvedAt: new Date() }
            : {}),
        },
      });
      if (data.assignToMe) {
        await tx.conversation.update({
          where: { id: ticket.conversationId },
          data: { adminId: req.auth!.userId },
        });
      }
      return t;
    });
    await logAudit({
      userId: req.auth!.userId,
      action: 'updated',
      entityType: 'ticket',
      entityId: ticket.id,
      details: { status: data.status ?? null, priority: data.priority ?? null },
    });
    res.json({ ticket: updated });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// SUPPORT TICKETS — admin chat (read messages, send replies)
// Admin can read/respond to any support conversation. The "assignToMe"
// helper above lets an admin claim a ticket but does not gate access here.
// ────────────────────────────────────────────────────────────────────────────
adminRouter.get(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const conv = await prisma.conversation.findUnique({
      where: { id: req.params.id },
    });
    if (!conv) throw NotFound('Conversation not found');
    if (conv.type !== 'support') throw NotFound('Not a support conversation');
    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: { sender: { select: { id: true, fullName: true, role: true } } },
    });
    res.json({ messages });
  }),
);

const adminSendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  type: z.enum(['text', 'image']).default('text'),
  imageUrl: z.string().url().optional(),
});

adminRouter.post(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const data = adminSendMessageSchema.parse(req.body);
    const conv = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: { ticket: true },
    });
    if (!conv) throw NotFound('Conversation not found');
    if (conv.type !== 'support') throw NotFound('Not a support conversation');

    const message = await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: req.auth!.userId,
        senderRole: 'admin',
        content: data.content,
        type: data.type,
        imageUrl: data.imageUrl ?? null,
      },
    });
    // Auto-assign the conversation to this admin if not already assigned,
    // and bump updatedAt so listings re-sort.
    await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        adminId: conv.adminId ?? req.auth!.userId,
        updatedAt: new Date(),
      },
    });
    // If the ticket is still "open", move it to in_progress on first reply.
    if (conv.ticket && conv.ticket.status === 'open') {
      await prisma.supportTicket.update({
        where: { id: conv.ticket.id },
        data: { status: 'in_progress' },
      });
    }
    // Notify the requester of the reply.
    if (conv.ticket) {
      await prisma.notification.create({
        data: {
          userId: conv.ticket.requesterId,
          type: 'ticket_update',
          title: 'Resposta do suporte',
          body: data.content.slice(0, 100),
          data: { ticketId: conv.ticket.id, conversationId: conv.id },
        },
      });
    }
    res.status(201).json({ message });
  }),
);

adminRouter.post(
  '/conversations/:id/read',
  asyncHandler(async (req, res) => {
    const conv = await prisma.conversation.findUnique({ where: { id: req.params.id } });
    if (!conv) throw NotFound('Conversation not found');
    if (conv.type !== 'support') throw NotFound('Not a support conversation');
    await prisma.message.updateMany({
      where: { conversationId: conv.id, NOT: { senderRole: 'admin' } },
      data: { isRead: true },
    });
    res.json({ message: 'Marked as read' });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/extras  — extra KPIs for v3 (tickets, plans count)
// Returned alongside the original /dashboard for backward compat.
// ────────────────────────────────────────────────────────────────────────────
adminRouter.get(
  '/dashboard/extras',
  asyncHandler(async (_req, res) => {
    const [openTickets, plansCount, barbersCount, appointmentsToday] = await Promise.all([
      prisma.supportTicket.count({ where: { status: { in: ['open', 'in_progress'] } } }),
      prisma.plan.count({ where: { isActive: true } }),
      prisma.barber.count(),
      prisma.appointment.count({
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(24, 0, 0, 0)),
          },
        },
      }),
    ]);
    res.json({ openTickets, plansCount, barbersCount, appointmentsToday });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/admin/reminders/send — trigger appointment reminders for upcoming appointments
// (Can be called by a cron job or monitoring service)
// ────────────────────────────────────────────────────────────────────────────
adminRouter.post(
  '/reminders/send',
  asyncHandler(async (_req, res) => {
    const count = await sendAppointmentReminders();
    res.json({ message: `Sent ${count} appointment reminders` });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// GESTÃO DE PROS — Feature #1
// ────────────────────────────────────────────────────────────────────────────

// GET /api/admin/pros — Lista todos os Pros com filtros e estado Stripe
adminRouter.get(
  '/pros',
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const proStatus = typeof req.query.proStatus === 'string' ? req.query.proStatus : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [pros, total] = await Promise.all([
      prisma.barber.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, userId: true, name: true, phone: true, address: true,
          rating: true, stripeConnected: true, stripeAccountId: true, createdAt: true,
          user: { select: { id: true, email: true, status: true, createdAt: true } },
          _count: { select: { clients: true, appointments: true } },
        },
      }),
      prisma.barber.count({ where }),
    ]);

    res.json({
      pros: pros.map((p) => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        email: p.user.email,
        phone: p.phone,
        address: p.address,
        city: null,
        country: 'LU',
        categories: [],
        rating: p.rating,
        proStatus: 'active',
        stripeConnected: p.stripeConnected,
        stripeAccountId: p.stripeAccountId,
        userStatus: p.user.status,
        clientCount: p._count.clients,
        appointmentCount: p._count.appointments,
        createdAt: p.createdAt,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  }),
);

// GET /api/admin/pros/:barberId — Detalhes de um Pro
adminRouter.get(
  '/pros/:barberId',
  asyncHandler(async (req, res) => {
    const pro = await prisma.barber.findUnique({
      where: { id: req.params.barberId },
      select: {
        id: true, userId: true, name: true, phone: true, address: true,
        bio: true, rating: true, stripeConnected: true, stripeAccountId: true, createdAt: true,
        user: { select: { id: true, email: true, status: true, createdAt: true } },
        _count: { select: { clients: true, appointments: true, plans: true, reviews: true } },
        plans: { where: { isActive: true }, select: { id: true, name: true, price: true } },
      },
    });
    if (!pro) throw NotFound('Pro não encontrado');

    res.json({
      id: pro.id,
      userId: pro.userId,
      name: pro.name,
      email: pro.user.email,
      phone: pro.phone,
      bio: pro.bio,
      address: pro.address,
      city: null,
      country: 'LU',
      categories: [],
      rating: pro.rating,
      proStatus: 'active',
      stripeConnected: pro.stripeConnected,
      stripeAccountId: pro.stripeAccountId,
      userStatus: pro.user.status,
      counts: pro._count,
      activePlans: pro.plans,
      createdAt: pro.createdAt,
    });
  }),
);

// PATCH /api/admin/pros/:barberId/status — Alterar estado do Pro
adminRouter.patch(
  '/pros/:barberId/status',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      proStatus: z.enum(['active', 'suspended', 'pending_onboarding']),
      userStatus: z.enum(['active', 'inactive']).optional(),
    });
    const data = schema.parse(req.body);

    const pro = await prisma.barber.findUnique({
      where: { id: req.params.barberId },
      select: { id: true, userId: true, name: true },
    });
    if (!pro) throw NotFound('Pro não encontrado');

    await prisma.$transaction(async (tx) => {
      await tx.barber.update({
        where: { id: pro.id },
        data: { proStatus: data.proStatus },
      });
      if (data.userStatus) {
        await tx.user.update({
          where: { id: pro.userId },
          data: { status: data.userStatus },
        });
      }
    });

    await logAudit({
      userId: req.auth!.userId,
      action: 'updated',
      entityType: 'barber',
      entityId: pro.id,
      details: { ...data, action: 'status_change' },
    });

    res.json({ message: 'Estado atualizado' });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// GESTÃO DE PAGAMENTOS — Feature #3
// ────────────────────────────────────────────────────────────────────────────

// GET /api/admin/payments — Vista consolidada de todos os pagamentos
adminRouter.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 30);
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const where: Record<string, unknown> = {};
    if (status && ['pending', 'paid', 'failed', 'refunded'].includes(status)) {
      where.status = status;
    }
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const [payments, total, aggregate] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            select: {
              id: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  barber: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
      prisma.payment.aggregate({
        where: { ...where, status: 'paid' },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      payments,
      total,
      page,
      pages: Math.ceil(total / limit),
      totalRevenue: aggregate._sum.amount ?? 0,
    });
  }),
);
