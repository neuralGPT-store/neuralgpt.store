/**
 * Stripe client initialization for Cloudflare Workers
 * Uses stripe npm package (compatible with Workers)
 */

import Stripe from 'stripe';

function createStripeClient(secretKey) {
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient()
  });
}

export { createStripeClient };
