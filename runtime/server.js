'use strict'; const http = require('http');
const { env } = require('./config/env');
const { applyCors, parseUrl, sendError } = require('./lib/http');
const { createListingsHandlers } = require('./handlers/listings');
const { createStripeHandlers } = require('./handlers/stripe');
const { createAlertsHandlers } = require('./handlers/alerts');
const chatHandlers = require('./handlers/chat');
const { createStripeClient } = require('./services/stripe-client');
const { createRouter } = require('./router'); const stripe = createStripeClient(env.stripeSecretKey);
const listingsHandlers = createListingsHandlers(env);
const stripeHandlers = createStripeHandlers(env, stripe);
const alertsHandlers = createAlertsHandlers(env);
const route = createRouter(listingsHandlers, stripeHandlers, alertsHandlers, chatHandlers); const server = http.createServer(async (req, res) => { try { applyCors(req, res, env.corsOrigin); if (String(req.method || '').toUpperCase() === 'OPTIONS') { res.statusCode = 204; return res.end(); } const url = parseUrl(req); return await route(req, res, url); } catch (error) { return sendError(res, 500, 'runtime_unhandled_error', error.message || 'unknown'); }
}); server.listen(env.port, () => { // eslint-disable-next-line no-console console.log('[runtime] listening on :' + env.port + ' (' + env.nodeEnv + ')');
});
