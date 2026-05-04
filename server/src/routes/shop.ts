// ─────────────────────────────────────────────────────────────────────────────
// /api/shop/* — Product shop for professionals to sell items
// ─────────────────────────────────────────────────────────────────────────────

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { NotFound, Forbidden, HttpError } from '../lib/errors.js';

export const barberShopRouter = Router();
export const clientShopRouter = Router();

// ────────────────────────────────────────────────────────────────────────────
// Zod schemas
// ────────────────────────────────────────────────────────────────────────────

const productCreateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  type: z.enum(['physical', 'digital']).default('physical'),
  isActive: z.boolean().default(true),
});

const orderUpdateSchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']),
});

// ────────────────────────────────────────────────────────────────────────────
// Professional-side: Create, read, update, delete products
// ────────────────────────────────────────────────────────────────────────────

barberShopRouter.use(requireAuth, requireRole('barber'));

barberShopRouter.get(
  '/products',
  asyncHandler(async (req: Request, res: Response) => {
    const barberId = req.auth?.barberId;
    if (!barberId) throw NotFound('Professional profile not found');

    const products = await prisma.product.findMany({
      where: { barberId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ products });
  }),
);

barberShopRouter.post(
  '/products',
  asyncHandler(async (req: Request, res: Response) => {
    const barberId = req.auth?.barberId;
    if (!barberId) throw NotFound('Professional profile not found');

    const payload = productCreateSchema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        barberId,
        name: payload.name,
        description: payload.description || null,
        price: payload.price,
        type: payload.type,
        isActive: payload.isActive,
      },
    });

    res.status(201).json({ product });
  }),
);

barberShopRouter.put(
  '/products/:productId',
  asyncHandler(async (req: Request, res: Response) => {
    const barberId = req.auth?.barberId;
    if (!barberId) throw NotFound('Professional profile not found');

    const { productId } = req.params;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw NotFound('Product not found');
    if (product.barberId !== barberId) throw Forbidden('You cannot modify this product');

    const payload = productCreateSchema.partial().parse(req.body);

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name: payload.name,
        description: payload.description,
        price: payload.price,
        type: payload.type,
        isActive: payload.isActive,
      },
    });

    res.json({ product: updated });
  }),
);

barberShopRouter.delete(
  '/products/:productId',
  asyncHandler(async (req: Request, res: Response) => {
    const barberId = req.auth?.barberId;
    if (!barberId) throw NotFound('Professional profile not found');

    const { productId } = req.params;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw NotFound('Product not found');
    if (product.barberId !== barberId) throw Forbidden('You cannot delete this product');

    await prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    });

    res.json({ success: true });
  }),
);

barberShopRouter.get(
  '/orders',
  asyncHandler(async (req: Request, res: Response) => {
    const barberId = req.auth?.barberId;
    if (!barberId) throw NotFound('Professional profile not found');

    const orders = await prisma.productOrder.findMany({
      where: { barberId },
      include: { product: true, client: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ orders });
  }),
);

barberShopRouter.put(
  '/orders/:orderId',
  asyncHandler(async (req: Request, res: Response) => {
    const barberId = req.auth?.barberId;
    if (!barberId) throw NotFound('Professional profile not found');

    const { orderId } = req.params;
    const order = await prisma.productOrder.findUnique({ where: { id: orderId } });
    if (!order) throw NotFound('Order not found');
    if (order.barberId !== barberId) throw Forbidden('You cannot modify this order');

    const payload = orderUpdateSchema.parse(req.body);

    const updated = await prisma.productOrder.update({
      where: { id: orderId },
      data: { status: payload.status },
      include: { product: true, client: { select: { id: true, name: true, email: true } } },
    });

    res.json({ order: updated });
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// Client-side: Browse products + place orders
// ────────────────────────────────────────────────────────────────────────────

clientShopRouter.use(requireAuth, requireRole('client'));

clientShopRouter.get(
  '/products/:barberId',
  asyncHandler(async (req: Request, res: Response) => {
    const { barberId } = req.params;

    const products = await prisma.product.findMany({
      where: { barberId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ products });
  }),
);

clientShopRouter.get(
  '/orders',
  asyncHandler(async (req: Request, res: Response) => {
    const clientId = req.auth?.clientId;
    if (!clientId) throw NotFound('Client profile not found');

    const orders = await prisma.productOrder.findMany({
      where: { clientId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ orders });
  }),
);

const orderCreateSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(100),
});

clientShopRouter.post(
  '/orders',
  asyncHandler(async (req: Request, res: Response) => {
    const clientId = req.auth?.clientId;
    if (!clientId) throw NotFound('Client profile not found');

    const payload = orderCreateSchema.parse(req.body);

    const product = await prisma.product.findUnique({
      where: { id: payload.productId },
    });
    if (!product) throw NotFound('Product not found');
    if (!product.isActive) throw new HttpError(400, 'Product is no longer available');

    const totalPrice = Number(product.price) * payload.quantity;

    const order = await prisma.productOrder.create({
      data: {
        barberId: product.barberId,
        clientId,
        productId: payload.productId,
        quantity: payload.quantity,
        totalPrice,
        status: 'pending',
      },
      include: { product: true },
    });

    res.status(201).json({ order });
  }),
);
