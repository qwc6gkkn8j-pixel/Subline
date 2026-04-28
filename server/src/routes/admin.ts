import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { env } from '../lib/env.js';
import { logAudit } from '../lib/audit.js';
import { BadRequest, Conflict, NotFound } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

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
          paymentDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
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
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
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
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) throw NotFound('User not found');

    if (data.email && data.email.toLowerCase() !== user.email) {
      const dup = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
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
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
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
    const barber = await prisma.barber.findUnique({ where: { id: data.barberId } });
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
