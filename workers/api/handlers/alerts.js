/**
 * Alerts handlers for Cloudflare Workers
 * Migrated from runtime/handlers/alerts.js
 * Uses KV storage directly instead of external API calls
 */

import { readJsonBody, sendError, sendJson } from '../lib/http.js';

const MAX_JSON_BYTES = 64 * 1024;

// ── Crypto helpers for Web Crypto API ──

async function sha256(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(String(input || ''));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(size) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ── Alert helpers ──

function generateAlertId() {
  return `alrt_${Date.now()}_${randomToken(8)}`;
}

async function generateUnsubscribeToken(email, alertId) {
  const data = `${email}:${alertId}:${Date.now()}`;
  const hash = await sha256(data);
  return hash.slice(0, 32);
}

async function hashEmail(email) {
  return await sha256(email.toLowerCase().trim());
}

function createAlertsHandlers(env) {
  /**
   * POST /api/alerts/subscribe
   * Create a new search alert
   */
  async function subscribe(request) {
    let body;
    try {
      body = await readJsonBody(request, MAX_JSON_BYTES);
    } catch (error) {
      return sendError(null, 400, 'invalid_json_body', error.message);
    }

    const { email, operation, country, city, price_max, surface_min, asset_type } = body;

    if (!email || !operation) {
      return sendError(null, 400, 'email_and_operation_required');
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(null, 400, 'invalid_email');
    }

    // Generate unique ID and unsubscribe token
    const alertId = generateAlertId();
    const unsubscribeToken = await generateUnsubscribeToken(email, alertId);

    // Alert data (GDPR: minimal data)
    const alertData = {
      alert_id: alertId,
      email_hash: await hashEmail(email),
      email: email, // Original email (needed for notifications)
      operation: operation,
      country: country || null,
      city: city || null,
      price_max: price_max || null,
      surface_min: surface_min || null,
      asset_type: asset_type || null,
      unsubscribe_token: unsubscribeToken,
      created_at: Date.now(),
      expires_at: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 days
      active: true
    };

    // Save to KV with 90-day TTL
    const key = `alert:${alertId}`;
    const ttl = 90 * 24 * 60 * 60; // 90 days in seconds

    try {
      await env.LISTINGS_KV.put(key, JSON.stringify(alertData), {
        expirationTtl: ttl
      });

      const publicBaseUrl = env.PUBLIC_BASE_URL || 'https://neuralgpt.store';

      return sendJson(null, 200, {
        ok: true,
        alert_id: alertId,
        message: 'Alerta creada con éxito. Te notificaremos cuando haya nuevos activos que coincidan.',
        unsubscribe_url: `${publicBaseUrl}/alert-unsubscribe.html?id=${alertId}&token=${unsubscribeToken}`
      });
    } catch (error) {
      return sendError(null, 500, 'kv_write_failed', error.message);
    }
  }

  /**
   * DELETE /api/alerts/unsubscribe
   * Cancel an alert (unsubscribe)
   */
  async function unsubscribe(request) {
    let body;
    try {
      body = await readJsonBody(request, MAX_JSON_BYTES);
    } catch (error) {
      return sendError(null, 400, 'invalid_json_body', error.message);
    }

    const { alert_id, token } = body;

    if (!alert_id || !token) {
      return sendError(null, 400, 'alert_id_and_token_required');
    }

    const key = `alert:${alert_id}`;

    try {
      // Read current alert
      const current = await env.LISTINGS_KV.get(key, 'json');

      if (!current) {
        return sendError(null, 404, 'alert_not_found');
      }

      // Verify token
      if (current.unsubscribe_token !== token) {
        return sendError(null, 403, 'invalid_unsubscribe_token');
      }

      // Mark as inactive instead of deleting (for audit trail)
      current.active = false;
      current.cancelled_at = Date.now();

      // Keep for 30 more days
      const ttl = 30 * 24 * 60 * 60; // 30 days in seconds
      await env.LISTINGS_KV.put(key, JSON.stringify(current), {
        expirationTtl: ttl
      });

      return sendJson(null, 200, {
        ok: true,
        message: 'Alerta cancelada con éxito. No recibirás más notificaciones.'
      });
    } catch (error) {
      return sendError(null, 500, 'kv_operation_failed', error.message);
    }
  }

  return {
    subscribe,
    unsubscribe
  };
}

export { createAlertsHandlers };
