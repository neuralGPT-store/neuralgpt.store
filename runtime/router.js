'use strict';

const { sendError, sendJson } = require('./lib/http');
const { env } = require('./config/env');

/**
 * Middleware de autenticación para endpoints /api/*
 * Excepciones: /api/health y /api/stripe/webhook
 */
function authenticateApiRequest(req, path) {
  // Excepciones: endpoints públicos
  if (path === '/api/health' || path === '/api/stripe/webhook') {
    return { authenticated: true };
  }

  // Verificar que la API key esté configurada
  if (!env.apiSecretKey || env.apiSecretKey.trim() === '') {
    return {
      authenticated: false,
      error: 'api_key_not_configured',
      message: 'API authentication is not configured on the server'
    };
  }

  // Obtener el header X-API-Key
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];

  if (!apiKey) {
    return {
      authenticated: false,
      error: 'missing_api_key',
      message: 'Missing X-API-Key header'
    };
  }

  // Comparación constante en tiempo para prevenir timing attacks
  const providedKey = String(apiKey);
  const expectedKey = env.apiSecretKey;

  if (providedKey.length !== expectedKey.length) {
    return {
      authenticated: false,
      error: 'invalid_api_key',
      message: 'Invalid API key'
    };
  }

  let mismatch = 0;
  for (let i = 0; i < providedKey.length; i++) {
    mismatch |= providedKey.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }

  if (mismatch !== 0) {
    return {
      authenticated: false,
      error: 'invalid_api_key',
      message: 'Invalid API key'
    };
  }

  return { authenticated: true };
}

function createRouter(listingsHandlers, stripeHandlers, alertsHandlers) {
  return async function route(req, res, url) {
    const method = String(req.method || 'GET').toUpperCase();
    const path = url.pathname;

    // Autenticación para todos los endpoints /api/* (excepto excepciones)
    if (path.startsWith('/api/')) {
      const authResult = authenticateApiRequest(req, path);
      if (!authResult.authenticated) {
        return sendError(res, 401, authResult.error);
      }
    }

    // Health check (público)
    if (path === '/api/health' && method === 'GET') {
      return sendJson(res, 200, { ok: true, runtime: 'ready' });
    }

    // Rutas de alertas
    if (path === '/api/alerts/subscribe') {
      if (method !== 'POST') return sendError(res, 405, 'method_not_allowed');
      return alertsHandlers.subscribe(req, res);
    }

    if (path === '/api/alerts/unsubscribe') {
      if (method !== 'DELETE') return sendError(res, 405, 'method_not_allowed');
      return alertsHandlers.unsubscribe(req, res);
    }

    // Rutas de listings
    if (path === '/api/listings/status') {
      if (method !== 'POST') return sendError(res, 405, 'method_not_allowed');
      return listingsHandlers.getStatus(req, res);
    }

    if (path === '/api/listings/upsert') {
      if (method !== 'POST') return sendError(res, 405, 'method_not_allowed');
      return listingsHandlers.upsert(req, res);
    }

    // Rutas de Stripe checkout
    if (path === '/api/stripe/checkout-mas-visibilidad') {
      if (method !== 'POST') return sendError(res, 405, 'method_not_allowed');
      return stripeHandlers.checkoutMasVisibilidad(req, res);
    }

    if (path === '/api/stripe/checkout-sensacional') {
      if (method !== 'POST') return sendError(res, 405, 'method_not_allowed');
      return stripeHandlers.checkoutSensacional(req, res);
    }

    if (path === '/api/stripe/checkout-plan-basico') {
      if (method !== 'POST') return sendError(res, 405, 'method_not_allowed');
      return stripeHandlers.checkoutPlanBasico(req, res);
    }

    if (path === '/api/stripe/checkout-plan-premium') {
      if (method !== 'POST') return sendError(res, 405, 'method_not_allowed');
      return stripeHandlers.checkoutPlanPremium(req, res);
    }

    if (path === '/api/stripe/checkout-plan-enterprise') {
      if (method !== 'POST') return sendError(res, 405, 'method_not_allowed');
      return stripeHandlers.checkoutPlanEnterprise(req, res);
    }

    if (path === '/api/stripe/checkout-publicacion-adicional') {
      if (method !== 'POST') return sendError(res, 405, 'method_not_allowed');
      return stripeHandlers.checkoutPublicacionAdicional(req, res);
    }

    if (path === '/api/stripe/billing-portal') {
      if (method !== 'POST') return sendError(res, 405, 'method_not_allowed');
      return stripeHandlers.billingPortal(req, res);
    }

    // Webhook de Stripe (público, autenticado por Stripe signature)
    if (path === '/api/stripe/webhook') {
      if (method !== 'POST') return sendError(res, 405, 'method_not_allowed');
      return stripeHandlers.webhook(req, res);
    }

    return sendError(res, 404, 'route_not_found');
  };
}

module.exports = { createRouter };
