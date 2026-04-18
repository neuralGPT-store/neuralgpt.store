/**
 * i18n-global.js — traducción global del portal inmobiliario neuralgpt.store
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'neural_lang';
  var SUPPORTED = ['es', 'en', 'fr', 'de', 'ru', 'zh', 'ja', 'ar'];
  var RTL_LANGS = ['ar'];

  var NAV_HREF = {
    '/': 'nav_home',
    '/index.html': 'nav_home',
    '/venta.html': 'nav_venta',
    '/alquiler.html': 'nav_alquiler',
    '/real-estate-index.html': 'nav_inmuebles',
    '/contact.html': 'nav_contact',
    '/about.html': 'nav_about'
  };

  var T = {
    es: {
      nav_home: 'Inicio',
      nav_venta: 'Venta',
      nav_alquiler: 'Alquiler',
      nav_inmuebles: 'Inmuebles',
      nav_contact: 'Contacto',
      nav_about: 'Sobre nosotros',
      nav_language: 'Idioma',
      btn_explore: 'Ver inmuebles',
      btn_contact: 'Contactar',
      footer_company: 'NEURALGPT',
      footer_legal: 'LEGAL',
      footer_privacy: 'Privacidad',
      footer_terms: 'Términos',
      footer_legal_notice: 'Aviso legal',
      chany_greeting: '¡Hola! Soy Chany. ¿En qué puedo ayudarte?',
      chany_placeholder: 'Escribe tu pregunta…',
      chany_send: 'Enviar'
    },
    en: {
      nav_home: 'Home',
      nav_venta: 'Buy',
      nav_alquiler: 'Rent',
      nav_inmuebles: 'Listings',
      nav_contact: 'Contact',
      nav_about: 'About',
      nav_language: 'Language',
      btn_explore: 'View listings',
      btn_contact: 'Contact',
      chany_greeting: 'Hi! I am Chany. How can I help?',
      chany_placeholder: 'Type your question…',
      chany_send: 'Send'
    },
    fr: {
      nav_home: 'Accueil',
      nav_venta: 'Acheter',
      nav_alquiler: 'Louer',
      nav_inmuebles: 'Biens',
      nav_contact: 'Contact',
      nav_about: 'À propos',
      nav_language: 'Langue',
      btn_explore: 'Voir les biens',
      btn_contact: 'Contacter'
    },
    de: {
      nav_home: 'Startseite',
      nav_venta: 'Kaufen',
      nav_alquiler: 'Mieten',
      nav_inmuebles: 'Immobilien',
      nav_contact: 'Kontakt',
      nav_about: 'Über uns',
      nav_language: 'Sprache',
      btn_explore: 'Immobilien ansehen',
      btn_contact: 'Kontakt'
    },
    ru: {
      nav_home: 'Главная',
      nav_venta: 'Покупка',
      nav_alquiler: 'Аренда',
      nav_inmuebles: 'Объекты',
      nav_contact: 'Контакт',
      nav_about: 'О нас',
      nav_language: 'Язык',
      btn_explore: 'Смотреть объекты',
      btn_contact: 'Связаться'
    },
    zh: {
      nav_home: '首页',
      nav_venta: '购买',
      nav_alquiler: '租赁',
      nav_inmuebles: '房源',
      nav_contact: '联系',
      nav_about: '关于我们',
      nav_language: '语言',
      btn_explore: '查看房源',
      btn_contact: '联系'
    },
    ja: {
      nav_home: 'ホーム',
      nav_venta: '購入',
      nav_alquiler: '賃貸',
      nav_inmuebles: '物件',
      nav_contact: '連絡先',
      nav_about: '会社情報',
      nav_language: '言語',
      btn_explore: '物件を見る',
      btn_contact: '連絡する'
    },
    ar: {
      nav_home: 'الرئيسية',
      nav_venta: 'شراء',
      nav_alquiler: 'إيجار',
      nav_inmuebles: 'العقارات',
      nav_contact: 'اتصل',
      nav_about: 'من نحن',
      nav_language: 'اللغة',
      btn_explore: 'عرض العقارات',
      btn_contact: 'تواصل'
    }
  };

  function applyTranslations(lang) {
    if (!lang || SUPPORTED.indexOf(lang) === -1) lang = 'es';

    var t = lang === 'es' ? T.es : Object.assign({}, T.es, T[lang]);
    var rtl = RTL_LANGS.indexOf(lang) !== -1;

    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('data-lang', lang);
    if (rtl) {
      document.documentElement.setAttribute('dir', 'rtl');
      if (document.body) document.body.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.removeAttribute('dir');
      if (document.body) document.body.removeAttribute('dir');
    }

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) el.innerHTML = t[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (t[key] !== undefined) el.placeholder = t[key];
    });

    document.querySelectorAll('.main-nav a:not([data-i18n])').forEach(function (a) {
      var href = a.getAttribute('href');
      var key = NAV_HREF[href];
      if (key && t[key] !== undefined) a.textContent = t[key];
    });

    var btn = document.getElementById('lang-btn');
    if (btn) {
      btn.title = t.nav_language || lang.toUpperCase();
      btn.setAttribute('aria-label', 'Language / Idioma: ' + lang.toUpperCase());
    }
  }

  function detectLang() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    } catch (e) {}

    var browser = (navigator.language || navigator.userLanguage || 'es').substring(0, 2).toLowerCase();
    return SUPPORTED.indexOf(browser) !== -1 ? browser : 'es';
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = 'es';
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
    applyTranslations(lang);
  }

  function injectLangButton() {
    if (document.getElementById('lang-btn')) return;
    var headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    var btn = document.createElement('button');
    btn.className = 'btn btn-sm';
    btn.id = 'lang-btn';
    btn.type = 'button';
    btn.style.cssText = 'font-size:1rem;padding:6px 10px';
    btn.textContent = '🌐';
    btn.setAttribute('aria-label', 'Cambiar idioma');
    btn.title = 'Idioma';

    headerActions.insertBefore(btn, headerActions.firstChild);
  }

  function bindLangButton() {
    var btn = document.getElementById('lang-btn');
    if (!btn || btn._i18nBound) return;
    btn._i18nBound = true;

    var current = detectLang();
    var idx = SUPPORTED.indexOf(current);

    btn.addEventListener('click', function () {
      idx = (idx + 1) % SUPPORTED.length;
      setLang(SUPPORTED[idx]);
    });
  }

  function init() {
    injectLangButton();
    applyTranslations(detectLang());
    bindLangButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.NeuralI18n = {
    setLang: setLang,
    detectLang: detectLang,
    applyTranslations: applyTranslations,
    supported: SUPPORTED,
    t: function (key) {
      var lang = detectLang();
      var obj = lang === 'es' ? T.es : Object.assign({}, T.es, T[lang]);
      return obj[key] || key;
    }
  };
})();
