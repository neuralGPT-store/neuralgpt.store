/**
 * Alerts handlers placeholder for Cloudflare Workers
 * TODO: Migrate full alerts.js from runtime/handlers/alerts.js
 */

import { sendError } from '../lib/http.js';

function createAlertsHandlers(env) {
  const notImplemented = (request) => {
    return sendError(503, 'alerts_pending_migration', 'Use Node runtime for alerts', request);
  };

  return {
    subscribe: notImplemented,
    unsubscribe: notImplemented
  };
}

export { createAlertsHandlers };
