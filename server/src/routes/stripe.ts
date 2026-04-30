// ────────────────────────────────────────────────────────────────────────────
// Public Stripe routes — Connect OAuth callback + webhook handler.
// All endpoints here are unauthenticated (Stripe is the caller).
// They return 503 until env vars are populated; see lib/stripe.ts.
// ────────────────────────────────────────────────────────────────────────────
import { Router, raw } from 'express';
import type Stripe from 'stripe';
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
// ────────────────────────────────────────────────────────────────────────────
stripePublicRouter.get('/stripe/status', (_req, res) => {
  res.json(stripeStatus());
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/public/stripe/callback?code=&state=
//
// Stripe Connect OAuth callback. `state` = barberId set when we built the URL.
// ────────────────────────────────────────────────────────────────────────────
stripePublicRouter.get(
  '/stripe/callback',
  asyncHandler(async (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code : null;
    const state = typeof req.query.state === 'string' ? req.query.state : null;
    if (!code || !state) throw BadRequest('Missing code or state');

    if (!isStripeConfigured()) {
      return res.redirect(`${env.APP_URL}/barber?stripe=not_configured`);
    }

    try {
      const stripeAccountId = await exchangeConnectCode(code);
      await prisma.barber.update({
        where: { id: state },
        data: { stripeAccountId, stripeConnected: true },
      });
      res.redirect(`${env.APP_URL}/barber?stripe=connected`);
    } catch {
      res.redirect(`${env.APP_URL}/barber?stripe=error`);
    }
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/stripe
//
// Stripe webhook. Requires raw Buffer body — express.raw() is mounted inline.
// ────────────────────────────────────────────────────────────────────────────
export const stripeWebhookRouter = Router();

stripeWebhookRouter.post(
  '/stripe',
  raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature || Array.isArray(signature)) throw BadRequest('Missing stripe-signature');

    if (!isStripeConfigured()) throw new StripeNotConfigured();

    const event = verifyWebhookSignature(req.body as Buffer, signature);

    // Always return 200 fast — Stripe retries if we 5xx or timeout.
    res.json({ received: true });

    // Handle asynchronously so Stripe gets the 200 even if our DB is slow.
    void handleWebhookEvent(event);
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// Webhook event handlers
// ────────────────────────────────────────────────────────────────────────────
async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.payment_succeeded':
        await onInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
        await onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`[stripe webhook] unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe webhook] error handling ${event.type}:`, err);
  }
}

// ── checkout.session.completed ───────────────────────────────────────────────
async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { planId, clientId } = (session.metadata ?? {}) as { planId?: string; clientId?: string };
  const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null;
  const amountTotal = session.amount_total ?? 0;
  const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : null;

  if (!clientId || !planId) {
    console.warn('[stripe webhook] checkout.session.completed: missing clientId or planId in metadata');
    return;
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    console.warn(`[stripe webhook] plan ${planId} not found`);
    return;
  }

  const renewal = new Date();
  renewal.setMonth(renewal.getMonth() + 1);

  await prisma.$transaction(async (tx) => {
    // Upsert subscription — may already exist in pending state
    const existing = await tx.subscription.findFirst({
      where: { clientId, planId },
    });

    let subId: string;
    if (existing) {
      await tx.subscription.update({
        where: { id: existing.id },
        data: {
          status: 'active',
          cutsUsed: 0,
          renewalDate: renewal,
          stripeSubscriptionId: stripeSubscriptionId ?? existing.stripeSubscriptionId,
          stripeCustomerId: stripeCustomerId ?? existing.stripeCustomerId,
        },
      });
      subId = existing.id;
    } else {
      const created = await tx.subscription.create({
        data: {
          clientId,
          planId,
          status: 'active',
          cutsUsed: 0,
          renewalDate: renewal,
          price: plan.price,
          stripeSubscriptionId: stripeSubscriptionId ?? undefined,
          stripeCustomerId: stripeCustomerId ?? undefined,
        },
      });
      subId = created.id;
    }

    // Payment record
    await tx.payment.create({
      data: {
        subscriptionId: subId,
        amount: amountTotal / 100,
        status: 'paid',
        method: 'stripe',
        stripePaymentIntentId: paymentIntent ?? undefined,
      },
    });

    // Notify client
    const client = await tx.client.findUnique({ where: { id: clientId } });
    if (client) {
      await tx.notification.create({
        data: {
          userId: client.userId,
          type: 'payment_success',
          title: 'Pagamento confirmado',
          body: `A tua subscrição ${plan.name} foi ativada com sucesso! ✅`,
        },
      });
    }
  });
}

// ── invoice.payment_succeeded ────────────────────────────────────────────────
async function onInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  // In Stripe API 2026-04-22.dahlia, subscription is at parent.subscription_details.subscription
  const subField = invoice.parent?.subscription_details?.subscription;
  const stripeSubscriptionId = typeof subField === 'string' ? subField : subField?.id ?? null;
  if (!stripeSubscriptionId) return;

  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId },
    include: { client: true, plan: true },
  });
  if (!sub) return;

  const periodEnd = invoice.lines?.data?.[0]?.period?.end;
  const renewal = periodEnd ? new Date(periodEnd * 1000) : new Date(Date.now() + 30 * 86400_000);

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'active',
        cutsUsed: 0,
        renewalDate: renewal,
      },
    });

    await tx.payment.create({
      data: {
        subscriptionId: sub.id,
        amount: (invoice.amount_paid ?? 0) / 100,
        status: 'paid',
        method: 'stripe',
        stripeInvoiceId: invoice.id,
      },
    });

    await tx.notification.create({
      data: {
        userId: sub.client.userId,
        type: 'subscription_renewed',
        title: 'Subscrição renovada',
        body: `O teu plano ${sub.plan?.name ?? ''} foi renovado. Próxima renovação: ${renewal.toLocaleDateString('pt-PT')}.`,
      },
    });
  });
}

// ── invoice.payment_failed ───────────────────────────────────────────────────
async function onInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subField = invoice.parent?.subscription_details?.subscription;
  const stripeSubscriptionId = typeof subField === 'string' ? subField : subField?.id ?? null;
  if (!stripeSubscriptionId) return;

  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId },
    include: {
      client: {
        include: { barber: { include: { user: true } } },
      },
    },
  });
  if (!sub) return;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: sub.id },
      data: { status: 'payment_failed' },
    });

    // Notify client
    await tx.notification.create({
      data: {
        userId: sub.client.userId,
        type: 'payment_failed',
        title: 'Pagamento falhou',
        body: 'O pagamento da tua subscrição falhou. Por favor atualiza o teu método de pagamento.',
      },
    });

    // Notify barber
    if (sub.client.barber) {
      await tx.notification.create({
        data: {
          userId: sub.client.barber.userId,
          type: 'payment_failed',
          title: 'Pagamento de cliente falhou',
          body: `O pagamento de ${sub.client.name} falhou.`,
        },
      });
    }
  });
}

// ── customer.subscription.deleted ────────────────────────────────────────────
async function onSubscriptionDeleted(stripeSub: Stripe.Subscription): Promise<void> {
  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSub.id },
    include: {
      client: {
        include: { barber: true },
      },
    },
  });
  if (!sub) return;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: sub.id },
      data: { status: 'cancelled' },
    });

    await tx.notification.create({
      data: {
        userId: sub.client.userId,
        type: 'general',
        title: 'Subscrição cancelada',
        body: 'A tua subscrição foi cancelada.',
      },
    });

    if (sub.client.barber) {
      await tx.notification.create({
        data: {
          userId: sub.client.barber.userId,
          type: 'general',
          title: 'Subscrição de cliente cancelada',
          body: `A subscrição de ${sub.client.name} foi cancelada.`,
        },
      });
    }
  });
}
