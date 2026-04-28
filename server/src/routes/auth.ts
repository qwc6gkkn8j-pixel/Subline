import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { env } from '../lib/env.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, type JwtPayload } from '../lib/jwt.js';
import { BadRequest, Conflict, Unauthorized } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

export const authRouter = Router();

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    fullName: z.string().min(2),
    role: z.enum(['admin', 'barber', 'client']).default('client'),
    phone: z.string().optional(),
    address: z.string().optional(),
    bio: z.string().optional(),
    barberId: z.string().uuid().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

async function buildJwtPayload(userId: string): Promise<JwtPayload> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { barber: true, client: true },
  });
  if (!user) throw Unauthorized('User not found');
  if (user.status === 'inactive') throw Unauthorized('Account is inactive');
  return {
    userId: user.id,
    role: user.role,
    barberId: user.barber?.id,
    clientId: user.client?.id,
  };
}

function publicUser(user: { id: string; email: string; role: string; status: string; fullName: string; phone: string | null }) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    fullName: user.fullName,
    phone: user.phone,
  };
}

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);

    // Public registration is restricted to barber/client. Admin must be seeded or created by an admin.
    if (data.role === 'admin') throw BadRequest('Admin accounts cannot be created via public registration');

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw Conflict('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          role: data.role,
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
            barberId: data.barberId,
            name: data.fullName,
            email: data.email.toLowerCase(),
            phone: data.phone,
          },
        });
      }
      return u;
    });

    const payload = await buildJwtPayload(user.id);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ userId: user.id });
    res.status(201).json({ accessToken, refreshToken, user: publicUser(user) });
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user) throw Unauthorized('Invalid email or password');
    if (user.status === 'inactive') throw Unauthorized('Account is inactive');
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) throw Unauthorized('Invalid email or password');

    const payload = await buildJwtPayload(user.id);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ userId: user.id });
    res.json({ accessToken, refreshToken, user: publicUser(user) });
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    let userId: string;
    try {
      ({ userId } = verifyRefreshToken(refreshToken));
    } catch {
      throw Unauthorized('Invalid refresh token');
    }
    const payload = await buildJwtPayload(userId);
    const accessToken = signAccessToken(payload);
    res.json({ accessToken });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { barber: true, client: true },
    });
    if (!user) throw Unauthorized();
    res.json({
      user: publicUser(user),
      role: user.role,
      barber: user.barber,
      client: user.client,
    });
  }),
);

authRouter.post('/logout', requireAuth, (_req, res) => {
  // Stateless JWT — client clears its own storage. Endpoint exists for symmetry/audit.
  res.json({ message: 'Logged out successfully' });
});
