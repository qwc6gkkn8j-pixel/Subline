// ─────────────────────────────────────────────────────────────────────────────
// Staff badge routes — used by the staff member's own /staff/badge page.
//
// All routes require role='staff'. Each request resolves the StaffMember row
// from the JWT (staffMemberId), so a staff user can only act on their own
// time entries.
//
// Validation rules for POST /staff/badge:
//   • clock_in    → no other open clock_in today
//   • break_start → must have an open clock_in today, no open break
//   • break_end   → must have an open break_start today
//   • clock_out   → must have an open clock_in today, closes any open break
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { BadRequest, Forbidden, NotFound } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import type { EntryType } from '@prisma/client';

export const staffRouter = Router();
staffRouter.use(requireAuth, requireRole('staff'));

function ensureStaffId(req: { auth?: { staffMemberId?: string } }): string {
  if (!req.auth?.staffMemberId) throw Forbidden('Staff profile not linked to this user');
  return req.auth.staffMemberId;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

interface DaySummary {
  staffMemberId: string;
  state: 'out' | 'working' | 'on_break';
  clockInAt: string | null;
  clockOutAt: string | null;
  totalMinutesWorked: number;
  totalMinutesOnBreak: number;
  entries: Array<{ id: string; type: EntryType; timestamp: string; note: string | null }>;
}

async function getTodaySummary(staffMemberId: string): Promise<DaySummary> {
  const member = await prisma.staffMember.findUnique({ where: { id: staffMemberId } });
  if (!member) throw NotFound('Staff member not found');
  if (!member.isActive) throw Forbidden('Staff account is inactive');

  const entries = await prisma.timeEntry.findMany({
    where: { staffMemberId, timestamp: { gte: startOfToday() } },
    orderBy: { timestamp: 'asc' },
  });

  let state: DaySummary['state'] = 'out';
  let clockInAt: Date | null = null;
  let clockOutAt: Date | null = null;
  let workedMs = 0;
  let breakMs = 0;
  let openWorkSince: Date | null = null;
  let openBreakSince: Date | null = null;

  for (const e of entries) {
    if (e.type === 'clock_in') {
      clockInAt = e.timestamp;
      openWorkSince = e.timestamp;
      state = 'working';
    } else if (e.type === 'break_start' && openWorkSince) {
      workedMs += e.timestamp.getTime() - openWorkSince.getTime();
      openWorkSince = null;
      openBreakSince = e.timestamp;
      state = 'on_break';
    } else if (e.type === 'break_end' && openBreakSince) {
      breakMs += e.timestamp.getTime() - openBreakSince.getTime();
      openBreakSince = null;
      openWorkSince = e.timestamp;
      state = 'working';
    } else if (e.type === 'clock_out') {
      if (openBreakSince) {
        breakMs += e.timestamp.getTime() - openBreakSince.getTime();
        openBreakSince = null;
      }
      if (openWorkSince) {
        workedMs += e.timestamp.getTime() - openWorkSince.getTime();
        openWorkSince = null;
      }
      clockOutAt = e.timestamp;
      state = 'out';
    }
  }

  // Account for in-progress segments up to "now" so the dashboard reflects
  // accurate elapsed time without waiting for the next event.
  const now = Date.now();
  if (openWorkSince) workedMs += now - openWorkSince.getTime();
  if (openBreakSince) breakMs += now - openBreakSince.getTime();

  return {
    staffMemberId,
    state,
    clockInAt: clockInAt?.toISOString() ?? null,
    clockOutAt: clockOutAt?.toISOString() ?? null,
    totalMinutesWorked: Math.floor(workedMs / 60000),
    totalMinutesOnBreak: Math.floor(breakMs / 60000),
    entries: entries.map((e) => ({
      id: e.id,
      type: e.type,
      timestamp: e.timestamp.toISOString(),
      note: e.note,
    })),
  };
}

staffRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const staffId = ensureStaffId(req);
    const member = await prisma.staffMember.findUnique({
      where: { id: staffId },
      include: {
        barber: { select: { id: true, name: true, address: true } },
        user: { select: { fullName: true, email: true } },
      },
    });
    if (!member) throw NotFound('Staff member not found');
    res.json({ staff: member });
  }),
);

staffRouter.get(
  '/today',
  asyncHandler(async (req, res) => {
    const staffId = ensureStaffId(req);
    const summary = await getTodaySummary(staffId);
    res.json(summary);
  }),
);

const badgeSchema = z.object({
  type: z.enum(['clock_in', 'break_start', 'break_end', 'clock_out']),
  note: z.string().max(500).optional(),
});

staffRouter.post(
  '/badge',
  asyncHandler(async (req, res) => {
    const staffId = ensureStaffId(req);
    const data = badgeSchema.parse(req.body);

    const summary = await getTodaySummary(staffId);

    // Enforce sequencing rules.
    if (data.type === 'clock_in' && summary.state !== 'out') {
      throw BadRequest('Já estás em serviço hoje — marca saída primeiro.');
    }
    if (data.type === 'break_start') {
      if (summary.state === 'out') throw BadRequest('Tens de marcar entrada antes da pausa.');
      if (summary.state === 'on_break') throw BadRequest('Já estás em pausa.');
    }
    if (data.type === 'break_end' && summary.state !== 'on_break') {
      throw BadRequest('Não estás em pausa.');
    }
    if (data.type === 'clock_out' && summary.state === 'out') {
      throw BadRequest('Tens de marcar entrada antes de marcar saída.');
    }

    await prisma.timeEntry.create({
      data: {
        staffMemberId: staffId,
        type: data.type,
        note: data.note ?? null,
      },
    });

    const updated = await getTodaySummary(staffId);
    res.status(201).json(updated);
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/staff/appointments — Staff member's own appointments
// ────────────────────────────────────────────────────────────────────────────

const appointmentListQuery = z.object({
  from: z.string().optional(), // YYYY-MM-DD
  to: z.string().optional(),
  status: z
    .enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])
    .optional(),
});

staffRouter.get(
  '/appointments',
  asyncHandler(async (req, res) => {
    const staffId = ensureStaffId(req);
    const params = appointmentListQuery.parse(req.query);

    const where: Record<string, unknown> = { staffMemberId: staffId };
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

// ────────────────────────────────────────────────────────────────────────────
// Feature #20 — Dados Pessoais do Staff
// ────────────────────────────────────────────────────────────────────────────

import bcrypt from 'bcrypt';
import { env } from '../lib/env.js';

// GET /api/staff/me/profile
staffRouter.get(
  '/me/profile',
  asyncHandler(async (req, res) => {
    const staffId = ensureStaffId(req);
    const member = await prisma.staffMember.findUnique({
      where: { id: staffId },
      include: {
        user: { select: { id: true, email: true, avatarUrl: true, language: true, createdAt: true } },
        barber: { select: { id: true, name: true } },
      },
    });
    if (!member) throw NotFound('Staff member not found');
    res.json({ member });
  }),
);

// PATCH /api/staff/me/profile — update name, phone, category
staffRouter.patch(
  '/me/profile',
  asyncHandler(async (req, res) => {
    const staffId = ensureStaffId(req);
    const schema = z.object({
      name: z.string().min(2).max(100).optional(),
      phone: z.string().max(30).nullable().optional(),
      category: z.string().max(50).nullable().optional(),
      role: z.string().max(50).optional(),
    });
    const data = schema.parse(req.body);
    const updated = await prisma.staffMember.update({
      where: { id: staffId },
      data: { ...data },
    });
    res.json({ member: updated });
  }),
);

// PATCH /api/staff/me/password
staffRouter.patch(
  '/me/password',
  asyncHandler(async (req, res) => {
    const staffId = ensureStaffId(req);
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);

    const member = await prisma.staffMember.findUnique({
      where: { id: staffId },
      include: { user: { select: { id: true, passwordHash: true } } },
    });
    if (!member?.user) throw NotFound('Staff user account not found');

    const ok = await bcrypt.compare(currentPassword, member.user.passwordHash);
    if (!ok) throw BadRequest('Password atual incorreta');

    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: member.user.id }, data: { passwordHash } });
    res.json({ message: 'Password atualizada' });
  }),
);

// Feature #19 — Categoria de Perfil
// PATCH /api/staff/me/category
staffRouter.patch(
  '/me/category',
  asyncHandler(async (req, res) => {
    const staffId = ensureStaffId(req);
    const schema = z.object({ category: z.string().min(1).max(50) });
    const { category } = schema.parse(req.body);
    const updated = await prisma.staffMember.update({
      where: { id: staffId },
      data: { category },
    });
    res.json({ category: updated.category });
  }),
);
