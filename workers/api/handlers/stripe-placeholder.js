/**
 * Stripe handlers placeholder for Cloudflare Workers
 * TODO: Migrate full stripe.js from runtime/handlers/stripe.js
 * For now, returns 503 service unavailable
 */

import { sendError } from '../lib/http.js';

function createStripeHandlers(env, stripe) {
  const notImplemented = (request) => {
    return sendError(503, 'stripe_handlers_pending_migration', 'Use Node runtime for Stripe operations', request);
  };

  return {
    checkoutMasVisibilidad: notImplemented,
    checkoutSensacional: notImplemented,
    checkoutPlanBasico: notImplemented,
    checkoutPlanPremium: notImplemented,
    checkoutPlanEnterprise: notImplemented,
    checkoutPublicacionAdicional: notImplemented,
    billingPortal: notImplemented,
    webhook: notImplemented
  };
}

export { createStripeHandlers };
