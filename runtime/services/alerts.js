'use strict';

/**
 * alerts.js — Sistema de alertas por email con Cloudflare KV
 * RGPD-compliant: almacenamiento temporal (90 días), datos mínimos, opción de baja
 */

const crypto = require('crypto');
const https = require('https');

/**
 * Crea una alerta de búsqueda
 * @param {Object} config - { accountId, namespaceId, apiToken }
 * @param {Object} alertData - { email, operation, country, city, price_max, surface_min, asset_type }
 * @returns {Promise<{ok: boolean, alert_id?: string, unsubscribe_token?: string, error?: string}>}
 */
async function createAlert(config, alertData) {
  const { accountId, namespaceId, apiToken } = config;

  if (!accountId || !namespaceId || !apiToken) {
    return { ok: false, error: 'cloudflare_kv_not_configured' };
  }

  if (!alertData || !alertData.email || !alertData.operation) {
    return { ok: false, error: 'email_and_operation_required' };
  }

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(alertData.email)) {
    return { ok: false, error: 'invalid_email' };
  }

  // Generar ID único y token de baja
  const alertId = generateAlertId();
  const unsubscribeToken = generateUnsubscribeToken(alertData.email, alertId);

  // Clave en KV: alert:{alertId}
  const key = `alert:${alertId}`;

  // Datos de la alerta (RGPD: solo lo mínimo)
  const value = JSON.stringify({
    alert_id: alertId,
    email_hash: hashEmail(alertData.email), // Hash del email para privacidad
    email: alertData.email, // Email original (necesario para enviar notificaciones)
    operation: alertData.operation,
    country: alertData.country || null,
    city: alertData.city || null,
    price_max: alertData.price_max || null,
    surface_min: alertData.surface_min || null,
    asset_type: alertData.asset_type || null,
    unsubscribe_token: unsubscribeToken,
    created_at: Date.now(),
    expires_at: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 días
    active: true
  });

  // Guardar en Cloudflare KV con TTL de 90 días
  const result = await writeToKV(config, key, value, 90 * 24 * 60 * 60); // TTL en segundos

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    alert_id: alertId,
    unsubscribe_token: unsubscribeToken,
    email: alertData.email
  };
}

/**
 * Cancela una alerta (baja)
 * @param {Object} config - { accountId, namespaceId, apiToken }
 * @param {string} alertId - ID de la alerta
 * @param {string} unsubscribeToken - Token de verificación
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function cancelAlert(config, alertId, unsubscribeToken) {
  const { accountId, namespaceId, apiToken } = config;

  if (!accountId || !namespaceId || !apiToken) {
    return { ok: false, error: 'cloudflare_kv_not_configured' };
  }

  if (!alertId || !unsubscribeToken) {
    return { ok: false, error: 'alert_id_and_token_required' };
  }

  const key = `alert:${alertId}`;

  // Leer alerta actual
  const current = await readFromKV(config, key);
  if (!current.ok) {
    return { ok: false, error: 'alert_not_found' };
  }

  const alertData = JSON.parse(current.value);

  // Verificar token
  if (alertData.unsubscribe_token !== unsubscribeToken) {
    return { ok: false, error: 'invalid_unsubscribe_token' };
  }

  // Marcar como inactiva en lugar de eliminar (para auditoría)
  alertData.active = false;
  alertData.cancelled_at = Date.now();

  const result = await writeToKV(config, key, JSON.stringify(alertData), 30 * 24 * 60 * 60); // Mantener 30 días más

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, alert_id: alertId };
}

/**
 * Lista todas las alertas activas (para enviar notificaciones)
 * @param {Object} config - { accountId, namespaceId, apiToken }
 * @returns {Promise<{ok: boolean, alerts?: Array, error?: string}>}
 */
async function listActiveAlerts(config) {
  const { accountId, namespaceId, apiToken } = config;

  if (!accountId || !namespaceId || !apiToken) {
    return { ok: false, error: 'cloudflare_kv_not_configured' };
  }

  // Listar claves con prefijo "alert:"
  const path = `/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/keys?prefix=alert:`;

  const options = {
    hostname: 'api.cloudflare.com',
    port: 443,
    path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', async () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const response = JSON.parse(data);
          const keys = response.result || [];

          // Leer cada alerta
          const alerts = [];
          for (const keyInfo of keys) {
            const alertResult = await readFromKV(config, keyInfo.name);
            if (alertResult.ok) {
              const alert = JSON.parse(alertResult.value);
              if (alert.active) {
                alerts.push(alert);
              }
            }
          }

          resolve({ ok: true, alerts });
        } else {
          resolve({ ok: false, error: 'kv_list_failed', status: res.statusCode, response: data });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ ok: false, error: 'kv_request_error', message: error.message });
    });

    req.end();
  });
}

/**
 * Escribe un valor en Cloudflare KV
 */
async function writeToKV(config, key, value, ttl = null) {
  const { accountId, namespaceId, apiToken } = config;

  let path = `/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
  if (ttl) {
    path += `?expiration_ttl=${ttl}`;
  }

  const options = {
    hostname: 'api.cloudflare.com',
    port: 443,
    path,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(value)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true });
        } else {
          resolve({ ok: false, error: 'kv_write_failed', status: res.statusCode, response: data });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ ok: false, error: 'kv_request_error', message: error.message });
    });

    req.write(value);
    req.end();
  });
}

/**
 * Lee un valor de Cloudflare KV
 */
async function readFromKV(config, key) {
  const { accountId, namespaceId, apiToken } = config;

  const path = `/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;

  const options = {
    hostname: 'api.cloudflare.com',
    port: 443,
    path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ ok: true, value: data });
        } else if (res.statusCode === 404) {
          resolve({ ok: false, error: 'not_found' });
        } else {
          resolve({ ok: false, error: 'kv_read_failed', status: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ ok: false, error: 'kv_request_error', message: error.message });
    });

    req.end();
  });
}

/**
 * Genera ID único para alerta
 */
function generateAlertId() {
  return `alrt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Genera token de baja único
 */
function generateUnsubscribeToken(email, alertId) {
  const data = `${email}:${alertId}:${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
}

/**
 * Hash de email para privacidad
 */
function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

module.exports = {
  createAlert,
  cancelAlert,
  listActiveAlerts
};
