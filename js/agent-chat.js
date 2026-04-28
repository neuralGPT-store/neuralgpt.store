/**
 * Chany — Agente IA flotante para neuralgpt.store
 * Integrado con Claude API (Anthropic)
 * Detecta idioma desde i18n.js (localStorage + navigator.language)
 */
(function () {
  'use strict';

  // Historial de conversación (últimos 10 mensajes)
  let conversationHistory = [];
  const MAX_HISTORY = 10;

  // ── Detección de idioma ────────────────────────────────────────────
  function getLang() {
    try {
      const storedI18n = localStorage.getItem('neuralgpt_lang');
      if (storedI18n) return storedI18n;
    } catch (e) { /* ignore */ }

    const stored = localStorage.getItem('neural_lang');
    if (stored) return stored;

    const nav = (navigator.language || '').toLowerCase().split('-')[0];
    return nav || 'es';
  }

  // ── Textos localizados mínimos ─────────────────────────────────────
  const L10N = {
    es: {
      placeholder: 'Escribe tu pregunta…',
      sub: 'Asistente inmobiliaria IA',
      greeting: '¡Hola! Soy Chany, tu asistente inmobiliaria de neuralgpt.store. ¿En qué puedo ayudarte?',
      fallback: 'Lo siento, hubo un error. Por favor, inténtalo de nuevo.',
      suggestions: ['Publicar inmueble', 'Ver en venta', 'Ver en alquiler', 'Contacto'],
      thinking: 'Pensando...',
      rateLimit: 'Has alcanzado el límite de mensajes por hora. Inténtalo más tarde.',
    },
    en: {
      placeholder: 'Type your question…',
      sub: 'AI Real Estate Assistant',
      greeting: '🏡 Hi! I\'m Chany, neuralgpt.store\'s AI assistant. Our platform is in Spanish, but I\'ll help you in English!\n\nHow can I help you?',
      fallback: 'Sorry, there was an error. Please try again.',
      suggestions: ['Post listing', 'For sale', 'For rent', 'Contact'],
      thinking: 'Thinking...',
      rateLimit: 'You\'ve reached the message limit per hour. Please try later.',
    },
    fr: {
      placeholder: 'Tapez votre question…',
      sub: 'Assistant immobilier IA',
      greeting: '🏡 Bonjour! Je suis Chany, l\'assistant IA de neuralgpt.store. Notre plateforme est en espagnol, mais je peux vous aider en français!\n\nComment puis-je vous aider?',
      fallback: 'Désolé, il y a eu une erreur. Veuillez réessayer.',
      suggestions: ['Publier annonce', 'Ventes', 'Locations', 'Contact'],
      thinking: 'Je réfléchis...',
      rateLimit: 'Vous avez atteint la limite de messages par heure. Réessayez plus tard.',
    },
    de: {
      placeholder: 'Ihre Frage eingeben…',
      sub: 'KI-Immobilienassistent',
      greeting: '👋 Hallo! Ich bin Chany, der KI-Assistent von neuralgpt.store. Unsere Plattform ist auf Spanisch, aber ich kann Ihnen auf Deutsch helfen!\n\nWie kann ich helfen?',
      fallback: 'Entschuldigung, es gab einen Fehler. Bitte versuchen Sie es erneut.',
      suggestions: ['Anzeige aufgeben', 'Kaufen', 'Mieten', 'Kontakt'],
      thinking: 'Ich denke nach...',
      rateLimit: 'Sie haben das Nachrichtenlimit pro Stunde erreicht. Bitte später erneut versuchen.',
    },
  };

  function t(key) {
    const lang = getLang();
    const map = L10N[lang] || L10N['es'];
    return map[key] !== undefined ? map[key] : (L10N['es'][key] || '');
  }

  // ── Insertar widget HTML ───────────────────────────────────────────
  function injectWidget() {
    if (document.getElementById('neural-chat')) return;

    const ghostSVG = (size) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <defs>
        <radialGradient id="house-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(0,234,255,0.2)"/>
          <stop offset="100%" stop-color="rgba(127,0,255,0.05)"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill="url(#house-glow)"/>
      <polygon points="50,20 15,50 85,50" fill="currentColor" opacity="0.9"/>
      <polygon points="50,20 15,50 85,50" fill="#00eaff" opacity="0.3"/>
      <rect x="20" y="48" width="60" height="40" fill="currentColor" opacity="0.8"/>
      <rect x="20" y="48" width="60" height="40" fill="#e8f4ff" opacity="0.5"/>
      <rect x="30" y="56" width="16" height="16" rx="2" fill="#00eaff" opacity="0.7"/>
      <line x1="38" y1="56" x2="38" y2="72" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
      <line x1="30" y1="64" x2="46" y2="64" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
      <rect x="54" y="60" width="16" height="28" rx="1" fill="#7f00ff" opacity="0.6"/>
      <circle cx="65" cy="74" r="1.5" fill="#00eaff"/>
      <g transform="translate(75,30) scale(1.2)">
        <polygon points="0,-4 1,-1 4,0 1,1 0,4 -1,1 -4,0 -1,-1" fill="#00ff99" opacity="0.9"/>
        <polygon points="0,-4 1,-1 4,0 1,1 0,4 -1,1 -4,0 -1,-1" fill="#fff" opacity="0.4"/>
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
            <div class="chat-header-sub" id="chat-header-sub">Asistente IA</div>
          </div>
          <button class="chat-close" id="chat-close-btn" aria-label="Cerrar chat" title="Cerrar">✕</button>
        </div>
        <div class="chat-messages" id="chat-messages" aria-live="polite" aria-atomic="false"></div>
        <div class="chat-suggestions" id="chat-suggestions"></div>
        <div class="chat-input-row">
          <input class="chat-input" id="chat-input" type="text" placeholder="Escribe tu pregunta…" autocomplete="off" maxlength="300" aria-label="Escribe tu mensaje" />
          <button class="chat-send" id="chat-send-btn" aria-label="Enviar">➤</button>
        </div>
      </div>
    </div>`;

    const el = document.createElement('div');
    el.innerHTML = html;
    document.body.appendChild(el.firstElementChild);

    const input = document.getElementById('chat-input');
    if (input) input.placeholder = t('placeholder');

    const sub = document.getElementById('chat-header-sub');
    if (sub) sub.textContent = t('sub');

    bindEvents();
    showGreeting();
  }

  // ── Mensaje de bienvenida ──────────────────────────────────────────
  function showGreeting() {
    addBotMsg(t('greeting'));
    renderSuggestions(t('suggestions'));
  }

  // ── Eventos ────────────────────────────────────────────────────────
  function bindEvents() {
    const toggleBtn = document.getElementById('chat-toggle-btn');
    const closeBtn = document.getElementById('chat-close-btn');
    const sendBtn = document.getElementById('chat-send-btn');
    const input = document.getElementById('chat-input');
    const panel = document.getElementById('chat-panel');

    toggleBtn.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      toggleBtn.setAttribute('aria-expanded', open);
      if (open) {
        input.focus();
      }
    });

    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.focus();
    });

    sendBtn.addEventListener('click', sendMessage);

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
      if (e.key === 'Escape') {
        panel.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.focus();
      }
    });
  }

  function sendMessage() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const text = (input.value || '').trim();

    if (!text || sendBtn.disabled) return;

    addUserMsg(text);
    input.value = '';

    // Deshabilitar input mientras se procesa
    sendBtn.disabled = true;
    input.disabled = true;

    // Mostrar "pensando..."
    const thinkingId = addBotMsg(t('thinking'));

    // Llamar a la API
    respondToWithAPI(text, thinkingId).finally(() => {
      sendBtn.disabled = false;
      input.disabled = false;
      input.focus();
    });
  }

  // ── Responder con Claude API ───────────────────────────────────────
  async function respondToWithAPI(userMessage, thinkingId) {
    try {
      // Añadir mensaje del usuario al historial
      conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Limitar historial a MAX_HISTORY mensajes
      if (conversationHistory.length > MAX_HISTORY) {
        conversationHistory = conversationHistory.slice(-MAX_HISTORY);
      }

      // Llamar al endpoint /api/chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: conversationHistory
        })
      });

      // Eliminar mensaje "pensando..."
      removeBotMsg(thinkingId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 429) {
          const resetMin = errorData.resetInMinutes || '?';
          addBotMsg(`${t('rateLimit')} Espera ${resetMin} minutos.`);
          return;
        }

        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.message || t('fallback');

      // Añadir respuesta del asistente al historial
      conversationHistory.push({
        role: 'assistant',
        content: assistantMessage
      });

      // Mostrar respuesta
      addBotMsg(assistantMessage);

    } catch (error) {
      console.error('[Chany] Error:', error);
      removeBotMsg(thinkingId);
      addBotMsg(t('fallback'));
    }
  }

  // ── DOM helpers ────────────────────────────────────────────────────
  let msgIdCounter = 0;

  function addBotMsg(text) {
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return null;

    const id = `bot-msg-${msgIdCounter++}`;
    const el = document.createElement('div');
    el.className = 'chat-msg bot';
    el.id = id;
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;

    return id;
  }

  function removeBotMsg(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function addUserMsg(text) {
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return;

    const el = document.createElement('div');
    el.className = 'chat-msg user';
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;

    // Limpiar sugerencias
    const sugg = document.getElementById('chat-suggestions');
    if (sugg) sugg.innerHTML = '';
  }

  function renderSuggestions(list) {
    if (!Array.isArray(list)) return;

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
        if (input) {
          input.value = label;
          sendMessage();
        }
      });
      wrap.appendChild(btn);
    });
  }

  // ── Init ───────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectWidget);
  } else {
    injectWidget();
  }
})();
