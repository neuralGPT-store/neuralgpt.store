/**
 * Cloudflare Worker entry point for neuralgpt.store API
 * Handles all /api/* routes
 */

import { createRouter } from './router.js';
import { createListingsHandlers } from './handlers/listings.js';
import { createStripeHandlers } from './handlers/stripe-placeholder.js';
import { createAlertsHandlers } from './handlers/alerts-placeholder.js';
import { createStripeClient } from './services/stripe-client.js';
import { getEnv } from './config/env.js';
import { applyCors, setSecurityHeaders } from './lib/http.js';

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      const headers = new Headers();
      applyCors(request, headers);
      setSecurityHeaders(headers);
      return new Response(null, { status: 204, headers });
    }

    try {
      // Get config from environment
      const config = getEnv(env);

      // Initialize Stripe client
      const stripe = createStripeClient(config.stripeSecretKey);

      // Create handlers
      const listingsHandlers = createListingsHandlers(env);
      const stripeHandlers = createStripeHandlers(env, stripe);
      const alertsHandlers = createAlertsHandlers(env);

      // Create router
      const router = createRouter(listingsHandlers, stripeHandlers, alertsHandlers);

      // Route request
      const response = await router(request, env);
      return response;

    } catch (error) {
      console.error('[Worker Error]', error);

      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      applyCors(request, headers);
      setSecurityHeaders(headers);

      return new Response(
        JSON.stringify({
          ok: false,
          error: 'internal_server_error',
          message: error.message || 'Unknown error'
        }),
        { status: 500, headers }
      );
    }
  }
};
