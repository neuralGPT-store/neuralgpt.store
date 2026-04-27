/**
 * Contador de visitas con Cloudflare Analytics API y fallback localStorage
 * Solo visible en index.html
 */
(function() {
  'use strict';

  // Solo ejecutar en index.html
  if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
    return;
  }

  const CF_ACCOUNT_ID = '77ab99073dae83f56c96d85e6c23ed6e';
  const CF_API_TOKEN = null; // No disponible en cliente, fallback directo a localStorage

  // Crear widget
  const widget = document.createElement('div');
  widget.id = 'traffic-counter';
  widget.className = 'traffic-counter';
  widget.innerHTML = '<span class="traffic-counter-icon">👁</span> <span class="traffic-counter-value">...</span>';
  document.body.appendChild(widget);

  // Intentar Cloudflare Analytics (requeriría backend proxy)
  // Como no tenemos API token en el cliente, usamos fallback localStorage directamente
  initLocalStorageCounter();

  function initLocalStorageCounter() {
    const STORAGE_KEY = 'neuralgpt_visits';
    const SESSION_KEY = 'neuralgpt_session_counted';

    let data = loadVisits();

    // Marcar visita única por sesión
    if (!sessionStorage.getItem(SESSION_KEY)) {
      data.count++;
      data.lastVisit = Date.now();
      saveVisits(data);
      sessionStorage.setItem(SESSION_KEY, 'true');
    }

    // Limpiar visitas > 24h
    cleanOldVisits(data);

    // Mostrar contador
    updateDisplay(data.count);

    // Actualizar cada 30 segundos para limpiar visitas antiguas
    setInterval(() => {
      const current = loadVisits();
      cleanOldVisits(current);
      updateDisplay(current.count);
    }, 30000);
  }

  function loadVisits() {
    try {
      const stored = localStorage.getItem('neuralgpt_visits');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[TrafficCounter] Error loading visits:', e);
    }
    return { count: 0, visits: [], lastVisit: Date.now() };
  }

  function saveVisits(data) {
    try {
      localStorage.setItem('neuralgpt_visits', JSON.stringify(data));
    } catch (e) {
      console.warn('[TrafficCounter] Error saving visits:', e);
    }
  }

  function cleanOldVisits(data) {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    // Registrar visitas con timestamp
    if (!Array.isArray(data.visits)) {
      data.visits = [];
    }

    // Añadir visita actual si no existe
    if (!data.visits.some(v => v.timestamp > now - 1000)) {
      data.visits.push({ timestamp: now });
    }

    // Filtrar solo las últimas 24h
    data.visits = data.visits.filter(v => (now - v.timestamp) < DAY_MS);
    data.count = data.visits.length;

    saveVisits(data);
    return data.count;
  }

  function updateDisplay(count) {
    const valueEl = document.querySelector('.traffic-counter-value');
    if (valueEl) {
      const text = count === 1 ? 'visita hoy' : 'visitas hoy';
      valueEl.textContent = `${count} ${text}`;
    }
  }

  // Si en el futuro se implementa backend proxy para Cloudflare Analytics:
  // async function fetchCloudflareAnalytics() {
  //   try {
  //     const response = await fetch('/api/analytics/visits-24h');
  //     if (response.ok) {
  //       const data = await response.json();
  //       return data.visits || 0;
  //     }
  //   } catch (e) {
  //     console.warn('[TrafficCounter] CF Analytics not available:', e);
  //   }
  //   return null;
  // }
})();
