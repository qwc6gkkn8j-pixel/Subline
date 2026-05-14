/**
 * Stripe Connect integration — real SDK implementation.
 *
 * Activates automatically when STRIPE_SECRET_KEY is set in env.
 * All functions degrade gracefully (throw StripeNotConfigured → 503) when
 * the key is absent, so the app runs fully without Stripe until you're ready.
 */

import Stripe from 'stripe';
import { env } from './env.js';
import { HttpError } from './errors.js';

export class StripeNotConfigured extends HttpError {
  constructor(message = 'Stripe is not configured on this server') {
    super(503, message, 'stripe_not_configured');
    this.name = 'StripeNotConfigured';
  }
}

// Lazy singleton — only instantiated once STRIPE_SECRET_KEY is available.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new StripeNotConfigured();
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' });
  }
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

export function isStripeConnectConfigured(): boolean {
  return isStripeConfigured();
}

export function assertStripeConfigured(): void {
  if (!isStripeConfigured()) throw new StripeNotConfigured();
}

/**
 * Public-facing Stripe status — safe to expose via API.
 * Frontend uses this to decide whether to show payment UI.
 */
export function stripeStatus() {
  return {
    configured: isStripeConfigured(),
    connectConfigured: isStripeConnectConfigured(),
    publishableKey: env.STRIPE_PUBLISHABLE_KEY ?? null,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Connect Embedded — create accounts + account sessions (no OAuth redirect)
// ────────────────────────────────────────────────────────────────────────────

/** Create an Express connected account for a barber (idempotent — call once). */
export async function createConnectedAccount(email: string): Promise<string> {
  const account = await getStripe().accounts.create({
    type: 'express',
    email,
    country: 'LU',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  return account.id;
}

/** Create a short-lived Account Session for the frontend embedded components. */
export async function createAccountSession(accountId: string): Promise<string> {
  const session = await getStripe().accountSessions.create({
    account: accountId,
    components: {
      account_onboarding: { enabled: true },
      payouts: { enabled: true },
    },
  });
  return session.client_secret;
}

/** Retrieve a connected account to check onboarding status. */
export async function retrieveConnectedAccount(accountId: string): Promise<Stripe.Account> {
  return getStripe().accounts.retrieve(accountId);
}

// ────────────────────────────────────────────────────────────────────────────
// Plans — create Product + Price + Payment Link on the connected account
// ────────────────────────────────────────────────────────────────────────────

export interface CreatePlanInput {
  stripeAccountId: string;
  name: string;
  description?: string;
  priceEUR: number; // e.g. 49.99 — converted to cents internally
  metadata?: Record<string, string>;
}

export interface CreatePlanResult {
  productId: string;
  priceId: string;
  paymentLinkUrl: string;
}

/**
 * Create a Stripe Product, monthly Price, and a Payment Link — all on the
 * barber's connected account so they receive the funds directly.
 *
 * metadata should include at least: { planId, clientId } so the webhook can
 * identify which subscription to activate after checkout.session.completed.
 */
export async function createPlanOnConnectedAccount(
  input: CreatePlanInput,
): Promise<CreatePlanResult> {
  const stripe = getStripe();
  const opts: Stripe.RequestOptions = { stripeAccount: input.stripeAccountId };

  const product = await stripe.products.create(
    { name: input.name, description: input.description },
    opts,
  );

  const price = await stripe.prices.create(
    {
      product: product.id,
      unit_amount: Math.round(input.priceEUR * 100),
      currency: 'eur',
      recurring: { interval: 'month' },
    },
    opts,
  );

  const link = await stripe.paymentLinks.create(
    {
      line_items: [{ price: price.id, quantity: 1 }],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${env.APP_URL}/client/subscription?stripe=success`,
        },
      },
      metadata: input.metadata,
    },
    opts,
  );

  return { productId: product.id, priceId: price.id, paymentLinkUrl: link.url };
}

// ────────────────────────────────────────────────────────────────────────────
// Subscriptions
// ────────────────────────────────────────────────────────────────────────────

/** Cancel a Stripe subscription immediately on the connected account. */
export async function cancelSubscription(
  stripeAccountId: string,
  stripeSubscriptionId: string,
): Promise<void> {
  await getStripe().subscriptions.cancel(
    stripeSubscriptionId,
    {},
    { stripeAccount: stripeAccountId },
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Webhooks
// ────────────────────────────────────────────────────────────────────────────

/**
 * Verify the Stripe-Signature header against the raw request body.
 *
 * IMPORTANT: Express must receive the raw Buffer on the webhook route (not
 * the parsed JSON body). See app.ts where express.raw() is mounted before
 * express.json() specifically for /api/webhooks/stripe.
 */
export function verifyWebhookSignature(rawBody: Buffer, signature: string): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new StripeNotConfigured();
  return getStripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
}
