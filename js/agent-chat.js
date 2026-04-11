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

    const html = `
<div class="ai-chat" id="neural-chat" role="complementary" aria-label="Asistente IA">
  <button class="chat-toggle" id="chat-toggle-btn" aria-label="Abrir asistente IA" aria-expanded="false" title="Chany — Asistente IA">
    🤖
  </button>
  <div class="chat-panel" id="chat-panel" role="dialog" aria-label="Chat con Chany" aria-modal="true">
    <div class="chat-header">
      <div>
        <div class="chat-header-title">🤖 CHANY</div>
        <div style="font-size:0.65rem;color:var(--muted);font-family:var(--font-body)">Asistente de neuralgpt.store</div>
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
