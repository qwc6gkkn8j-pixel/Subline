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
  return isStripeConfigured() && Boolean(env.STRIPE_CLIENT_ID);
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
// Connect OAuth — barber connects their Stripe account to the platform
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the URL the barber clicks to authorize the platform.
 * @param state  barberId — returned verbatim in the OAuth callback so we know
 *               which barber is connecting.
 */
export function buildConnectOAuthUrl(state: string): string {
  if (!env.STRIPE_CLIENT_ID) throw new StripeNotConfigured();
  const url = new URL('https://connect.stripe.com/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', env.STRIPE_CLIENT_ID);
  url.searchParams.set('scope', 'read_write');
  url.searchParams.set('state', state);
  url.searchParams.set('redirect_uri', `${env.API_URL}/api/public/stripe/callback`);
  return url.toString();
}

/**
 * Exchange the OAuth code (from Stripe callback) for the barber's account id.
 * Save the returned string to barber.stripeAccountId.
 */
export async function exchangeConnectCode(code: string): Promise<string> {
  const result = await getStripe().oauth.token({
    grant_type: 'authorization_code',
    code,
  });
  if (!result.stripe_user_id) {
    throw new Error('Stripe OAuth token response is missing stripe_user_id');
  }
  return result.stripe_user_id;
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
