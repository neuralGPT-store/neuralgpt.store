/**
 * Chany — Agente IA flotante para neuralgpt.store
 * Sin API externa. Lee /data/agent-kb.json y usa keyword matching.
 * Detecta idioma desde window.NeuralI18n (i18n-global.js).
 */
(function () {
  'use strict';

  const KB_URL = '/data/agent-kb.json';
  let kb = null;

  // ── Detección de idioma ─────────────────────────────────────────────
  function getLang() {
    try {
      if (window.NeuralI18n && typeof window.NeuralI18n.detectLang === 'function') {
        return window.NeuralI18n.detectLang();
      }
    } catch (e) { /* ignore */ }
    const stored = localStorage.getItem('neural_lang');
    if (stored) return stored;
    const nav = (navigator.language || '').toLowerCase().split('-')[0];
    return nav || 'es';
  }

  // ── Textos localizados mínimos ──────────────────────────────────────
  const L10N = {
    es: {
      placeholder: 'Escribe tu pregunta…',
      sub: 'Asistente de neuralgpt.store',
      greeting_prefix: null, // usa KB greeting
      fallback: 'No encontré una respuesta exacta. Escríbenos a support@neuralgpt.store',
      suggestions: ['¿Qué productos tenéis?', '¿Cómo compro?', 'Quiero vender', '¿Cuánto cuesta?'],
    },
    en: {
      placeholder: 'Type your question…',
      sub: 'neuralgpt.store assistant',
      greeting_prefix: '👋 Hi! I\'m Chany, neuralgpt.store\'s AI assistant. Our platform is in Spanish, but I\'ll help you in English!\n\n🛒 Products: GhostWriter €29 · NeuralBill €19 · PokerBot €39 (lifetime license)\n💼 Sell your software: 20% commission, no monthly fee\n\nHow can I help you?',
      fallback: 'I couldn\'t find an exact answer. Email us at support@neuralgpt.store',
      suggestions: ['Our products', 'How to buy', 'Sell my software', 'Pricing'],
    },
    fr: {
      placeholder: 'Tapez votre question…',
      sub: 'Assistant neuralgpt.store',
      greeting_prefix: '👋 Bonjour! Je suis Chany, l\'assistant IA de neuralgpt.store. Notre plateforme est en espagnol, mais je vais vous aider en français!\n\n🛒 Produits: GhostWriter 29€ · NeuralBill 19€ · PokerBot 39€ (licence à vie)\n💼 Vendre votre logiciel: commission 20%, sans abonnement mensuel\n\nComment puis-je vous aider?',
      fallback: 'Pas de réponse exacte. Écrivez-nous à support@neuralgpt.store',
      suggestions: ['Nos produits', 'Comment acheter', 'Vendre mon logiciel', 'Tarifs'],
    },
    de: {
      placeholder: 'Ihre Frage eingeben…',
      sub: 'neuralgpt.store Assistent',
      greeting_prefix: '👋 Hallo! Ich bin Chany, der KI-Assistent von neuralgpt.store. Unsere Plattform ist auf Spanisch, aber ich helfe Ihnen auf Deutsch!\n\n🛒 Produkte: GhostWriter 29€ · NeuralBill 19€ · PokerBot 39€ (lebenslange Lizenz)\n💼 Software verkaufen: 20% Provision, keine monatliche Gebühr\n\nWie kann ich helfen?',
      fallback: 'Keine genaue Antwort gefunden. Schreiben Sie an support@neuralgpt.store',
      suggestions: ['Unsere Produkte', 'Wie kaufen', 'Software verkaufen', 'Preise'],
    },
  };

  function t(key) {
    const lang = getLang();
    const map = L10N[lang] || L10N['es'];
    return map[key] !== undefined ? map[key] : (L10N['es'][key] || '');
  }

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
        <div class="chat-header-sub" id="chat-header-sub">Asistente de neuralgpt.store</div>
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

    // Adapt placeholder and sub-title to detected lang
    const input = document.getElementById('chat-input');
    if (input) input.placeholder = t('placeholder');
    const sub = document.getElementById('chat-header-sub');
    if (sub) sub.textContent = t('sub');

    bindEvents();
    loadKB();
  }

  // ── Cargar base de conocimiento ─────────────────────────────────────
  function loadKB() {
    fetch(KB_URL)
      .then(r => r.json())
      .then(data => {
        kb = data;
        // Greeting: use lang-specific override for non-ES, else use KB greeting
        const langGreeting = t('greeting_prefix');
        addBotMsg(langGreeting !== null ? langGreeting : data.greeting);
        renderSuggestions(t('suggestions'));
      })
      .catch(() => {
        kb = { fallback: t('fallback'), intents: [] };
        addBotMsg(t('greeting_prefix') || '¡Hola! Soy Chany. ¿En qué puedo ayudarte?');
        renderSuggestions(t('suggestions'));
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

    const reply = bestMatch ? bestMatch.response : (t('fallback') || kb.fallback);
    addBotMsg(reply);

    // Sugerencias contextuales post-respuesta
    const suggestions = getSuggestions(bestMatch ? bestMatch.id : null);
    if (suggestions.length) renderSuggestions(suggestions);
  }

  function getSuggestions(intentId) {
    const map = {
      'greeting':              ['Ver productos', '¿Cómo compro?', 'Quiero vender'],
      'ghostwriter':           ['Comprar GhostWriter', 'Ver NeuralBill', 'Ver PokerBot'],
      'neuralbill':            ['Comprar NeuralBill', 'Ver GhostWriter', '¿Hay más productos?'],
      'pokerbot':              ['Comprar PokerBot', '¿Es legal usar PokerBot?', 'Ver GhostWriter'],
      'prices':                ['Ver marketplace', '¿Cómo pago?', 'Quiero vender'],
      'commission':            ['Registrarme como vendedor', '¿Cómo funciona el pago?', 'Ver comisiones'],
      'sell':                  ['Ir a registro de vendedor', '¿Qué software puedo vender?', 'Categorías legales'],
      'sell_my_app':           ['Ir a registro de vendedor', 'Proceso de verificación', 'Categorías legales'],
      'hosting_model':         ['Registro de vendedor', 'Proceso de verificación', 'Comisiones'],
      'security':              ['Ver política de seguridad', 'Badge verificado', 'Es seguro comprar'],
      'safe_to_buy':           ['Ver marketplace', '¿Cómo compro?', 'Proceso de verificación'],
      'payment':               ['Ver marketplace', '¿Cómo descargo?', 'Política de devoluciones'],
      'download_after_payment':['Ir al marketplace', 'Política de devoluciones', 'Soporte'],
      'secure_delivery':       ['Ver marketplace', '¿Cómo pago?', 'Soporte'],
      'platforms':             ['Software para Linux', 'Software para Windows', 'Software Android'],
      'contact':               ['Ver marketplace', 'Registrarme como vendedor', 'Política de seguridad'],
      'about':                 ['Ver marketplace', 'Quiero vender', '¿Qué productos hay?'],
      'what_is_neuralgpt':     ['Ver marketplace', 'Quiero vender', 'Precios y comisiones'],
      'categories':            ['IA y automatización', 'Seguridad y pentesting', 'Ver marketplace'],
      'all_products':          ['Comprar GhostWriter', 'Comprar NeuralBill', 'Ver marketplace'],
      'refund':                ['Ver términos', 'Contactar soporte', 'Ver marketplace'],
      'technical_support':     ['Contactar soporte', 'Política de devoluciones', 'Ver marketplace'],
      'verification':          ['Badge verificado', '¿Es seguro comprar?', 'Quiero vender'],
      'verification_process':  ['Registrarme como vendedor', 'Categorías legales', 'Soporte'],
      'verification_failure':  ['Contactar soporte', 'Ver guía de verificación', 'Registro vendedor'],
      'legal_categories':      ['Registrarme como vendedor', 'Proceso de verificación', 'Comisiones'],
    };
    return (map[intentId] || ['Ir al marketplace', 'Ver precios', 'Contactar']).slice(0, 3);
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
