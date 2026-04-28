'use strict';

const { sendError, sendJson, readBody } = require('../lib/http');
const { env } = require('../config/env');

/**
 * Rate limiting simple en memoria (por IP)
 * En producción debería usar Redis o similar
 */
const rateLimitMap = new Map();
const MAX_MESSAGES_PER_HOUR = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hora

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  // Reset si expiró la ventana
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  // Incrementar contador
  record.count++;
  rateLimitMap.set(ip, record);

  // Verificar límite
  if (record.count > MAX_MESSAGES_PER_HOUR) {
    const resetInMinutes = Math.ceil((record.resetAt - now) / 60000);
    return {
      allowed: false,
      resetInMinutes
    };
  }

  return { allowed: true };
}

/**
 * Limpiar registros antiguos cada hora
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt + RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

/**
 * System prompt para Chany
 */
const SYSTEM_PROMPT = `Eres Chany, asistente virtual de neuralgpt.store, el portal inmobiliario premium de España.

Tu rol:
- Ayudar a usuarios con dudas sobre inmuebles, compra, alquiler, documentación y mercado español
- Tono profesional pero cercano y amigable
- Respuestas concisas y útiles (máximo 200 palabras)
- Si no sabes algo, reconócelo y sugiere contactar con el equipo

Datos clave del portal:
- Cobertura: toda España (península, Baleares, Canarias, Ceuta, Melilla)
- Servicios: venta, alquiler de larga duración
- Verificación manual de cada anuncio
- Contacto directo con anunciantes
- Publicación desde 5€

Temas en los que puedes ayudar:
- Proceso de compra/alquiler en España
- Documentación necesaria
- Impuestos (ITP, IVA, plusvalía, IRPF alquiler)
- Hipotecas y financiación
- Escrituras y registro
- Certificados energéticos
- Comunidades de propietarios
- Derechos de inquilinos/propietarios
- Precios orientativos por zona
- Funcionamiento del portal

Importante: No inventes datos de listings específicos. Para ver inmuebles reales, deriva a /venta.html o /alquiler.html`;

/**
 * Handler POST /api/chat
 * Integración con Claude API (Anthropic)
 */
async function chat(req, res) {
  try {
    // Verificar que la API key de Anthropic esté configurada
    if (!env.anthropicApiKey || env.anthropicApiKey.trim() === '') {
      console.warn('[ChatHandler] ANTHROPIC_API_KEY not configured');
      return sendError(res, 503, 'chat_service_unavailable');
    }

    // Obtener IP del cliente
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     req.connection?.remoteAddress ||
                     'unknown';

    // Rate limiting
    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return sendError(res, 429, 'rate_limit_exceeded', {
        resetInMinutes: rateLimit.resetInMinutes
      });
    }

    // Leer body
    const body = await readBody(req);
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      return sendError(res, 400, 'invalid_json');
    }

    // Validar estructura
    if (!Array.isArray(data.messages) || data.messages.length === 0) {
      return sendError(res, 400, 'missing_messages');
    }

    // Limitar historial a últimos 10 mensajes
    const messages = data.messages.slice(-10);

    // Validar que los mensajes tengan role y content
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return sendError(res, 400, 'invalid_message_format');
      }
      if (!['user', 'assistant'].includes(msg.role)) {
        return sendError(res, 400, 'invalid_message_role');
      }
    }

    // Llamar a la API de Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ChatHandler] Anthropic API error:', response.status, errorText);

      if (response.status === 401) {
        return sendError(res, 503, 'chat_auth_error');
      }
      if (response.status === 429) {
        return sendError(res, 429, 'anthropic_rate_limit');
      }
      return sendError(res, 503, 'chat_service_error');
    }

    const result = await response.json();

    // Extraer respuesta
    const assistantMessage = result.content?.[0]?.text || 'Lo siento, no pude generar una respuesta.';

    return sendJson(res, 200, {
      ok: true,
      message: assistantMessage,
      usage: {
        input_tokens: result.usage?.input_tokens || 0,
        output_tokens: result.usage?.output_tokens || 0
      }
    });

  } catch (error) {
    console.error('[ChatHandler] Error:', error);
    return sendError(res, 500, 'internal_server_error');
  }
}

module.exports = {
  chat
};
