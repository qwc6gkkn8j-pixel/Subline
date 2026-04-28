import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { env } from '../lib/env.js';
import { BadRequest, Forbidden, NotFound } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

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
