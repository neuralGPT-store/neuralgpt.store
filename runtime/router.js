'use strict';

const { sendError, sendJson } = require('./lib/http');

function createRouter(listingsHandlers, stripeHandlers) {
  return async function route(req, res, url) {
    const method = String(req.method || 'GET').toUpperCase();
    const path = url.pathname;

    if (path === '/api/health' && method === 'GET') {
      return sendJson(res, 200, { ok: true, runtime: 'ready' });
    }

    if (path === '/api/listings/status') {
      if (method !== 'GET') return sendError(res, 405, 'method_not_allowed');
      return listingsHandlers.getStatus(req, res);
    }

    if (path === '/api/listings/upsert') {
      if (method !== 'POST') return sendError(res, 405, 'method_not_allowed');
      return listingsHandlers.upsert(req, res);
    }

    if (path === '/api/stripe/checkout-contact-unlock') {
      if (method !== 'POST') return sendError(res, 405, 'method_not_allowed');
      return stripeHandlers.checkoutContactUnlock(req, res);
    }

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

    if (path === '/api/stripe/webhook') {
      if (method !== 'POST') return sendError(res, 405, 'method_not_allowed');
      return stripeHandlers.webhook(req, res);
    }

    return sendError(res, 404, 'route_not_found');
  };
}

module.exports = {
  createRouter
};
