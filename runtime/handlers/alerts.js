'use strict';

const { createAlert, cancelAlert } = require('../services/alerts');
const { readJsonBody, sendError, sendJson } = require('../lib/http');

const MAX_JSON_BYTES = 64 * 1024;

function createAlertsHandlers(env) {
  /**
   * POST /api/alerts/subscribe
   * Crea una nueva alerta de búsqueda
   */
  async function subscribe(req, res) {
    let body;
    try {
      body = await readJsonBody(req, MAX_JSON_BYTES);
    } catch (error) {
      return sendError(res, 400, 'invalid_json_body');
    }

    const { email, operation, country, city, price_max, surface_min, asset_type } = body;

    if (!email || !operation) {
      return sendError(res, 400, 'email_and_operation_required');
    }

    const config = {
      accountId: env.cfAccountId,
      namespaceId: env.cfKvNamespaceId,
      apiToken: env.cfKvApiToken
    };

    const result = await createAlert(config, {
      email,
      operation,
      country: country || null,
      city: city || null,
      price_max: price_max || null,
      surface_min: surface_min || null,
      asset_type: asset_type || null
    });

    if (!result.ok) {
      return sendError(res, 400, result.error);
    }

    // TODO: Enviar email de confirmación con enlace de baja
    // Por ahora, devolvemos el token en la respuesta (en producción, esto iría por email)

    return sendJson(res, 200, {
      ok: true,
      alert_id: result.alert_id,
      message: 'Alerta creada con éxito. Te notificaremos cuando haya nuevos activos que coincidan.',
      unsubscribe_url: `${env.publicBaseUrl}/alert-unsubscribe.html?id=${result.alert_id}&token=${result.unsubscribe_token}`
    });
  }

  /**
   * DELETE /api/alerts/unsubscribe
   * Cancela una alerta (baja)
   */
  async function unsubscribe(req, res) {
    let body;
    try {
      body = await readJsonBody(req, MAX_JSON_BYTES);
    } catch (error) {
      return sendError(res, 400, 'invalid_json_body');
    }

    const { alert_id, token } = body;

    if (!alert_id || !token) {
      return sendError(res, 400, 'alert_id_and_token_required');
    }

    const config = {
      accountId: env.cfAccountId,
      namespaceId: env.cfKvNamespaceId,
      apiToken: env.cfKvApiToken
    };

    const result = await cancelAlert(config, alert_id, token);

    if (!result.ok) {
      if (result.error === 'alert_not_found') {
        return sendError(res, 404, 'alert_not_found');
      }
      if (result.error === 'invalid_unsubscribe_token') {
        return sendError(res, 403, 'invalid_unsubscribe_token');
      }
      return sendError(res, 400, result.error);
    }

    return sendJson(res, 200, {
      ok: true,
      message: 'Alerta cancelada con éxito. No recibirás más notificaciones.'
    });
  }

  return {
    subscribe,
    unsubscribe
  };
}

module.exports = {
  createAlertsHandlers
};
