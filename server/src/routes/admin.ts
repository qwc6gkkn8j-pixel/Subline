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
