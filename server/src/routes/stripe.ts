// ────────────────────────────────────────────────────────────────────────────
// Public Stripe routes — Connect OAuth callback + webhook handler.
// All endpoints here are unauthenticated (Stripe is the caller).
// They return 503 until env vars are populated; see lib/stripe.ts.
// ────────────────────────────────────────────────────────────────────────────
import { Router, raw } from 'express';
import {
  exchangeConnectCode,
  isStripeConfigured,
  stripeStatus,
  verifyWebhookSignature,
  StripeNotConfigured,
} from '../lib/stripe.js';
import { prisma } from '../lib/db.js';
import { env } from '../lib/env.js';
import { asyncHandler } from '../middleware/error.js';
import { BadRequest } from '../lib/errors.js';

export const stripePublicRouter = Router();

// ────────────────────────────────────────────────────────────────────────────
// GET /api/public/stripe/status
//
// Surfaces whether the platform has Stripe configured. Frontend reads this
// to decide whether to show "connect Stripe" CTA banners.
// ────────────────────────────────────────────────────────────────────────────
stripePublicRouter.get('/stripe/status', (_req, res) => {
  res.json(stripeStatus());
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/public/stripe/callback?code=&state=
//
// Stripe Connect OAuth callback. The `state` is the barberId set when we
// built the OAuth URL. We exchange the code for the connected account id
// and persist it to the Barber record.
// ────────────────────────────────────────────────────────────────────────────
stripePublicRouter.get(
  '/stripe/callback',
  asyncHandler(async (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code : null;
    const state = typeof req.query.state === 'string' ? req.query.state : null;
    if (!code || !state) throw BadRequest('Missing code or state');

    if (!isStripeConfigured()) {
      // Show a friendly redirect rather than throw — barber sees a clear msg.
      return res.redirect(`${env.APP_URL}/barber?stripe=not_configured`);
    }

    const stripeAccountId = await exchangeConnectCode(code);
    await prisma.barber.update({
      where: { id: state },
      data: { stripeAccountId, stripeConnected: true },
    });
    res.redirect(`${env.APP_URL}/barber?stripe=connected`);
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/stripe
//
// Stripe webhook endpoint. Requires the raw request body for signature
// verification — note the express.raw middleware below.
// ────────────────────────────────────────────────────────────────────────────
export const stripeWebhookRouter = Router();

stripeWebhookRouter.post(
  '/stripe',
  raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature || Array.isArray(signature)) throw BadRequest('Missing stripe-signature');

    if (!isStripeConfigured()) {
      throw new StripeNotConfigured();
    }

    // verifyWebhookSignature throws if invalid; until Stripe is wired,
    // it throws StripeNotConfigured.
    const event = verifyWebhookSignature(req.body as Buffer, signature) as {
      type: string;
      data: { object: Record<string, unknown> };
    };

    // TODO (when Stripe is wired): handle the lifecycle events.
    //
    // checkout.session.completed
    //   → Mark subscription active, set currentPeriod*, reset cutsUsed
    //   → Create Payment row
    //   → Send email + in-app notification
    //
    // invoice.payment_succeeded
    //   → Renewal: bump renewalDate, reset cutsUsed = 0
    //   → Append Payment row
    //
    // invoice.payment_failed
    //   → Set subscription.status = 'payment_failed'
    //   → Notify client + barber, alert in admin dashboard
    //
    // customer.subscription.deleted
    //   → Set subscription.status = 'cancelled'
    //   → Notify both
    void event;

    res.json({ received: true });
  }),
);
