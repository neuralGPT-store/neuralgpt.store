/**
 * Runtime API config for environments with/without backend support.
 * Default is safe for static deploys: backendReady = false.
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

  // API base URL
  var metaApiBase = document.querySelector('meta[name="neural-api-base"]');
  var rawBase = (window.NEURAL_API_BASE || (metaApiBase && metaApiBase.getAttribute('content')) || '/api');
  var apiBase = String(rawBase).replace(/\/+$/, '');

  // Backend ready flag
  var backendReady = window.NEURAL_BACKEND_READY === true;
  var metaReady = boolFromMeta('neural-backend-ready');
  if (metaReady !== null) backendReady = metaReady;

  window.NeuralRuntime = {
    apiBase: apiBase,
    backendReady: backendReady,
    api: function (path) {
      var normalized = String(path || '');
      if (!normalized.startsWith('/')) normalized = '/' + normalized;
      return apiBase + normalized;
    }
  };
})();
