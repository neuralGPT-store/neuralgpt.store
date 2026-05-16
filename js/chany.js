(function () {
  'use strict';

  var STORAGE_KEY = 'chany_history';
  var MAX_HISTORY = 10;
  var isOpen = false;
  var isTyping = false;

  // ── Inject HTML ──────────────────────────────────────────────────────────────
  var container = document.createElement('div');
  container.id = 'chany-widget';
  container.innerHTML =
    '<button id="chany-toggle" aria-label="Abrir asistente Chany" title="Habla con Chany">' +
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' +
      '<span class="chany-badge" id="chany-badge" style="display:none">1</span>' +
    '</button>' +
    '<div id="chany-panel" role="dialog" aria-label="Asistente Chany" aria-modal="true" style="display:none">' +
      '<div id="chany-header">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<div id="chany-avatar">C</div>' +
          '<div><div id="chany-name">Chany</div><div id="chany-status">Asistente de Loventy</div></div>' +
        '</div>' +
        '<button id="chany-close" aria-label="Cerrar">&times;</button>' +
      '</div>' +
      '<div id="chany-messages" role="log" aria-live="polite"></div>' +
      '<div id="chany-input-area">' +
        '<input type="text" id="chany-input" placeholder="Escribe tu pregunta..." aria-label="Mensaje para Chany" maxlength="500" autocomplete="off"/>' +
        '<button id="chany-send" aria-label="Enviar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>' +
      '</div>' +
      '<div id="chany-disclaimer">Chany es una guía informativa. Para decisiones médicas o legales consulte un profesional.</div>' +
    '</div>';
  document.body.appendChild(container);

  // ── Styles ───────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent =
    '#chany-widget{position:fixed;bottom:24px;right:24px;z-index:9999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
    '#chany-toggle{width:56px;height:56px;border-radius:50%;background:#003399;border:none;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 0 rgba(0,51,153,0.4),0 4px 16px rgba(0,0,0,0.4);transition:transform 0.2s,box-shadow 0.2s;position:relative}' +
    '#chany-toggle:hover{transform:scale(1.08);box-shadow:0 0 0 8px rgba(0,51,153,0.15),0 4px 20px rgba(0,0,0,0.5)}' +
    '.chany-badge{position:absolute;top:2px;right:2px;width:14px;height:14px;background:#e63946;border-radius:50%;font-size:9px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;border:2px solid #0d1225}' +
    '#chany-panel{position:fixed;bottom:88px;right:24px;width:360px;height:480px;background:#0d1225;border:1px solid rgba(255,255,255,0.1);border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.6)}' +
    '#chany-header{background:#003399;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}' +
    '#chany-avatar{width:36px;height:36px;border-radius:50%;background:#c9a84c;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#0d1225;flex-shrink:0}' +
    '#chany-name{font-weight:700;font-size:15px;color:#fff}' +
    '#chany-status{font-size:11px;color:rgba(255,255,255,0.7)}' +
    '#chany-close{background:none;border:none;color:rgba(255,255,255,0.7);font-size:24px;cursor:pointer;line-height:1;padding:0 4px}' +
    '#chany-close:hover{color:#fff}' +
    '#chany-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;scroll-behavior:smooth}' +
    '#chany-messages::-webkit-scrollbar{width:4px}' +
    '#chany-messages::-webkit-scrollbar-track{background:transparent}' +
    '#chany-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:2px}' +
    '.chany-msg{max-width:82%;padding:10px 13px;font-size:14px;line-height:1.5;word-break:break-word}' +
    '.chany-msg.user{background:#003399;color:#f5f0e8;align-self:flex-end;border-radius:12px 12px 4px 12px}' +
    '.chany-msg.bot{background:#1a2236;color:#f5f0e8;align-self:flex-start;border-radius:12px 12px 12px 4px}' +
    '.chany-msg.error{background:#3d1a1a;color:#ffaaaa;align-self:flex-start;border-radius:12px 12px 12px 4px}' +
    '.chany-typing{display:flex;gap:4px;align-items:center;padding:10px 13px;background:#1a2236;border-radius:12px 12px 12px 4px;align-self:flex-start}' +
    '.chany-typing span{width:6px;height:6px;background:rgba(255,255,255,0.4);border-radius:50%;animation:chany-bounce 1.2s infinite}' +
    '.chany-typing span:nth-child(2){animation-delay:0.2s}.chany-typing span:nth-child(3){animation-delay:0.4s}' +
    '@keyframes chany-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}' +
    '#chany-input-area{display:flex;gap:8px;padding:10px 12px;border-top:1px solid rgba(255,255,255,0.08);flex-shrink:0}' +
    '#chany-input{flex:1;background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f5f0e8;font-size:14px;outline:none}' +
    '#chany-input::placeholder{color:rgba(255,255,255,0.35)}' +
    '#chany-input:focus{border-color:rgba(0,51,153,0.6)}' +
    '#chany-send{width:38px;height:38px;border-radius:8px;background:#003399;border:none;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
    '#chany-send:hover{background:#0044cc}' +
    '#chany-send:disabled{opacity:0.4;cursor:not-allowed}' +
    '#chany-disclaimer{font-size:10px;color:rgba(255,255,255,0.3);text-align:center;padding:6px 12px 8px;flex-shrink:0;line-height:1.4}' +
    '@media(max-width:420px){#chany-panel{width:100vw;right:0;bottom:0;border-radius:16px 16px 0 0;height:70vh}#chany-widget{bottom:16px;right:16px}}';
  document.head.appendChild(style);

  // ── Elements ─────────────────────────────────────────────────────────────────
  var toggle  = document.getElementById('chany-toggle');
  var panel   = document.getElementById('chany-panel');
  var closeBtn= document.getElementById('chany-close');
  var messages= document.getElementById('chany-messages');
  var input   = document.getElementById('chany-input');
  var send    = document.getElementById('chany-send');
  var badge   = document.getElementById('chany-badge');

  // ── History ──────────────────────────────────────────────────────────────────
  function loadHistory() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  }
  function saveHistory(h) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(-MAX_HISTORY * 2))); } catch {}
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  function addBubble(text, role) {
    var div = document.createElement('div');
    div.className = 'chany-msg ' + role;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'chany-typing';
    el.id = 'chany-typing-indicator';
    el.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('chany-typing-indicator');
    if (el) el.remove();
  }

  function restoreMessages(history) {
    history.forEach(function(m) {
      addBubble(m.content, m.role === 'user' ? 'user' : 'bot');
    });
  }

  // ── Open / Close ─────────────────────────────────────────────────────────────
  var welcomed = false;

  function openPanel() {
    isOpen = true;
    panel.style.display = 'flex';
    badge.style.display = 'none';
    toggle.setAttribute('aria-expanded', 'true');

    var history = loadHistory();
    if (!welcomed) {
      welcomed = true;
      if (history.length > 0) {
        restoreMessages(history);
      } else {
        addBubble('¡Hola! Soy Chany, tu asistente en Loventy. Puedo ayudarte a encontrar cuidadores, residencias u otros servicios para mayores. ¿En qué te ayudo?', 'bot');
      }
    }
    setTimeout(function() { input.focus(); }, 50);
  }

  function closePanel() {
    isOpen = false;
    panel.style.display = 'none';
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', function() { isOpen ? closePanel() : openPanel(); });
  closeBtn.addEventListener('click', closePanel);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) closePanel();
  });

  document.addEventListener('click', function(e) {
    if (isOpen && !container.contains(e.target)) closePanel();
  });

  // ── Send ─────────────────────────────────────────────────────────────────────
  function setDisabled(v) {
    input.disabled = v;
    send.disabled = v;
  }

  async function sendMessage() {
    var text = input.value.trim();
    if (!text || isTyping) return;

    input.value = '';
    addBubble(text, 'user');

    var history = loadHistory();
    history.push({ role: 'user', content: text });
    saveHistory(history);

    isTyping = true;
    setDisabled(true);
    showTyping();

    var apiHistory = history.slice(-MAX_HISTORY * 2).slice(0, -1);

    try {
      var res = await fetch('/api/chany', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: apiHistory })
      });

      hideTyping();

      if (!res.ok) throw new Error('http_' + res.status);

      var data = await res.json();
      var reply = (data.reply || '').trim() || 'Lo siento, no pude procesar tu pregunta. Inténtalo de nuevo.';
      addBubble(reply, 'bot');
      history.push({ role: 'assistant', content: reply });
      saveHistory(history);

    } catch {
      hideTyping();
      addBubble('No puedo conectarme ahora mismo. Por favor, inténtalo en unos momentos.', 'error');
    }

    isTyping = false;
    setDisabled(false);
    input.focus();
  }

  send.addEventListener('click', sendMessage);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // ── Badge on first load ──────────────────────────────────────────────────────
  setTimeout(function() {
    if (!isOpen) { badge.style.display = 'flex'; }
  }, 3000);

})();
