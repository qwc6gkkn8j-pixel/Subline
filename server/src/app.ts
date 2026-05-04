import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './lib/env.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { barberRouter } from './routes/barber.js';
import { clientRouter, publicRouter } from './routes/client.js';
import { staffRouter } from './routes/staff.js';
import { notificationsRouter } from './routes/notifications.js';
import { stripePublicRouter, stripeWebhookRouter } from './routes/stripe.js';
import { barberShopRouter, clientShopRouter } from './routes/shop.js';
import { supportRouter } from './routes/support.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp() {
  const app = express(); app.set('trust proxy', 1)

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Webhook routes — MUST be mounted before express.json() because the
  // Stripe webhook needs the raw body for signature verification.
  // The router uses express.raw() internally on its specific path.
  // ──────────────────────────────────────────────────────────────────────────
  app.use('/api/webhooks', stripeWebhookRouter);

  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // General rate limit
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  // Stricter limit for /api/auth/login
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/public', publicRouter);
  app.use('/api/public', stripePublicRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/barber', barberRouter);
  app.use('/api/barber/shop', barberShopRouter);
  app.use('/api/client', clientRouter);
  app.use('/api/client/shop', clientShopRouter);
  app.use('/api/staff', staffRouter);
  app.use('/api/support', supportRouter);
  app.use('/api/notifications', notificationsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
