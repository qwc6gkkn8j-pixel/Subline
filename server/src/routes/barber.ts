import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { env } from '../lib/env.js';
import { logAudit } from '../lib/audit.js';
import { BadRequest, Conflict, Forbidden, NotFound } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

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
