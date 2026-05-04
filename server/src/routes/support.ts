// ─────────────────────────────────────────────────────────────────────────────
// /api/support/* — Support ticket management (unified)
// Client/Barber can create and respond to their own tickets
// Admin can view and respond to all tickets
// ─────────────────────────────────────────────────────────────────────────────

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { NotFound, Forbidden } from '../lib/errors.js';

export const supportRouter = Router();

// ────────────────────────────────────────────────────────────────────────────
// Schemas
// ────────────────────────────────────────────────────────────────────────────

const createTicketSchema = z.object({
  subject: z.string().min(2).max(200),
  category: z.enum(['payment', 'account', 'booking', 'other']).default('other'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  message: z.string().min(2).max(4000),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  type: z.enum(['text', 'image']).default('text'),
  imageUrl: z.string().url().optional(),
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/support/tickets — Get user's tickets (client/barber/admin)
// ────────────────────────────────────────────────────────────────────────────

supportRouter.get(
  '/tickets',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const role = req.auth!.role;

    let tickets;

    if (role === 'admin') {
      // Admin sees all tickets with pagination/filters
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string), 50) : 20;
      const status = (req.query.status as 'open' | 'in_progress' | 'resolved' | 'closed' | undefined);
      const category = (req.query.category as 'payment' | 'account' | 'booking' | 'other' | undefined);
      const priority = (req.query.priority as 'low' | 'medium' | 'high' | undefined);

      const where: Record<string, any> = {
        ...(status ? { status } : {}),
        ...(category ? { category } : {}),
        ...(priority ? { priority } : {}),
      };

      const [data, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
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

      return res.json({
        tickets: data,
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    } else if (role === 'client') {
      // Client sees only their tickets
      tickets = await prisma.supportTicket.findMany({
        where: { requesterId: userId, requesterRole: 'client' },
        orderBy: { createdAt: 'desc' },
        include: {
          conversation: {
            include: {
              messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
          },
        },
      });
    } else if (role === 'barber') {
      // Barber sees only their tickets
      tickets = await prisma.supportTicket.findMany({
        where: { requesterId: userId, requesterRole: 'barber' },
        orderBy: { createdAt: 'desc' },
        include: {
          conversation: {
            include: {
              messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
          },
        },
      });
    } else {
      throw Forbidden('Invalid role for support tickets');
    }

    res.json({ tickets });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/support/tickets — Create ticket (client/barber)
// ────────────────────────────────────────────────────────────────────────────

supportRouter.post(
  '/tickets',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const role = req.auth!.role;

    if (!['client', 'barber'].includes(role)) {
      throw Forbidden('Only clients and barbers can create tickets');
    }

    const data = createTicketSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          type: 'support',
          ...(role === 'client' ? { clientId: req.auth!.clientId } : {}),
          ...(role === 'barber' ? { barberId: req.auth!.barberId } : {}),
        },
      });

      const ticket = await tx.supportTicket.create({
        data: {
          requesterId: userId,
          requesterRole: role as 'client' | 'barber',
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
          senderRole: role as 'client' | 'barber',
          content: data.message,
          type: 'text',
        },
      });

      // Notify all admins
      const admins = await tx.user.findMany({
        where: { role: 'admin', status: 'active' },
        select: { id: true },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            type: 'ticket_update',
            title: 'Novo ticket de suporte',
            body: `${data.subject} — ${role === 'client' ? 'cliente' : 'profissional'}`,
            data: { ticketId: ticket.id, conversationId: conv.id, requesterRole: role },
          })),
        });
      }

      return { ticket, conversation: conv };
    });

    res.status(201).json(result);
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/support/tickets/:id/messages — Send message in ticket (client/barber/admin)
// ────────────────────────────────────────────────────────────────────────────

supportRouter.post(
  '/tickets/:ticketId/messages',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const ticketId = req.params.ticketId;
    const userId = req.auth!.userId;
    const role = req.auth!.role;

    const data = sendMessageSchema.parse(req.body);

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { conversation: true },
    });

    if (!ticket) throw NotFound('Ticket not found');

    // Verify access: user must be requester, admin, or conversation participant
    if (
      role === 'client' &&
      (ticket.requesterId !== userId || ticket.requesterRole !== 'client')
    ) {
      throw Forbidden('You cannot respond to this ticket');
    }

    if (
      role === 'barber' &&
      (ticket.requesterId !== userId || ticket.requesterRole !== 'barber')
    ) {
      throw Forbidden('You cannot respond to this ticket');
    }

    if (role === 'admin' && ticket.conversation.adminId && ticket.conversation.adminId !== userId) {
      // Admin can only reply if assigned or no one is assigned
      // Optional: could relax this to allow all admins to reply
    }

    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId: ticket.conversationId,
          senderId: userId,
          senderRole: role as 'client' | 'barber' | 'admin',
          content: data.content,
          type: data.type,
          imageUrl: data.imageUrl ?? null,
        },
      });

      // Auto-assign to admin if responding
      if (role === 'admin') {
        await tx.conversation.update({
          where: { id: ticket.conversationId },
          data: {
            adminId: ticket.conversation.adminId ?? userId,
            updatedAt: new Date(),
          },
        });

        // If ticket is open, move to in_progress
        if (ticket.status === 'open') {
          await tx.supportTicket.update({
            where: { id: ticketId },
            data: { status: 'in_progress' },
          });
        }
      } else {
        // Update conversation timestamp for sorting
        await tx.conversation.update({
          where: { id: ticket.conversationId },
          data: { updatedAt: new Date() },
        });
      }

      // Notify the other party
      if (role === 'admin') {
        // Notify the requester (client/barber) that admin replied
        await tx.notification.create({
          data: {
            userId: ticket.requesterId,
            type: 'ticket_update',
            title: 'Resposta do suporte',
            body: data.content.slice(0, 100),
            data: {
              ticketId: ticket.id,
              conversationId: ticket.conversationId,
              deepLink: `/support/${ticket.id}`,
            },
          },
        });
      } else {
        // Notify admins that client/barber replied
        const admins = await tx.user.findMany({
          where: { role: 'admin', status: 'active' },
          select: { id: true },
        });

        if (admins.length > 0) {
          await tx.notification.createMany({
            data: admins.map((a) => ({
              userId: a.id,
              type: 'ticket_update',
              title: `Resposta no ticket: ${ticket.subject}`,
              body: data.content.slice(0, 100),
              data: { ticketId: ticket.id, conversationId: ticket.conversationId },
            })),
          });
        }
      }

      return msg;
    });

    res.status(201).json({ message });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/support/tickets/:id/messages — Get messages in ticket
// ────────────────────────────────────────────────────────────────────────────

supportRouter.get(
  '/tickets/:ticketId/messages',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const ticketId = req.params.ticketId;
    const userId = req.auth!.userId;
    const role = req.auth!.role;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { conversation: true },
    });

    if (!ticket) throw NotFound('Ticket not found');

    // Verify access
    if (
      role !== 'admin' &&
      ticket.requesterId !== userId
    ) {
      throw Forbidden('You cannot view this ticket');
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: ticket.conversationId },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        sender: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
      },
    });

    // Mark unread messages as read for this user
    await prisma.message.updateMany({
      where: {
        conversationId: ticket.conversationId,
        isRead: false,
        NOT: { senderId: userId },
      },
      data: { isRead: true },
    });

    res.json({ messages });
  }),
);
