/**
 * Router for Cloudflare Workers API
 */

import { sendError, sendJson } from './lib/http.js';

function requireApiKey(request, env) {
  if (!env.API_SECRET_KEY || env.API_SECRET_KEY.trim() === '') {
    return { authenticated: false, error: 'api_key_not_configured' };
  }

  const apiKey = request.headers.get('x-api-key') || request.headers.get('X-API-Key');

  if (!apiKey) {
    return { authenticated: false, error: 'missing_api_key' };
  }

  // Constant-time comparison
  const providedKey = String(apiKey);
  const expectedKey = env.API_SECRET_KEY;

  if (providedKey.length !== expectedKey.length) {
    return { authenticated: false, error: 'invalid_api_key' };
  }

  let mismatch = 0;
  for (let i = 0; i < providedKey.length; i++) {
    mismatch |= providedKey.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }

  if (mismatch !== 0) {
    return { authenticated: false, error: 'invalid_api_key' };
  }

  return { authenticated: true };
}

function createRouter(listingsHandlers, stripeHandlers, alertsHandlers) {
  return async function route(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Health check
    if (path === '/api/health' && method === 'GET') {
      return sendJson(200, { ok: true, runtime: 'cloudflare_workers' }, request);
    }

    // Listings routes (public - protected by honeypot and validation)
    if (path === '/api/listings/status') {
      if (method !== 'POST') return sendError(405, 'method_not_allowed', null, request);
      return listingsHandlers.getStatus(request);
    }

    if (path === '/api/listings/upsert') {
      if (method !== 'POST') return sendError(405, 'method_not_allowed', null, request);
      return listingsHandlers.upsert(request);
    }

    // Alerts routes (public)
    if (path === '/api/alerts/subscribe') {
      if (method !== 'POST') return sendError(405, 'method_not_allowed', null, request);
      return alertsHandlers.subscribe(request);
    }

    if (path === '/api/alerts/unsubscribe') {
      if (method !== 'DELETE') return sendError(405, 'method_not_allowed', null, request);
      return alertsHandlers.unsubscribe(request);
    }

    // Stripe routes (protected with API key)
    if (path.startsWith('/api/stripe/checkout-')) {
      if (method !== 'POST') return sendError(405, 'method_not_allowed', null, request);

      const auth = requireApiKey(request, env);
      if (!auth.authenticated) return sendError(401, auth.error, null, request);

      // Dispatch to appropriate checkout handler
      if (path === '/api/stripe/checkout-mas-visibilidad') {
        return stripeHandlers.checkoutMasVisibilidad(request);
      }
      if (path === '/api/stripe/checkout-sensacional') {
        return stripeHandlers.checkoutSensacional(request);
      }
      if (path === '/api/stripe/checkout-plan-basico') {
        return stripeHandlers.checkoutPlanBasico(request);
      }
      if (path === '/api/stripe/checkout-plan-premium') {
        return stripeHandlers.checkoutPlanPremium(request);
      }
      if (path === '/api/stripe/checkout-plan-enterprise') {
        return stripeHandlers.checkoutPlanEnterprise(request);
      }
      if (path === '/api/stripe/checkout-publicacion-adicional') {
        return stripeHandlers.checkoutPublicacionAdicional(request);
      }
    }

    if (path === '/api/stripe/billing-portal') {
      if (method !== 'POST') return sendError(405, 'method_not_allowed', null, request);
      const auth = requireApiKey(request, env);
      if (!auth.authenticated) return sendError(401, auth.error, null, request);
      return stripeHandlers.billingPortal(request);
    }

    // Webhook (public, authenticated by Stripe signature)
    if (path === '/api/stripe/webhook') {
      if (method !== 'POST') return sendError(405, 'method_not_allowed', null, request);
      return stripeHandlers.webhook(request);
    }

    return sendError(404, 'route_not_found', null, request);
  };
}

export { createRouter };
