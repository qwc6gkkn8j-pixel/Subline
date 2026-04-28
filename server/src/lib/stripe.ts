/**
 * Stripe Connect integration — stub.
 *
 * This module exposes the full surface area we'll need (plan creation,
 * Connect OAuth, checkout sessions, webhook verification) but every method
 * throws StripeNotConfigured until STRIPE_SECRET_KEY is set in env.
 *
 * ── To activate (when you have a Stripe account ready) ───────────────────
 * 1. `npm install stripe` in the server workspace
 * 2. Set in server/.env:
 *      STRIPE_SECRET_KEY=sk_test_...
 *      STRIPE_WEBHOOK_SECRET=whsec_...
 *      STRIPE_CLIENT_ID=ca_...    (Connect platform client_id)
 *      STRIPE_PUBLISHABLE_KEY=pk_test_...
 * 3. Replace the function bodies below with real Stripe SDK calls.
 *    Each function has the intended call documented inline.
 *
 * Routes that depend on Stripe should call `assertStripeConfigured()` at the
 * top and let the error middleware translate it to a 503.
 */

import { env } from './env.js';

export class StripeNotConfigured extends Error {
  status = 503;
  constructor(message = 'Stripe is not configured on this server') {
    super(message);
    this.name = 'StripeNotConfigured';
  }
}

export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

export function assertStripeConfigured(): void {
  if (!isStripeConfigured()) throw new StripeNotConfigured();
}

// ────────────────────────────────────────────────────────────────────────────
// Connect OAuth — barber connects their Stripe account to the platform
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the URL the barber clicks to authorize the platform.
 *
 * Real impl:
 *   const url = new URL('https://connect.stripe.com/oauth/authorize');
 *   url.searchParams.set('response_type', 'code');
 *   url.searchParams.set('client_id', env.STRIPE_CLIENT_ID!);
 *   url.searchParams.set('scope', 'read_write');
 *   url.searchParams.set('state', state);
 *   url.searchParams.set('redirect_uri', `${env.APP_URL}/api/stripe/callback`);
 *   return url.toString();
 */
export function buildConnectOAuthUrl(_state: string): string {
  assertStripeConfigured();
  throw new StripeNotConfigured();
}

/**
 * Exchange the OAuth code for the barber's connected account id.
 *
 * Real impl:
 *   const result = await stripe.oauth.token({ grant_type: 'authorization_code', code });
 *   return result.stripe_user_id;  // → save to barber.stripeAccountId
 */
export async function exchangeConnectCode(_code: string): Promise<string> {
  assertStripeConfigured();
  throw new StripeNotConfigured();
}

// ────────────────────────────────────────────────────────────────────────────
// Plans — create Product + Price + Payment Link on the connected account
// ────────────────────────────────────────────────────────────────────────────

export interface CreatePlanInput {
  stripeAccountId: string;
  name: string;
  description?: string;
  priceEUR: number; // in euros (e.g. 49.99)
  metadata?: Record<string, string>;
}

export interface CreatePlanResult {
  productId: string;
  priceId: string;
  paymentLinkUrl: string;
}

/**
 * Real impl:
 *   const product = await stripe.products.create(
 *     { name, description },
 *     { stripeAccount: stripeAccountId }
 *   );
 *   const price = await stripe.prices.create(
 *     { product: product.id, unit_amount: Math.round(priceEUR * 100),
 *       currency: 'eur', recurring: { interval: 'month' } },
 *     { stripeAccount: stripeAccountId }
 *   );
 *   const link = await stripe.paymentLinks.create(
 *     { line_items: [{ price: price.id, quantity: 1 }],
 *       after_completion: { type: 'redirect',
 *         redirect: { url: `${env.APP_URL}/client/subscription-success` } },
 *       metadata },
 *     { stripeAccount: stripeAccountId }
 *   );
 *   return { productId: product.id, priceId: price.id, paymentLinkUrl: link.url };
 */
export async function createPlanOnConnectedAccount(
  _input: CreatePlanInput,
): Promise<CreatePlanResult> {
  assertStripeConfigured();
  throw new StripeNotConfigured();
}

// ────────────────────────────────────────────────────────────────────────────
// Subscriptions
// ────────────────────────────────────────────────────────────────────────────

/** Cancel a subscription on the connected account. */
export async function cancelSubscription(
  _stripeAccountId: string,
  _stripeSubscriptionId: string,
): Promise<void> {
  assertStripeConfigured();
  throw new StripeNotConfigured();
}

// ────────────────────────────────────────────────────────────────────────────
// Webhooks
// ────────────────────────────────────────────────────────────────────────────

/**
 * Verify the Stripe-Signature header against the raw request body.
 *
 * Real impl:
 *   return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET!);
 *
 * Always pass the *raw* body (Buffer), not the parsed JSON. Our Express app
 * needs a raw body parser specifically on the webhook route — see the route
 * file's setup.
 */
export function verifyWebhookSignature(_rawBody: Buffer, _signature: string): unknown {
  assertStripeConfigured();
  throw new StripeNotConfigured();
}
