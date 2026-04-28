/**
 * Runtime API config for environments with/without backend support.
 * Default is safe for static deploys: backendReady = false.
 *
 * API Authentication:
 * Set window.NEURAL_API_KEY or <meta name="neural-api-key" content="your-key">
 */
(function () {
  'use strict';

  function boolFromMeta(name) {
    var meta = document.querySelector('meta[name="' + name + '"]');
    if (!meta) return null;
    var value = String(meta.getAttribute('content') || '').trim().toLowerCase();
    if (value === 'true' || value === '1' || value === 'yes') return true;
    if (value === 'false' || value === '0' || value === 'no') return false;
    return null;
  }

  function textFromMeta(name) {
    var meta = document.querySelector('meta[name="' + name + '"]');
    if (!meta) return null;
    return String(meta.getAttribute('content') || '').trim() || null;
  }

  // API base URL
  var metaApiBase = document.querySelector('meta[name="neural-api-base"]');
  var rawBase = (window.NEURAL_API_BASE || (metaApiBase && metaApiBase.getAttribute('content')) || '/api');
  var apiBase = String(rawBase).replace(/\/+$/, '');

  // Backend ready flag
  var backendReady = window.NEURAL_BACKEND_READY === true;
  var metaReady = boolFromMeta('neural-backend-ready');
  if (metaReady !== null) backendReady = metaReady;

  // API Secret Key
  var apiKey = window.NEURAL_API_KEY || textFromMeta('neural-api-key') || '';

  /**
   * Enhanced fetch wrapper que añade automáticamente el header X-API-Key
   * para todas las llamadas a endpoints /api/*
   */
  function apiRequest(path, options) {
    var normalized = String(path || '');
    if (!normalized.startsWith('/')) normalized = '/' + normalized;
    var url = apiBase + normalized;

    // Preparar opciones de fetch
    var fetchOptions = options || {};
    var headers = fetchOptions.headers || {};

    // Añadir X-API-Key si está configurada y la URL es a /api/*
    if (apiKey && url.includes('/api/')) {
      // No añadir la key al webhook de Stripe (es público)
      if (!url.includes('/api/stripe/webhook') && !url.includes('/api/health')) {
        headers['X-API-Key'] = apiKey;
      }
    }

    fetchOptions.headers = headers;

    return fetch(url, fetchOptions);
  }

  window.NeuralRuntime = {
    apiBase: apiBase,
    backendReady: backendReady,
    apiKey: apiKey, // Expuesto para debugging, no debe ser usado directamente

    /**
     * Helper para construir URL de API
     * @deprecated Usar apiRequest() en su lugar
     */
    api: function (path) {
      var normalized = String(path || '');
      if (!normalized.startsWith('/')) normalized = '/' + normalized;
      return apiBase + normalized;
    },

    /**
     * Realizar request a API con autenticación automática
     * @param {string} path - Path del endpoint (ej: '/listings/upsert')
     * @param {object} options - Opciones de fetch (method, body, headers, etc)
     * @returns {Promise<Response>}
     */
    apiRequest: apiRequest
  };

  // Polyfill de fetch para añadir automáticamente X-API-Key a todas las llamadas /api/*
  if (apiKey && typeof window.fetch === 'function') {
    var originalFetch = window.fetch;

    window.fetch = function (url, options) {
      var opts = options || {};
      var urlStr = String(url || '');

      // Si la URL es relativa y empieza con /api/, o contiene /api/ en el path
      var isApiCall = urlStr.startsWith('/api/') ||
                      urlStr.includes('/api/') ||
                      (urlStr.startsWith(apiBase) && urlStr.includes('/api/'));

      // Excepciones: health y webhook
      var isException = urlStr.includes('/api/health') || urlStr.includes('/api/stripe/webhook');

      if (isApiCall && !isException) {
        var headers = opts.headers || {};

        // Soportar Headers object y plain object
        if (headers instanceof Headers) {
          if (!headers.has('X-API-Key')) {
            headers.set('X-API-Key', apiKey);
          }
        } else {
          if (!headers['X-API-Key'] && !headers['x-api-key']) {
            headers['X-API-Key'] = apiKey;
          }
        }

        opts.headers = headers;
      }

      return originalFetch.call(this, url, opts);
    };
  }

  // Log de configuración en modo desarrollo
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('[NeuralRuntime] Configuration:', {
      apiBase: apiBase,
      backendReady: backendReady,
      apiKeyConfigured: !!apiKey,
      fetchPatched: !!apiKey
    });
  }
})();
