import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { NotFound } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/notifications  — list current user's notifications (paginated)
// ────────────────────────────────────────────────────────────────────────────
const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  unread: z.coerce.boolean().optional(),
});

notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const params = listQuery.parse(req.query);
    const userId = req.auth!.userId;
    const where = {
      userId,
      ...(params.unread === true ? { isRead: false } : {}),
    };
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    res.json({
      notifications,
      total,
      unreadCount,
      page: params.page,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/notifications/unread-count
// ────────────────────────────────────────────────────────────────────────────
notificationsRouter.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const count = await prisma.notification.count({
      where: { userId: req.auth!.userId, isRead: false },
    });
    res.json({ count });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/:id/read
// ────────────────────────────────────────────────────────────────────────────
notificationsRouter.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!notification) throw NotFound('Notification not found');
    await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });
    res.json({ message: 'Marked as read' });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/notifications/read-all
// ────────────────────────────────────────────────────────────────────────────
notificationsRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { userId: req.auth!.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ marked: result.count });
  }),
);
