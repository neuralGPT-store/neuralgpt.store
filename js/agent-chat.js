/**
 * Chany — Agente IA flotante para neuralgpt.store
 * Sin API externa. Lee /data/agent-kb.json y usa keyword matching.
 */
(function () {
  'use strict';

  const KB_URL = '/data/agent-kb.json';
  let kb = null;

  // ── Insertar widget HTML ────────────────────────────────────────────
  function injectWidget() {
    if (document.getElementById('neural-chat')) return;

    /* Fantasmita SVG reutilizable */
    const ghostSVG = (size) => `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <!-- Cuerpo del fantasma -->
  <defs>
    <radialGradient id="ghost-body" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#e8f4ff"/>
      <stop offset="100%" stop-color="#b0d0f0"/>
    </radialGradient>
    <radialGradient id="ghost-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(0,234,255,0.25)"/>
      <stop offset="100%" stop-color="rgba(127,0,255,0.05)"/>
    </radialGradient>
  </defs>
  <!-- Aura RGB -->
  <ellipse cx="28" cy="30" rx="24" ry="22" fill="url(#ghost-glow)"/>
  <!-- Cuerpo -->
  <path d="M6 34 C6 18 12 6 28 6 C44 6 50 18 50 34 L50 50 L44 45 L38 50 L32 45 L26 50 L20 45 L14 50 L8 45 Z" fill="url(#ghost-body)" opacity="0.95"/>
  <!-- Ojos (grandes, expresivos) -->
  <g class="chany-eye">
    <ellipse cx="20" cy="28" rx="5.5" ry="6" fill="#0a0020"/>
    <ellipse cx="21.5" cy="26.5" rx="1.8" ry="1.8" fill="white" opacity="0.9"/>
    <ellipse cx="20" cy="28" rx="2.5" ry="2.8" fill="#7f00ff"/>
    <ellipse cx="19" cy="27" rx="1" ry="1" fill="white" opacity="0.7"/>
  </g>
  <g class="chany-eye chany-eye-r">
    <ellipse cx="36" cy="28" rx="5.5" ry="6" fill="#0a0020"/>
    <ellipse cx="37.5" cy="26.5" rx="1.8" ry="1.8" fill="white" opacity="0.9"/>
    <ellipse cx="36" cy="28" rx="2.5" ry="2.8" fill="#00eaff"/>
    <ellipse cx="35" cy="27" rx="1" ry="1" fill="white" opacity="0.7"/>
  </g>
  <!-- Lápiz dorado -->
  <g class="chany-pencil" transform="translate(34,14) rotate(35,8,8)">
    <rect x="4" y="0" width="6" height="20" rx="1" fill="#ffd700"/>
    <polygon points="4,20 10,20 7,26" fill="#ffaa00"/>
    <polygon points="5,24 9,24 7,27" fill="#333"/>
    <rect x="4" y="0" width="6" height="4" rx="1" fill="#ff6b9d"/>
  </g>
</svg>`;

    const html = `
<div class="ai-chat" id="neural-chat" role="complementary" aria-label="Asistente IA">
  <div class="chat-toggle-wrap">
    <button class="chat-toggle" id="chat-toggle-btn" aria-label="Abrir asistente IA" aria-expanded="false">
      ${ghostSVG(56)}
    </button>
    <div class="chat-toggle-tooltip">CHANY — Asistente IA</div>
  </div>
  <div class="chat-panel" id="chat-panel" role="dialog" aria-label="Chat con Chany" aria-modal="true">
    <div class="chat-header">
      <div class="chat-header-avatar">${ghostSVG(36)}</div>
      <div class="chat-header-info">
        <div class="chat-header-title">CHANY</div>
        <div class="chat-header-sub">Asistente de neuralgpt.store</div>
      </div>
      <button class="chat-close" id="chat-close-btn" aria-label="Cerrar chat" title="Cerrar">✕</button>
    </div>
    <div class="chat-messages" id="chat-messages" aria-live="polite" aria-atomic="false"></div>
    <div class="chat-suggestions" id="chat-suggestions"></div>
    <div class="chat-input-row">
      <input class="chat-input" id="chat-input" type="text" placeholder="Escribe tu pregunta…" autocomplete="off" maxlength="200" aria-label="Escribe tu mensaje" />
      <button class="chat-send" id="chat-send-btn" aria-label="Enviar">➤</button>
    </div>
  </div>
</div>`;

    const el = document.createElement('div');
    el.innerHTML = html;
    document.body.appendChild(el.firstElementChild);

    bindEvents();
    loadKB();
  }

  // ── Cargar base de conocimiento ─────────────────────────────────────
  function loadKB() {
    fetch(KB_URL)
      .then(r => r.json())
      .then(data => {
        kb = data;
        addBotMsg(data.greeting);
        renderSuggestions(['¿Qué productos tenéis?', '¿Cómo compro?', 'Quiero vender', '¿Cuánto cuesta?']);
      })
      .catch(() => {
        // Fallback inline si fetch falla
        kb = { fallback: 'Escríbenos a support@neuralgpt.store', intents: [] };
        addBotMsg('¡Hola! Soy Chany. ¿En qué puedo ayudarte?');
        renderSuggestions(['Productos', 'Precios', 'Vender']);
      });
  }

  // ── Eventos ─────────────────────────────────────────────────────────
  function bindEvents() {
    const toggleBtn = document.getElementById('chat-toggle-btn');
    const closeBtn  = document.getElementById('chat-close-btn');
    const sendBtn   = document.getElementById('chat-send-btn');
    const input     = document.getElementById('chat-input');
    const panel     = document.getElementById('chat-panel');

    toggleBtn.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      toggleBtn.setAttribute('aria-expanded', open);
      if (open) { input.focus(); }
    });

    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.focus();
    });

    sendBtn.addEventListener('click', sendMessage);

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') sendMessage();
      if (e.key === 'Escape') {
        panel.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.focus();
      }
    });
  }

  function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = (input.value || '').trim();
    if (!text) return;
    addUserMsg(text);
    input.value = '';
    setTimeout(() => respondTo(text), 350);
  }

  // ── Responder ────────────────────────────────────────────────────────
  function respondTo(text) {
    if (!kb) { addBotMsg('Cargando…'); return; }

    const q = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let bestMatch = null;
    let bestScore = 0;

    for (const intent of kb.intents) {
      let score = 0;
      for (const kw of intent.keywords) {
        const k = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (q.includes(k)) score += k.length;
      }
      if (score > bestScore) { bestScore = score; bestMatch = intent; }
    }

    const reply = bestMatch ? bestMatch.response : kb.fallback;
    addBotMsg(reply);

    // Sugerencias contextuales post-respuesta
    const suggestions = getSuggestions(bestMatch ? bestMatch.id : null);
    if (suggestions.length) renderSuggestions(suggestions);
  }

  function getSuggestions(intentId) {
    const map = {
      'greeting':     ['Ver productos', '¿Cómo funciona Stripe?', 'Quiero vender'],
      'ghostwriter':  ['Ver GhostWriter', 'Precio de GhostWriter', 'Otras herramientas IA'],
      'neuralbill':   ['Probar NeuralBill', 'Integración Stripe', 'Precio NeuralBill'],
      'pokerbot':     ['Ver PokerBot', '¿Es legal?', 'Otros bots'],
      'prices':       ['Ver marketplace', 'Plan mensual', 'Comparar planes'],
      'commission':   ['Registrarme como vendedor', '¿Cómo funciona el pago?', 'Contactar'],
      'sell':         ['Ir a registro de vendedor', '¿Qué software puedo vender?', 'Comisiones'],
      'security':     ['Ver política de seguridad', 'Badge verificado', 'Preguntar por un producto'],
      'payment':      ['Ver marketplace', 'Preguntas sobre descarga', 'Política de devoluciones'],
      'platforms':    ['Software para Linux', 'Software para Windows', 'Software Android'],
      'download':     ['Ir al marketplace', 'Política de devoluciones', 'Soporte'],
      'contact':      ['Enviar email', 'Ver marketplace', 'Registrarme como vendedor'],
      'categories':   ['Automatización', 'Seguridad', 'Inteligencia Artificial'],
      'refund':       ['Ver términos', 'Contactar soporte', 'Ver marketplace'],
    };
    return (map[intentId] || ['Ir al marketplace', '¿Tienes más preguntas?', 'Contactar']).slice(0, 3);
  }

  // ── DOM helpers ──────────────────────────────────────────────────────
  function addBotMsg(text) {
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return;
    const el = document.createElement('div');
    el.className = 'chat-msg bot';
    el.textContent = text; // textContent es seguro (no XSS)
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function addUserMsg(text) {
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return;
    const el = document.createElement('div');
    el.className = 'chat-msg user';
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    // Limpiar sugerencias mientras escribe
    const sugg = document.getElementById('chat-suggestions');
    if (sugg) sugg.innerHTML = '';
  }

  function renderSuggestions(list) {
    const wrap = document.getElementById('chat-suggestions');
    if (!wrap) return;
    wrap.innerHTML = '';
    list.forEach(label => {
      const btn = document.createElement('button');
      btn.className = 'chat-suggestion-btn';
      btn.textContent = label;
      btn.setAttribute('type', 'button');
      btn.addEventListener('click', () => {
        const input = document.getElementById('chat-input');
        if (input) { input.value = label; }
        addUserMsg(label);
        const sugg = document.getElementById('chat-suggestions');
        if (sugg) sugg.innerHTML = '';
        setTimeout(() => respondTo(label), 350);
      });
      wrap.appendChild(btn);
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectWidget);
  } else {
    injectWidget();
  }
})();
