/**
 * i18n-global.js — Sistema de traducción global neuralgpt.store v1.0
 * Idiomas: ES (default) | EN | FR | DE | RU | ZH | JA | AR
 * - Persiste en localStorage['neural_lang']
 * - Detecta idioma del navegador en primera visita
 * - Activa dir="rtl" automáticamente para árabe
 * - Traduce cualquier elemento con [data-i18n] o [data-i18n-placeholder]
 * - También traduce nav links comunes por href aunque no tengan data-i18n
 * - Inyecta botón 🌐 en el header si no existe
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'neural_lang';
  var SUPPORTED    = ['es', 'en', 'fr', 'de', 'ru', 'zh', 'ja', 'ar'];
  var RTL_LANGS    = ['ar'];

  /* ── TRADUCCIÓN POR HREF para nav links sin data-i18n ── */
  var NAV_HREF = {
    '/':                    'nav_home',
    '/index.html':          'nav_home',
    '/marketplace.html':    'nav_marketplace',
    '/providers.html':      'nav_providers',
    '/pricing.html':        'nav_pricing',
    '/contact.html':        'nav_contact',
    '/about.html':          'nav_about',
    '/provider-register.html': 'nav_sell',
    '/vendor-onboarding.html': 'nav_onboarding'
  };

  /* ══════════════════════════════════════════════════════════
     DICCIONARIOS DE TRADUCCIÓN
     ES = base/fallback — las demás fusionan con ES en runtime
  ══════════════════════════════════════════════════════════ */
  var T = {

    /* ── ESPAÑOL (base) ──────────────────────────────────── */
    es: {
      /* Nav */
      nav_home: 'Inicio', nav_marketplace: 'Marketplace',
      nav_providers: 'Proveedores', nav_pricing: 'Precios',
      nav_contact: 'Contacto', nav_about: 'Sobre nosotros',
      nav_sell: 'Vender', nav_onboarding: 'Guía de inicio',
      /* Botones globales */
      btn_explore: 'Explorar', btn_sell: 'Vender',
      btn_search: 'BUSCAR', btn_marketplace: 'Ver Marketplace',
      btn_about: '¿Qué es neuralgpt?', btn_sell_now: 'Registrarme como vendedor',
      btn_more_info: 'Ver comisiones', btn_explore_mp: 'Explorar marketplace',
      btn_register_seller: 'Registrarme como vendedor',
      btn_subscribe: 'Suscribirse', btn_contact: 'Contactar',
      btn_buy: 'Comprar ahora', btn_demo: 'Solicitar demo',
      /* Hero */
      hero_badge: 'MARKETPLACE ACTIVO · SOFTWARE + IA VERIFICADO',
      hero_title: 'El futuro del<br>software está aquí',
      hero_subtitle: 'Descubre, compra y descarga software profesional creado con inteligencia artificial. Automatizaciones, herramientas IA y soluciones para empresas y particulares. 100% verificado.',
      search_placeholder: 'Busca software, herramientas, automatizaciones…',
      /* Stats */
      stat_products: 'PRODUCTOS', stat_devs: 'DESARROLLADORES',
      stat_downloads: 'DESCARGAS', stat_verified: 'SOFTWARE VERIFICADO',
      stat_rating: 'VALORACIÓN MEDIA',
      /* Secciones home */
      own_products_title: 'Nuestros Productos',
      own_products_sub: 'Software premium creado por el equipo neuralgpt. Verificado, soportado y con actualizaciones incluidas.',
      cat_title: 'Explora el Marketplace',
      cat_sub: 'Software profesional de terceros organizado por categorías. Todos los productos verificados y seguros.',
      why_title: '¿Por qué neuralgpt.store?',
      why_sub: 'Una plataforma construida para desarrolladores, por desarrolladores. Segura, rápida y transparente.',
      testimonials_title: 'Lo que dicen nuestros usuarios',
      testimonials_sub: 'Más de 120 desarrolladores y empresas confían en neuralgpt.store',
      dev_title: 'Vende tu software<br>en neuralgpt.store',
      dev_sub: 'Publica tus herramientas y llega a miles de compradores técnicos. Proceso simple, verificación rápida y comisiones transparentes.',
      cta_title: '¿Listo para empezar?',
      cta_sub: 'Explora el marketplace o únete como proveedor. La plataforma de software IA más grande en español.',
      /* Features */
      feat1_title: 'DESCARGA INMEDIATA',
      feat1_desc: 'Tras el pago accedes al producto al instante. Sin esperas, sin procesos manuales.',
      feat2_title: 'SOFTWARE VERIFICADO',
      feat2_desc: 'Todo el software pasa por análisis anti-malware y revisión manual antes de publicarse. Badge verificado visible.',
      feat3_title: 'PAGO SEGURO STRIPE',
      feat3_desc: 'Pagos procesados 100% por Stripe (PCI-DSS). Tarjeta, Google Pay y más. Sin datos bancarios en nuestros servidores.',
      feat4_title: 'CREADO CON IA',
      feat4_desc: 'Todo el software está desarrollado y optimizado con inteligencia artificial de última generación.',
      feat5_title: 'NATIVO EN LINUX',
      feat5_desc: 'Optimizado para Linux, BlackArch y sistemas Unix. Compatibilidad total con entornos profesionales.',
      feat6_title: 'ACTUALIZACIONES INCLUIDAS',
      feat6_desc: 'Compra una vez, recibe todas las actualizaciones del producto sin coste adicional.',
      /* Steps */
      step1_title: 'Regístrate como proveedor',
      step1_desc: 'Completa el formulario de alta con los datos de tu software y empresa. Proceso de 5 minutos.',
      step2_title: 'Verificación de seguridad',
      step2_desc: 'Nuestro equipo analiza el software contra malware y revisa la funcionalidad descrita. 24-48h.',
      step3_title: 'Publica y vende',
      step3_desc: 'Tu producto aparece con el badge "Verificado" en el marketplace. Cobra mensualmente vía Stripe.',
      step4_title: 'Cobra cada mes',
      step4_desc: 'Pago automático vía Stripe Connect. Mínimo 10€ de payout. Informes detallados de ventas.',
      /* Footer */
      footer_tagline: 'Marketplace premium de software creado con IA. Verificado, seguro y con pago Stripe.',
      footer_copy: '© 2025–2026 neuralgpt.store · Todos los derechos reservados',
      footer_company: 'NEURALGPT', footer_about: 'Sobre nosotros',
      footer_blog: 'Blog', footer_contact: 'Contacto', footer_sponsors: 'Sponsors',
      footer_marketplace_label: 'MARKETPLACE', footer_all_products: 'Todos los productos',
      footer_categories: 'Categorías', footer_pricing: 'Precios', footer_trends: 'Tendencias',
      footer_sellers: 'VENDEDORES', footer_register: 'Registrarse',
      footer_directory: 'Directorio', footer_guide: 'Guía de inicio',
      footer_seller_contact: 'Contactar equipo',
      footer_legal: 'LEGAL & SEGURIDAD', footer_privacy: 'Privacidad',
      footer_terms: 'Términos', footer_legal_notice: 'Aviso legal',
      footer_security: 'Centro de seguridad', footer_vuln: 'Reportar vulnerabilidad',
      newsletter_label: 'NEWSLETTER', newsletter_placeholder: 'tu@email.com',
      /* Pricing */
      pricing_title: 'Precios y Comisiones',
      pricing_sub: 'Modelo transparente. Sin sorpresas. Sin cuota mensual fija.',
      commission_standard: 'Comisión estándar',
      commission_note: 'Sin cuota mensual. Solo pagas cuando vendes.',
      /* Contact */
      contact_title: 'Contacto',
      contact_sub: 'Estamos aquí para ayudarte. Elige el canal más adecuado.',
      form_name: 'Tu nombre', form_email: 'Tu email', form_message: 'Tu mensaje',
      form_submit: 'Enviar mensaje',
      /* Product */
      product_buy_btn: '💳 Comprar ahora — Pago seguro Stripe',
      product_verified: 'Verificado por Chany',
      product_download_note: 'Tu descarga está protegida. Recibirás acceso inmediato tras confirmar el pago.',
      /* Legal */
      legal_terms_title: 'Términos y Condiciones',
      legal_privacy_title: 'Política de Privacidad',
      legal_notice_title: 'Aviso Legal',
      /* About */
      about_title: 'Sobre neuralgpt.store',
      about_sub: 'El marketplace de software más seguro en español.',
      /* Providers */
      providers_title: 'Directorio de Proveedores',
      providers_sub: 'Desarrolladores verificados que publican software en neuralgpt.store.',
      register_title: 'Registrarse como Vendedor',
      register_sub: 'Publica tu software y llega a miles de compradores técnicos.',
      onboarding_title: 'Guía de Inicio para Vendedores',
      onboarding_sub: 'Todo lo que necesitas saber para publicar y vender en neuralgpt.store.',
      /* Marketplace */
      marketplace_title: 'Marketplace',
      marketplace_sub: 'Software verificado y seguro. Herramientas IA, automatizaciones, seguridad y más.',
      filter_all: 'Todos', filter_ia: 'IA', filter_automation: 'Automatización',
      filter_security: 'Seguridad', filter_web: 'Web & APIs', filter_data: 'Datos',
      filter_linux: 'Linux & Sistemas', filter_mobile: 'Apps Móviles',
      sort_relevance: 'Relevancia', sort_price_asc: 'Precio ↑', sort_price_desc: 'Precio ↓',
      sort_rating: 'Valoración', sort_new: 'Más nuevos',
      /* Chany */
      chany_greeting: '¡Hola! Soy Chany. ¿En qué puedo ayudarte?',
      chany_placeholder: 'Escribe tu pregunta…',
      chany_send: 'Enviar',
    },

    /* ── INGLÉS ──────────────────────────────────────────── */
    en: {
      nav_home: 'Home', nav_marketplace: 'Marketplace',
      nav_providers: 'Providers', nav_pricing: 'Pricing',
      nav_contact: 'Contact', nav_about: 'About us',
      nav_sell: 'Sell', nav_onboarding: 'Getting started',
      btn_explore: 'Explore', btn_sell: 'Sell',
      btn_search: 'SEARCH', btn_marketplace: 'View Marketplace',
      btn_about: 'What is neuralgpt?', btn_sell_now: 'Register as seller',
      btn_more_info: 'View commissions', btn_explore_mp: 'Explore marketplace',
      btn_register_seller: 'Register as seller',
      btn_subscribe: 'Subscribe', btn_contact: 'Contact',
      btn_buy: 'Buy now', btn_demo: 'Request demo',
      hero_badge: 'ACTIVE MARKETPLACE · VERIFIED SOFTWARE + AI',
      hero_title: 'The future of<br>software is here',
      hero_subtitle: 'Discover, buy and download professional software built with artificial intelligence. Automations, AI tools and solutions for businesses and individuals. 100% verified.',
      search_placeholder: 'Search software, tools, automations…',
      stat_products: 'PRODUCTS', stat_devs: 'DEVELOPERS',
      stat_downloads: 'DOWNLOADS', stat_verified: 'VERIFIED SOFTWARE',
      stat_rating: 'AVG RATING',
      own_products_title: 'Our Products',
      own_products_sub: 'Premium software by the neuralgpt team. Verified, supported and with included updates.',
      cat_title: 'Explore the Marketplace',
      cat_sub: 'Third-party professional software organized by category. All products verified and secure.',
      why_title: 'Why neuralgpt.store?',
      why_sub: 'A platform built for developers, by developers. Secure, fast and transparent.',
      testimonials_title: 'What our users say',
      testimonials_sub: 'Over 120 developers and companies trust neuralgpt.store',
      dev_title: 'Sell your software<br>on neuralgpt.store',
      dev_sub: 'Publish your tools and reach thousands of technical buyers. Simple process, fast verification and transparent commissions.',
      cta_title: 'Ready to start?',
      cta_sub: 'Explore the marketplace or join as a provider. The largest AI software platform in Spanish.',
      feat1_title: 'INSTANT DOWNLOAD',
      feat1_desc: 'After payment you access the product instantly. No waiting, no manual processes.',
      feat2_title: 'VERIFIED SOFTWARE',
      feat2_desc: 'All software goes through anti-malware analysis and manual review before publishing. Verified badge visible.',
      feat3_title: 'SECURE STRIPE PAYMENT',
      feat3_desc: 'Payments processed 100% by Stripe (PCI-DSS). Card, Google Pay and more. No banking data on our servers.',
      feat4_title: 'BUILT WITH AI',
      feat4_desc: 'All software is developed and optimized with the latest generation artificial intelligence.',
      feat5_title: 'LINUX NATIVE',
      feat5_desc: 'Optimized for Linux, BlackArch and Unix systems. Full compatibility with professional environments.',
      feat6_title: 'UPDATES INCLUDED',
      feat6_desc: 'Buy once, receive all product updates at no additional cost.',
      step1_title: 'Register as provider',
      step1_desc: 'Complete the registration form with your software and company details. 5-minute process.',
      step2_title: 'Security verification',
      step2_desc: 'Our team analyzes the software for malware and reviews the described functionality. 24-48h.',
      step3_title: 'Publish and sell',
      step3_desc: 'Your product appears with the "Verified" badge in the marketplace. Collect monthly via Stripe.',
      step4_title: 'Get paid monthly',
      step4_desc: 'Automatic payment via Stripe Connect. Minimum payout €10. Detailed sales reports.',
      footer_tagline: 'Premium software marketplace built with AI. Verified, secure and Stripe payments.',
      footer_copy: '© 2025–2026 neuralgpt.store · All rights reserved',
      footer_company: 'NEURALGPT', footer_about: 'About us',
      footer_blog: 'Blog', footer_contact: 'Contact', footer_sponsors: 'Sponsors',
      footer_marketplace_label: 'MARKETPLACE', footer_all_products: 'All products',
      footer_categories: 'Categories', footer_pricing: 'Pricing', footer_trends: 'Trends',
      footer_sellers: 'SELLERS', footer_register: 'Register',
      footer_directory: 'Directory', footer_guide: 'Getting started',
      footer_seller_contact: 'Contact team',
      footer_legal: 'LEGAL & SECURITY', footer_privacy: 'Privacy',
      footer_terms: 'Terms', footer_legal_notice: 'Legal notice',
      footer_security: 'Security center', footer_vuln: 'Report vulnerability',
      newsletter_label: 'NEWSLETTER', newsletter_placeholder: 'you@email.com',
      pricing_title: 'Pricing & Commissions',
      pricing_sub: 'Transparent model. No surprises. No fixed monthly fee.',
      commission_standard: 'Standard commission',
      commission_note: 'No monthly fee. You only pay when you sell.',
      contact_title: 'Contact',
      contact_sub: 'We are here to help you. Choose the most suitable channel.',
      form_name: 'Your name', form_email: 'Your email', form_message: 'Your message',
      form_submit: 'Send message',
      product_buy_btn: '💳 Buy now — Secure Stripe payment',
      product_verified: 'Verified by Chany',
      product_download_note: 'Your download is protected. You will receive instant access after confirming payment.',
      legal_terms_title: 'Terms and Conditions',
      legal_privacy_title: 'Privacy Policy',
      legal_notice_title: 'Legal Notice',
      about_title: 'About neuralgpt.store',
      about_sub: 'The most secure software marketplace in Spanish.',
      providers_title: 'Providers Directory',
      providers_sub: 'Verified developers publishing software on neuralgpt.store.',
      register_title: 'Register as a Seller',
      register_sub: 'Publish your software and reach thousands of technical buyers.',
      onboarding_title: 'Getting Started Guide for Sellers',
      onboarding_sub: 'Everything you need to know to publish and sell on neuralgpt.store.',
      marketplace_title: 'Marketplace',
      marketplace_sub: 'Verified and secure software. AI tools, automations, security and more.',
      filter_all: 'All', filter_ia: 'AI', filter_automation: 'Automation',
      filter_security: 'Security', filter_web: 'Web & APIs', filter_data: 'Data',
      filter_linux: 'Linux & Systems', filter_mobile: 'Mobile Apps',
      sort_relevance: 'Relevance', sort_price_asc: 'Price ↑', sort_price_desc: 'Price ↓',
      sort_rating: 'Rating', sort_new: 'Newest',
      chany_greeting: 'Hi! I\'m Chany. How can I help you?',
      chany_placeholder: 'Type your question…',
      chany_send: 'Send',
    },

    /* ── FRANCÉS ─────────────────────────────────────────── */
    fr: {
      nav_home: 'Accueil', nav_marketplace: 'Marketplace',
      nav_providers: 'Fournisseurs', nav_pricing: 'Tarifs',
      nav_contact: 'Contact', nav_about: 'À propos',
      nav_sell: 'Vendre', nav_onboarding: 'Guide de démarrage',
      btn_explore: 'Explorer', btn_sell: 'Vendre',
      btn_search: 'CHERCHER', btn_marketplace: 'Voir le Marketplace',
      btn_about: 'Qu\'est-ce que neuralgpt ?', btn_sell_now: 'S\'inscrire comme vendeur',
      btn_more_info: 'Voir les commissions', btn_explore_mp: 'Explorer le marketplace',
      btn_register_seller: 'S\'inscrire comme vendeur',
      btn_subscribe: 'S\'abonner', btn_contact: 'Contacter',
      btn_buy: 'Acheter maintenant', btn_demo: 'Demander une démo',
      hero_badge: 'MARKETPLACE ACTIF · LOGICIELS + IA VÉRIFIÉS',
      hero_title: 'Le futur du<br>logiciel est là',
      hero_subtitle: 'Découvrez, achetez et téléchargez des logiciels professionnels créés avec l\'intelligence artificielle. Automatisations, outils IA et solutions pour les entreprises et les particuliers. 100% vérifiés.',
      search_placeholder: 'Rechercher logiciels, outils, automatisations…',
      stat_products: 'PRODUITS', stat_devs: 'DÉVELOPPEURS',
      stat_downloads: 'TÉLÉCHARGEMENTS', stat_verified: 'LOGICIELS VÉRIFIÉS',
      stat_rating: 'NOTE MOYENNE',
      own_products_title: 'Nos Produits',
      own_products_sub: 'Logiciels premium créés par l\'équipe neuralgpt. Vérifiés, supportés et avec mises à jour incluses.',
      cat_title: 'Explorer le Marketplace',
      cat_sub: 'Logiciels professionnels tiers organisés par catégorie. Tous les produits vérifiés et sécurisés.',
      why_title: 'Pourquoi neuralgpt.store ?',
      why_sub: 'Une plateforme construite pour les développeurs, par les développeurs. Sécurisée, rapide et transparente.',
      testimonials_title: 'Ce que disent nos utilisateurs',
      testimonials_sub: 'Plus de 120 développeurs et entreprises font confiance à neuralgpt.store',
      dev_title: 'Vendez votre logiciel<br>sur neuralgpt.store',
      dev_sub: 'Publiez vos outils et atteignez des milliers d\'acheteurs techniques.',
      cta_title: 'Prêt à commencer ?',
      cta_sub: 'Explorez le marketplace ou rejoignez-nous en tant que fournisseur.',
      feat1_title: 'TÉLÉCHARGEMENT IMMÉDIAT',
      feat1_desc: 'Après le paiement, accédez instantanément au produit. Sans attente, sans processus manuel.',
      feat2_title: 'LOGICIEL VÉRIFIÉ',
      feat2_desc: 'Tous les logiciels passent par une analyse anti-malware et une révision manuelle avant publication.',
      feat3_title: 'PAIEMENT SÉCURISÉ STRIPE',
      feat3_desc: 'Paiements traités à 100% par Stripe (PCI-DSS). Carte, Google Pay et plus.',
      feat4_title: 'CRÉÉ AVEC IA',
      feat4_desc: 'Tous les logiciels sont développés et optimisés avec l\'IA de dernière génération.',
      feat5_title: 'NATIF LINUX',
      feat5_desc: 'Optimisé pour Linux, BlackArch et les systèmes Unix.',
      feat6_title: 'MISES À JOUR INCLUSES',
      feat6_desc: 'Achetez une fois, recevez toutes les mises à jour sans frais supplémentaires.',
      step1_title: 'Inscrivez-vous en tant que fournisseur',
      step1_desc: 'Remplissez le formulaire d\'inscription avec les données de votre logiciel et entreprise.',
      step2_title: 'Vérification de sécurité',
      step2_desc: 'Notre équipe analyse le logiciel contre les malwares. 24-48h.',
      step3_title: 'Publiez et vendez',
      step3_desc: 'Votre produit apparaît avec le badge "Vérifié" dans le marketplace.',
      step4_title: 'Soyez payé chaque mois',
      step4_desc: 'Paiement automatique via Stripe Connect. Minimum 10€ de payout.',
      footer_tagline: 'Marketplace premium de logiciels créés avec l\'IA. Vérifiés, sécurisés et paiements Stripe.',
      footer_copy: '© 2025–2026 neuralgpt.store · Tous droits réservés',
      footer_company: 'NEURALGPT', footer_about: 'À propos',
      footer_blog: 'Blog', footer_contact: 'Contact', footer_sponsors: 'Sponsors',
      footer_marketplace_label: 'MARKETPLACE', footer_all_products: 'Tous les produits',
      footer_categories: 'Catégories', footer_pricing: 'Tarifs', footer_trends: 'Tendances',
      footer_sellers: 'VENDEURS', footer_register: 'S\'inscrire',
      footer_directory: 'Annuaire', footer_guide: 'Guide de démarrage',
      footer_seller_contact: 'Contacter l\'équipe',
      footer_legal: 'LÉGAL & SÉCURITÉ', footer_privacy: 'Confidentialité',
      footer_terms: 'Conditions', footer_legal_notice: 'Mentions légales',
      footer_security: 'Centre de sécurité', footer_vuln: 'Signaler une vulnérabilité',
      newsletter_label: 'NEWSLETTER', newsletter_placeholder: 'vous@email.com',
      pricing_title: 'Tarifs et Commissions',
      pricing_sub: 'Modèle transparent. Sans surprises. Sans frais mensuels fixes.',
      commission_standard: 'Commission standard',
      commission_note: 'Pas de frais mensuels. Vous ne payez que lorsque vous vendez.',
      contact_title: 'Contact',
      contact_sub: 'Nous sommes là pour vous aider.',
      form_name: 'Votre nom', form_email: 'Votre email', form_message: 'Votre message',
      form_submit: 'Envoyer le message',
      product_buy_btn: '💳 Acheter maintenant — Paiement sécurisé Stripe',
      product_verified: 'Vérifié par Chany',
      product_download_note: 'Votre téléchargement est protégé. Vous recevrez un accès immédiat après confirmation du paiement.',
      marketplace_title: 'Marketplace',
      marketplace_sub: 'Logiciels vérifiés et sécurisés. Outils IA, automatisations, sécurité et plus.',
      filter_all: 'Tous', filter_ia: 'IA', filter_automation: 'Automatisation',
      filter_security: 'Sécurité', filter_web: 'Web & APIs', filter_data: 'Données',
      filter_linux: 'Linux & Systèmes', filter_mobile: 'Apps Mobiles',
      sort_relevance: 'Pertinence', sort_price_asc: 'Prix ↑', sort_price_desc: 'Prix ↓',
      sort_rating: 'Note', sort_new: 'Plus récents',
      chany_greeting: 'Bonjour ! Je suis Chany. Comment puis-je vous aider ?',
      chany_placeholder: 'Tapez votre question…',
      chany_send: 'Envoyer',
    },

    /* ── ALEMÁN ──────────────────────────────────────────── */
    de: {
      nav_home: 'Startseite', nav_marketplace: 'Marketplace',
      nav_providers: 'Anbieter', nav_pricing: 'Preise',
      nav_contact: 'Kontakt', nav_about: 'Über uns',
      nav_sell: 'Verkaufen', nav_onboarding: 'Erste Schritte',
      btn_explore: 'Erkunden', btn_sell: 'Verkaufen',
      btn_search: 'SUCHEN', btn_marketplace: 'Marketplace ansehen',
      btn_about: 'Was ist neuralgpt?', btn_sell_now: 'Als Verkäufer registrieren',
      btn_more_info: 'Provisionen ansehen', btn_explore_mp: 'Marketplace erkunden',
      btn_register_seller: 'Als Verkäufer registrieren',
      btn_subscribe: 'Abonnieren', btn_contact: 'Kontaktieren',
      btn_buy: 'Jetzt kaufen', btn_demo: 'Demo anfordern',
      hero_badge: 'AKTIVER MARKETPLACE · VERIFIZIERTE SOFTWARE + KI',
      hero_title: 'Die Zukunft der<br>Software ist hier',
      hero_subtitle: 'Entdecken, kaufen und laden Sie professionelle KI-Software herunter. Automatisierungen, KI-Tools und Lösungen für Unternehmen und Privatpersonen. 100% verifiziert.',
      search_placeholder: 'Software, Tools, Automatisierungen suchen…',
      stat_products: 'PRODUKTE', stat_devs: 'ENTWICKLER',
      stat_downloads: 'DOWNLOADS', stat_verified: 'VERIFIZIERTE SOFTWARE',
      stat_rating: 'DURCHSCHNITTSBEWERTUNG',
      own_products_title: 'Unsere Produkte',
      own_products_sub: 'Premium-Software vom neuralgpt-Team. Verifiziert, unterstützt und mit enthaltenen Updates.',
      cat_title: 'Marketplace erkunden',
      cat_sub: 'Professionelle Drittanbieter-Software nach Kategorien. Alle Produkte verifiziert und sicher.',
      why_title: 'Warum neuralgpt.store?',
      why_sub: 'Eine Plattform für Entwickler, von Entwicklern. Sicher, schnell und transparent.',
      testimonials_title: 'Was unsere Nutzer sagen',
      testimonials_sub: 'Über 120 Entwickler und Unternehmen vertrauen neuralgpt.store',
      dev_title: 'Verkaufen Sie Ihre Software<br>auf neuralgpt.store',
      dev_sub: 'Veröffentlichen Sie Ihre Tools und erreichen Sie Tausende technischer Käufer.',
      cta_title: 'Bereit loszulegen?',
      cta_sub: 'Erkunden Sie den Marketplace oder werden Sie Anbieter.',
      feat1_title: 'SOFORTIGER DOWNLOAD',
      feat1_desc: 'Nach der Zahlung haben Sie sofortigen Zugriff auf das Produkt.',
      feat2_title: 'VERIFIZIERTE SOFTWARE',
      feat2_desc: 'Alle Software wird vor der Veröffentlichung auf Malware analysiert und manuell überprüft.',
      feat3_title: 'SICHERE STRIPE-ZAHLUNG',
      feat3_desc: 'Zahlungen zu 100% über Stripe (PCI-DSS) verarbeitet.',
      feat4_title: 'MIT KI ERSTELLT',
      feat4_desc: 'Alle Software wird mit KI der neuesten Generation entwickelt und optimiert.',
      feat5_title: 'LINUX-NATIV',
      feat5_desc: 'Optimiert für Linux, BlackArch und Unix-Systeme.',
      feat6_title: 'UPDATES ENTHALTEN',
      feat6_desc: 'Einmal kaufen, alle Updates kostenlos erhalten.',
      step1_title: 'Als Anbieter registrieren',
      step1_desc: 'Füllen Sie das Registrierungsformular mit Ihren Software- und Unternehmensdaten aus.',
      step2_title: 'Sicherheitsüberprüfung',
      step2_desc: 'Unser Team analysiert die Software auf Malware. 24-48h.',
      step3_title: 'Veröffentlichen und verkaufen',
      step3_desc: 'Ihr Produkt erscheint mit dem "Verifiziert"-Badge im Marketplace.',
      step4_title: 'Monatlich bezahlt werden',
      step4_desc: 'Automatische Zahlung über Stripe Connect. Mindestauszahlung 10€.',
      footer_tagline: 'Premium-Software-Marketplace mit KI erstellt. Verifiziert, sicher und Stripe-Zahlung.',
      footer_copy: '© 2025–2026 neuralgpt.store · Alle Rechte vorbehalten',
      footer_company: 'NEURALGPT', footer_about: 'Über uns',
      footer_blog: 'Blog', footer_contact: 'Kontakt', footer_sponsors: 'Sponsoren',
      footer_marketplace_label: 'MARKETPLACE', footer_all_products: 'Alle Produkte',
      footer_categories: 'Kategorien', footer_pricing: 'Preise', footer_trends: 'Trends',
      footer_sellers: 'VERKÄUFER', footer_register: 'Registrieren',
      footer_directory: 'Verzeichnis', footer_guide: 'Erste Schritte',
      footer_seller_contact: 'Team kontaktieren',
      footer_legal: 'LEGAL & SICHERHEIT', footer_privacy: 'Datenschutz',
      footer_terms: 'AGB', footer_legal_notice: 'Impressum',
      footer_security: 'Sicherheitszentrum', footer_vuln: 'Schwachstelle melden',
      newsletter_label: 'NEWSLETTER', newsletter_placeholder: 'sie@email.com',
      pricing_title: 'Preise und Provisionen',
      pricing_sub: 'Transparentes Modell. Keine Überraschungen. Keine feste Monatsgebühr.',
      commission_standard: 'Standardprovision',
      commission_note: 'Keine Monatsgebühr. Sie zahlen nur, wenn Sie verkaufen.',
      contact_title: 'Kontakt',
      contact_sub: 'Wir sind für Sie da.',
      form_name: 'Ihr Name', form_email: 'Ihre E-Mail', form_message: 'Ihre Nachricht',
      form_submit: 'Nachricht senden',
      product_buy_btn: '💳 Jetzt kaufen — Sichere Stripe-Zahlung',
      product_verified: 'Von Chany verifiziert',
      product_download_note: 'Ihr Download ist geschützt. Sie erhalten sofortigen Zugang nach Zahlungsbestätigung.',
      marketplace_title: 'Marketplace',
      marketplace_sub: 'Verifizierte und sichere Software. KI-Tools, Automatisierungen, Sicherheit und mehr.',
      filter_all: 'Alle', filter_ia: 'KI', filter_automation: 'Automatisierung',
      filter_security: 'Sicherheit', filter_web: 'Web & APIs', filter_data: 'Daten',
      filter_linux: 'Linux & Systeme', filter_mobile: 'Mobile Apps',
      sort_relevance: 'Relevanz', sort_price_asc: 'Preis ↑', sort_price_desc: 'Preis ↓',
      sort_rating: 'Bewertung', sort_new: 'Neueste',
      chany_greeting: 'Hallo! Ich bin Chany. Wie kann ich Ihnen helfen?',
      chany_placeholder: 'Geben Sie Ihre Frage ein…',
      chany_send: 'Senden',
    },

    /* ── RUSO ────────────────────────────────────────────── */
    ru: {
      nav_home: 'Главная', nav_marketplace: 'Магазин',
      nav_providers: 'Поставщики', nav_pricing: 'Цены',
      nav_contact: 'Контакт', nav_about: 'О нас',
      nav_sell: 'Продавать', nav_onboarding: 'Руководство',
      btn_explore: 'Исследовать', btn_sell: 'Продавать',
      btn_search: 'ПОИСК', btn_marketplace: 'Открыть магазин',
      btn_about: 'Что такое neuralgpt?', btn_sell_now: 'Зарегистрироваться как продавец',
      btn_more_info: 'Посмотреть комиссии', btn_explore_mp: 'Исследовать магазин',
      btn_register_seller: 'Зарегистрироваться как продавец',
      btn_subscribe: 'Подписаться', btn_contact: 'Связаться',
      btn_buy: 'Купить сейчас', btn_demo: 'Запросить демо',
      hero_badge: 'АКТИВНЫЙ МАРКЕТПЛЕЙС · ПРОВЕРЕННЫЙ СОФТ + ИИ',
      hero_title: 'Будущее<br>программного обеспечения здесь',
      hero_subtitle: 'Открывайте, покупайте и скачивайте профессиональное ПО, созданное с ИИ. Автоматизации, инструменты ИИ и решения для бизнеса и частных лиц. 100% проверено.',
      search_placeholder: 'Поиск ПО, инструментов, автоматизаций…',
      stat_products: 'ПРОДУКТЫ', stat_devs: 'РАЗРАБОТЧИКИ',
      stat_downloads: 'ЗАГРУЗКИ', stat_verified: 'ПРОВЕРЕННОЕ ПО',
      stat_rating: 'СРЕДНЯЯ ОЦЕНКА',
      own_products_title: 'Наши Продукты',
      own_products_sub: 'Премиум-ПО от команды neuralgpt. Проверено, поддерживается, с включёнными обновлениями.',
      cat_title: 'Исследуйте магазин',
      cat_sub: 'Профессиональное стороннее ПО по категориям. Все продукты проверены и безопасны.',
      why_title: 'Почему neuralgpt.store?',
      why_sub: 'Платформа для разработчиков, созданная разработчиками. Безопасная, быстрая и прозрачная.',
      testimonials_title: 'Что говорят наши пользователи',
      testimonials_sub: 'Более 120 разработчиков и компаний доверяют neuralgpt.store',
      dev_title: 'Продавайте своё ПО<br>на neuralgpt.store',
      dev_sub: 'Публикуйте ваши инструменты и охватывайте тысячи технических покупателей.',
      cta_title: 'Готовы начать?',
      cta_sub: 'Исследуйте магазин или присоединяйтесь как поставщик.',
      feat1_title: 'МГНОВЕННАЯ ЗАГРУЗКА',
      feat1_desc: 'После оплаты мгновенный доступ к продукту.',
      feat2_title: 'ПРОВЕРЕННОЕ ПО',
      feat2_desc: 'Всё ПО проходит анализ на вредоносное ПО и ручную проверку перед публикацией.',
      feat3_title: 'БЕЗОПАСНАЯ ОПЛАТА STRIPE',
      feat3_desc: 'Платежи обрабатываются на 100% через Stripe (PCI-DSS).',
      feat4_title: 'СОЗДАНО С ИИ',
      feat4_desc: 'Всё ПО разработано и оптимизировано с последним поколением ИИ.',
      feat5_title: 'НАТИВНЫЙ LINUX',
      feat5_desc: 'Оптимизировано для Linux, BlackArch и Unix-систем.',
      feat6_title: 'ОБНОВЛЕНИЯ ВКЛЮЧЕНЫ',
      feat6_desc: 'Купите один раз, получайте все обновления бесплатно.',
      step1_title: 'Зарегистрируйтесь как поставщик',
      step1_desc: 'Заполните форму регистрации с данными вашего ПО и компании.',
      step2_title: 'Проверка безопасности',
      step2_desc: 'Наша команда анализирует ПО на вредоносность. 24-48ч.',
      step3_title: 'Публикуйте и продавайте',
      step3_desc: 'Ваш продукт появляется с бейджем "Проверено" в магазине.',
      step4_title: 'Получайте оплату ежемесячно',
      step4_desc: 'Автоматическая выплата через Stripe Connect. Минимальная выплата 10€.',
      footer_tagline: 'Премиум-маркетплейс ПО, созданного с ИИ. Проверено, безопасно, оплата Stripe.',
      footer_copy: '© 2025–2026 neuralgpt.store · Все права защищены',
      footer_company: 'NEURALGPT', footer_about: 'О нас',
      footer_blog: 'Блог', footer_contact: 'Контакт', footer_sponsors: 'Спонсоры',
      footer_marketplace_label: 'МАГАЗИН', footer_all_products: 'Все продукты',
      footer_categories: 'Категории', footer_pricing: 'Цены', footer_trends: 'Тренды',
      footer_sellers: 'ПРОДАВЦЫ', footer_register: 'Зарегистрироваться',
      footer_directory: 'Каталог', footer_guide: 'Руководство',
      footer_seller_contact: 'Связаться с командой',
      footer_legal: 'ЮРИДИЧЕСКОЕ & БЕЗОПАСНОСТЬ', footer_privacy: 'Конфиденциальность',
      footer_terms: 'Условия', footer_legal_notice: 'Правовое уведомление',
      footer_security: 'Центр безопасности', footer_vuln: 'Сообщить об уязвимости',
      newsletter_label: 'РАССЫЛКА', newsletter_placeholder: 'вы@email.com',
      pricing_title: 'Цены и Комиссии',
      pricing_sub: 'Прозрачная модель. Никаких сюрпризов. Без фиксированных ежемесячных платежей.',
      commission_standard: 'Стандартная комиссия',
      commission_note: 'Нет ежемесячной платы. Вы платите только когда продаёте.',
      contact_title: 'Контакт',
      contact_sub: 'Мы здесь, чтобы помочь вам.',
      form_name: 'Ваше имя', form_email: 'Ваш email', form_message: 'Ваше сообщение',
      form_submit: 'Отправить сообщение',
      product_buy_btn: '💳 Купить сейчас — Безопасная оплата Stripe',
      product_verified: 'Проверено Chany',
      product_download_note: 'Ваша загрузка защищена. Вы получите мгновенный доступ после подтверждения оплаты.',
      marketplace_title: 'Магазин',
      marketplace_sub: 'Проверенное и безопасное ПО. Инструменты ИИ, автоматизации, безопасность и многое другое.',
      filter_all: 'Все', filter_ia: 'ИИ', filter_automation: 'Автоматизация',
      filter_security: 'Безопасность', filter_web: 'Web & APIs', filter_data: 'Данные',
      filter_linux: 'Linux & Системы', filter_mobile: 'Мобильные приложения',
      sort_relevance: 'Релевантность', sort_price_asc: 'Цена ↑', sort_price_desc: 'Цена ↓',
      sort_rating: 'Оценка', sort_new: 'Новейшие',
      chany_greeting: 'Привет! Я Чани. Чем могу помочь?',
      chany_placeholder: 'Введите ваш вопрос…',
      chany_send: 'Отправить',
    },

    /* ── CHINO SIMPLIFICADO ──────────────────────────────── */
    zh: {
      nav_home: '首页', nav_marketplace: '市场',
      nav_providers: '供应商', nav_pricing: '定价',
      nav_contact: '联系', nav_about: '关于我们',
      nav_sell: '销售', nav_onboarding: '入门指南',
      btn_explore: '探索', btn_sell: '销售',
      btn_search: '搜索', btn_marketplace: '查看市场',
      btn_about: '什么是neuralgpt?', btn_sell_now: '注册为卖家',
      btn_more_info: '查看佣金', btn_explore_mp: '探索市场',
      btn_register_seller: '注册为卖家',
      btn_subscribe: '订阅', btn_contact: '联系',
      btn_buy: '立即购买', btn_demo: '申请演示',
      hero_badge: '活跃市场 · 已验证软件 + AI',
      hero_title: '软件的未来<br>就在这里',
      hero_subtitle: '发现、购买和下载由人工智能构建的专业软件。自动化、AI工具和企业及个人解决方案。100%已验证。',
      search_placeholder: '搜索软件、工具、自动化…',
      stat_products: '产品', stat_devs: '开发者',
      stat_downloads: '下载', stat_verified: '已验证软件',
      stat_rating: '平均评分',
      own_products_title: '我们的产品',
      own_products_sub: 'neuralgpt团队打造的高级软件。已验证、有支持并包含更新。',
      cat_title: '探索市场',
      cat_sub: '按类别组织的第三方专业软件。所有产品已验证且安全。',
      why_title: '为什么选择neuralgpt.store？',
      why_sub: '由开发者为开发者构建的平台。安全、快速、透明。',
      testimonials_title: '用户评价',
      testimonials_sub: '超过120名开发者和公司信任neuralgpt.store',
      dev_title: '在neuralgpt.store<br>销售您的软件',
      dev_sub: '发布您的工具，覆盖数千名技术买家。',
      cta_title: '准备好开始了吗？',
      cta_sub: '探索市场或作为供应商加入。',
      feat1_title: '即时下载',
      feat1_desc: '付款后立即访问产品。无需等待，无需手动流程。',
      feat2_title: '已验证软件',
      feat2_desc: '所有软件在发布前都经过反恶意软件分析和人工审查。',
      feat3_title: 'STRIPE安全支付',
      feat3_desc: '通过Stripe（PCI-DSS）处理100%的付款。',
      feat4_title: '用AI构建',
      feat4_desc: '所有软件都使用最新一代AI开发和优化。',
      feat5_title: 'LINUX原生',
      feat5_desc: '针对Linux、BlackArch和Unix系统优化。',
      feat6_title: '包含更新',
      feat6_desc: '一次购买，免费获得所有产品更新。',
      step1_title: '注册为供应商', step1_desc: '填写注册表格，填写软件和公司数据。',
      step2_title: '安全验证', step2_desc: '我们的团队分析软件是否存在恶意软件。24-48小时。',
      step3_title: '发布和销售', step3_desc: '您的产品以"已验证"徽章出现在市场中。',
      step4_title: '每月收款', step4_desc: '通过Stripe Connect自动付款。最低提现10€。',
      footer_tagline: '用AI构建的高级软件市场。已验证、安全，Stripe支付。',
      footer_copy: '© 2025–2026 neuralgpt.store · 版权所有',
      footer_company: 'NEURALGPT', footer_about: '关于我们',
      footer_blog: '博客', footer_contact: '联系', footer_sponsors: '赞助商',
      footer_marketplace_label: '市场', footer_all_products: '所有产品',
      footer_categories: '分类', footer_pricing: '定价', footer_trends: '趋势',
      footer_sellers: '卖家', footer_register: '注册',
      footer_directory: '目录', footer_guide: '入门指南',
      footer_seller_contact: '联系团队',
      footer_legal: '法律与安全', footer_privacy: '隐私',
      footer_terms: '条款', footer_legal_notice: '法律声明',
      footer_security: '安全中心', footer_vuln: '报告漏洞',
      newsletter_label: '新闻简报', newsletter_placeholder: '您@邮箱.com',
      pricing_title: '定价与佣金',
      pricing_sub: '透明模式。无意外。无固定月费。',
      commission_standard: '标准佣金',
      commission_note: '无月费。仅在销售时付费。',
      contact_title: '联系我们',
      contact_sub: '我们随时为您提供帮助。',
      form_name: '您的姓名', form_email: '您的邮箱', form_message: '您的消息',
      form_submit: '发送消息',
      product_buy_btn: '💳 立即购买 — Stripe安全支付',
      product_verified: '经Chany验证',
      product_download_note: '您的下载受到保护。确认付款后您将立即获得访问权限。',
      marketplace_title: '市场',
      marketplace_sub: '已验证的安全软件。AI工具、自动化、安全等。',
      filter_all: '全部', filter_ia: 'AI', filter_automation: '自动化',
      filter_security: '安全', filter_web: 'Web & APIs', filter_data: '数据',
      filter_linux: 'Linux & 系统', filter_mobile: '移动应用',
      sort_relevance: '相关性', sort_price_asc: '价格↑', sort_price_desc: '价格↓',
      sort_rating: '评分', sort_new: '最新',
      chany_greeting: '你好！我是Chany。有什么可以帮助您？',
      chany_placeholder: '输入您的问题…',
      chany_send: '发送',
    },

    /* ── JAPONÉS ─────────────────────────────────────────── */
    ja: {
      nav_home: 'ホーム', nav_marketplace: 'マーケット',
      nav_providers: 'プロバイダー', nav_pricing: '料金',
      nav_contact: 'お問い合わせ', nav_about: '私たちについて',
      nav_sell: '販売', nav_onboarding: 'スタートガイド',
      btn_explore: '探索', btn_sell: '販売',
      btn_search: '検索', btn_marketplace: 'マーケットを見る',
      btn_about: 'neuralgptとは？', btn_sell_now: '販売者として登録',
      btn_more_info: '手数料を見る', btn_explore_mp: 'マーケットを探索',
      btn_register_seller: '販売者として登録',
      btn_subscribe: '購読', btn_contact: 'お問い合わせ',
      btn_buy: '今すぐ購入', btn_demo: 'デモをリクエスト',
      hero_badge: 'アクティブマーケット · 検証済みソフトウェア + AI',
      hero_title: 'ソフトウェアの<br>未来はここに',
      hero_subtitle: 'AIで構築されたプロフェッショナルソフトウェアを発見、購入、ダウンロードできます。自動化、AIツール、企業・個人向けソリューション。100%検証済み。',
      search_placeholder: 'ソフトウェア、ツール、自動化を検索…',
      stat_products: '製品', stat_devs: '開発者',
      stat_downloads: 'ダウンロード', stat_verified: '検証済みソフト',
      stat_rating: '平均評価',
      own_products_title: '私たちの製品',
      own_products_sub: 'neuralgptチームによるプレミアムソフトウェア。検証済み、サポート付き、アップデート込み。',
      cat_title: 'マーケットを探索',
      cat_sub: 'カテゴリ別のサードパーティ製プロソフト。すべて検証済みで安全。',
      why_title: 'なぜneuralgpt.storeか？',
      why_sub: '開発者のために、開発者が作ったプラットフォーム。安全、高速、透明。',
      testimonials_title: 'ユーザーの声',
      testimonials_sub: '120人以上の開発者と企業がneuralgpt.storeを信頼しています',
      dev_title: 'neuralgpt.storeで<br>ソフトウェアを販売',
      dev_sub: 'ツールを公開して、数千人の技術系バイヤーにリーチ。',
      cta_title: '始める準備はできていますか？',
      cta_sub: 'マーケットを探索するか、プロバイダーとして参加してください。',
      feat1_title: '即時ダウンロード',
      feat1_desc: '支払い後すぐに製品にアクセスできます。',
      feat2_title: '検証済みソフトウェア',
      feat2_desc: 'すべてのソフトウェアは公開前にマルウェア分析と手動レビューを受けます。',
      feat3_title: 'STRIPE安全決済',
      feat3_desc: 'Stripe（PCI-DSS）で100%処理された支払い。',
      feat4_title: 'AIで作成',
      feat4_desc: 'すべてのソフトウェアは最新のAIで開発・最適化されています。',
      feat5_title: 'Linuxネイティブ',
      feat5_desc: 'Linux、BlackArch、Unixシステム向けに最適化。',
      feat6_title: 'アップデート込み',
      feat6_desc: '一度購入して、追加費用なしですべてのアップデートを受け取る。',
      step1_title: 'プロバイダーとして登録',
      step1_desc: 'ソフトウェアと会社のデータで登録フォームに記入。',
      step2_title: 'セキュリティ検証',
      step2_desc: 'チームがマルウェアのソフトウェアを分析します。24-48時間。',
      step3_title: '公開して販売',
      step3_desc: 'あなたの製品が「検証済み」バッジでマーケットに表示されます。',
      step4_title: '毎月収益を受け取る',
      step4_desc: 'Stripe Connect経由の自動支払い。最低払出額10€。',
      footer_tagline: 'AIで作られたプレミアムソフトウェアマーケット。検証済み、安全、Stripe決済。',
      footer_copy: '© 2025–2026 neuralgpt.store · 全著作権所有',
      footer_company: 'NEURALGPT', footer_about: '私たちについて',
      footer_blog: 'ブログ', footer_contact: 'お問い合わせ', footer_sponsors: 'スポンサー',
      footer_marketplace_label: 'マーケット', footer_all_products: 'すべての製品',
      footer_categories: 'カテゴリ', footer_pricing: '料金', footer_trends: 'トレンド',
      footer_sellers: '販売者', footer_register: '登録',
      footer_directory: 'ディレクトリ', footer_guide: 'スタートガイド',
      footer_seller_contact: 'チームに連絡',
      footer_legal: '法律とセキュリティ', footer_privacy: 'プライバシー',
      footer_terms: '利用規約', footer_legal_notice: '法的通知',
      footer_security: 'セキュリティセンター', footer_vuln: '脆弱性を報告',
      newsletter_label: 'ニュースレター', newsletter_placeholder: 'あなた@メール.com',
      pricing_title: '料金と手数料',
      pricing_sub: '透明なモデル。サプライズなし。固定月額なし。',
      commission_standard: '標準手数料',
      commission_note: '月額費用なし。販売したときのみ費用が発生。',
      contact_title: 'お問い合わせ',
      contact_sub: 'いつでもお手伝いします。',
      form_name: 'お名前', form_email: 'メールアドレス', form_message: 'メッセージ',
      form_submit: 'メッセージを送る',
      product_buy_btn: '💳 今すぐ購入 — Stripe安全決済',
      product_verified: 'Chanyが検証',
      product_download_note: 'ダウンロードは保護されています。支払い確認後すぐにアクセスできます。',
      marketplace_title: 'マーケット',
      marketplace_sub: '検証済みで安全なソフトウェア。AIツール、自動化、セキュリティなど。',
      filter_all: 'すべて', filter_ia: 'AI', filter_automation: '自動化',
      filter_security: 'セキュリティ', filter_web: 'Web & APIs', filter_data: 'データ',
      filter_linux: 'Linux & システム', filter_mobile: 'モバイルアプリ',
      sort_relevance: '関連性', sort_price_asc: '価格↑', sort_price_desc: '価格↓',
      sort_rating: '評価', sort_new: '新着',
      chany_greeting: 'こんにちは！私はChanyです。お手伝いできますか？',
      chany_placeholder: '質問を入力してください…',
      chany_send: '送信',
    },

    /* ── ÁRABE ───────────────────────────────────────────── */
    ar: {
      nav_home: 'الرئيسية', nav_marketplace: 'السوق',
      nav_providers: 'الموردون', nav_pricing: 'الأسعار',
      nav_contact: 'اتصل', nav_about: 'من نحن',
      nav_sell: 'بيع', nav_onboarding: 'دليل البداية',
      btn_explore: 'استكشف', btn_sell: 'بيع',
      btn_search: 'بحث', btn_marketplace: 'عرض السوق',
      btn_about: 'ما هو neuralgpt؟', btn_sell_now: 'التسجيل كبائع',
      btn_more_info: 'عرض العمولات', btn_explore_mp: 'استكشف السوق',
      btn_register_seller: 'التسجيل كبائع',
      btn_subscribe: 'اشترك', btn_contact: 'تواصل',
      btn_buy: 'اشتر الآن', btn_demo: 'طلب عرض توضيحي',
      hero_badge: 'سوق نشط · برامج + ذكاء اصطناعي موثق',
      hero_title: 'مستقبل البرمجيات<br>هنا الآن',
      hero_subtitle: 'اكتشف واشترِ وحمّل برامج احترافية مبنية بالذكاء الاصطناعي. أتمتة وأدوات ذكاء اصطناعي وحلول للشركات والأفراد. موثقة 100%.',
      search_placeholder: 'ابحث عن برامج وأدوات وأتمتة…',
      stat_products: 'المنتجات', stat_devs: 'المطورون',
      stat_downloads: 'التحميلات', stat_verified: 'برامج موثقة',
      stat_rating: 'متوسط التقييم',
      own_products_title: 'منتجاتنا',
      own_products_sub: 'برامج متميزة من فريق neuralgpt. موثقة ومدعومة مع تحديثات مضمنة.',
      cat_title: 'استكشف السوق',
      cat_sub: 'برامج احترافية من طرف ثالث مرتبة حسب الفئة. جميع المنتجات موثقة وآمنة.',
      why_title: 'لماذا neuralgpt.store؟',
      why_sub: 'منصة مبنية للمطورين من قبل المطورين. آمنة وسريعة وشفافة.',
      testimonials_title: 'ما يقوله مستخدمونا',
      testimonials_sub: 'يثق أكثر من 120 مطوراً وشركة في neuralgpt.store',
      dev_title: 'بع برامجك<br>على neuralgpt.store',
      dev_sub: 'انشر أدواتك وصل إلى آلاف المشترين التقنيين.',
      cta_title: 'هل أنت مستعد للبدء؟',
      cta_sub: 'استكشف السوق أو انضم كمورد.',
      feat1_title: 'تحميل فوري',
      feat1_desc: 'بعد الدفع تحصل على المنتج فوراً. بلا انتظار.',
      feat2_title: 'برامج موثقة',
      feat2_desc: 'جميع البرامج تخضع لتحليل مضاد للبرمجيات الخبيثة ومراجعة يدوية قبل النشر.',
      feat3_title: 'دفع آمن عبر STRIPE',
      feat3_desc: 'مدفوعات معالجة 100% عبر Stripe (PCI-DSS).',
      feat4_title: 'مبني بالذكاء الاصطناعي',
      feat4_desc: 'جميع البرامج مطورة ومحسّنة بأحدث جيل من الذكاء الاصطناعي.',
      feat5_title: 'نشطة على LINUX',
      feat5_desc: 'محسّنة لـ Linux وBlackArch وأنظمة Unix.',
      feat6_title: 'التحديثات مضمنة',
      feat6_desc: 'اشترِ مرة واحدة واستقبل جميع تحديثات المنتج دون تكلفة إضافية.',
      step1_title: 'سجّل كمورد',
      step1_desc: 'أكمل نموذج التسجيل ببيانات برنامجك وشركتك.',
      step2_title: 'التحقق الأمني',
      step2_desc: 'يحلل فريقنا البرنامج ضد البرمجيات الخبيثة. 24-48 ساعة.',
      step3_title: 'انشر وبع',
      step3_desc: 'يظهر منتجك بشارة "موثق" في السوق.',
      step4_title: 'احصل على دفعتك شهرياً',
      step4_desc: 'دفع تلقائي عبر Stripe Connect. الحد الأدنى للدفع 10€.',
      footer_tagline: 'سوق برامج متميزة مبنية بالذكاء الاصطناعي. موثقة وآمنة ومدفوعات Stripe.',
      footer_copy: '© 2025–2026 neuralgpt.store · جميع الحقوق محفوظة',
      footer_company: 'NEURALGPT', footer_about: 'من نحن',
      footer_blog: 'مدونة', footer_contact: 'اتصل', footer_sponsors: 'الرعاة',
      footer_marketplace_label: 'السوق', footer_all_products: 'جميع المنتجات',
      footer_categories: 'الفئات', footer_pricing: 'الأسعار', footer_trends: 'الاتجاهات',
      footer_sellers: 'البائعون', footer_register: 'تسجيل',
      footer_directory: 'الدليل', footer_guide: 'دليل البداية',
      footer_seller_contact: 'التواصل مع الفريق',
      footer_legal: 'قانوني وأمن', footer_privacy: 'الخصوصية',
      footer_terms: 'الشروط', footer_legal_notice: 'إشعار قانوني',
      footer_security: 'مركز الأمن', footer_vuln: 'الإبلاغ عن ثغرة',
      newsletter_label: 'النشرة الإخبارية', newsletter_placeholder: 'بريدك@الإلكتروني',
      pricing_title: 'الأسعار والعمولات',
      pricing_sub: 'نموذج شفاف. لا مفاجآت. لا رسوم شهرية ثابتة.',
      commission_standard: 'العمولة القياسية',
      commission_note: 'لا رسوم شهرية. تدفع فقط عندما تبيع.',
      contact_title: 'اتصل بنا',
      contact_sub: 'نحن هنا لمساعدتك.',
      form_name: 'اسمك', form_email: 'بريدك الإلكتروني', form_message: 'رسالتك',
      form_submit: 'إرسال الرسالة',
      product_buy_btn: '💳 اشتر الآن — دفع آمن عبر Stripe',
      product_verified: 'تم التحقق بواسطة Chany',
      product_download_note: 'تحميلك محمي. ستحصل على وصول فوري بعد تأكيد الدفع.',
      marketplace_title: 'السوق',
      marketplace_sub: 'برامج موثقة وآمنة. أدوات ذكاء اصطناعي وأتمتة وأمن والمزيد.',
      filter_all: 'الكل', filter_ia: 'ذكاء اصطناعي', filter_automation: 'أتمتة',
      filter_security: 'أمن', filter_web: 'Web & APIs', filter_data: 'بيانات',
      filter_linux: 'Linux وأنظمة', filter_mobile: 'تطبيقات موبايل',
      sort_relevance: 'الصلة', sort_price_asc: 'السعر ↑', sort_price_desc: 'السعر ↓',
      sort_rating: 'التقييم', sort_new: 'الأحدث',
      chany_greeting: 'مرحباً! أنا Chany. كيف يمكنني مساعدتك؟',
      chany_placeholder: 'اكتب سؤالك…',
      chany_send: 'إرسال',
    }
  };

  /* ══════════════════════════════════════════════════════
     FUNCIONES PRINCIPALES
  ══════════════════════════════════════════════════════ */

  /**
   * Aplica las traducciones al documento actual.
   * Fusiona la lengua pedida con ES como fallback.
   */
  function applyTranslations(lang) {
    if (!lang || SUPPORTED.indexOf(lang) === -1) lang = 'es';

    var t   = lang === 'es' ? T.es : Object.assign({}, T.es, T[lang]);
    var rtl = RTL_LANGS.indexOf(lang) !== -1;

    /* ── HTML attrs ── */
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('data-lang', lang);
    if (rtl) {
      document.documentElement.setAttribute('dir', 'rtl');
      document.body && document.body.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.removeAttribute('dir');
      document.body && document.body.removeAttribute('dir');
    }

    /* ── [data-i18n] ── */
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) el.innerHTML = t[key];
    });

    /* ── [data-i18n-placeholder] ── */
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (t[key] !== undefined) el.placeholder = t[key];
    });

    /* ── Nav links sin data-i18n (todas las páginas) ── */
    document.querySelectorAll('.main-nav a:not([data-i18n])').forEach(function (a) {
      var href = a.getAttribute('href');
      var key  = NAV_HREF[href];
      if (key && t[key] !== undefined) a.textContent = t[key];
    });

    /* ── Actualizar botón de idioma ── */
    var btn = document.getElementById('lang-btn');
    if (btn) {
      btn.title = t['nav_language'] || lang.toUpperCase();
      btn.setAttribute('aria-label', 'Language / Idioma: ' + lang.toUpperCase());
    }
  }

  /* ── Obtener idioma almacenado o detectar ── */
  function detectLang() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    } catch (e) {}

    var browser = ((navigator.language || navigator.userLanguage || 'es'))
      .substring(0, 2).toLowerCase();
    return SUPPORTED.indexOf(browser) !== -1 ? browser : 'es';
  }

  /* ── Establecer idioma y guardar ── */
  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = 'es';
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    applyTranslations(lang);
  }

  /* ── Inyectar botón 🌐 si no existe ── */
  function injectLangButton() {
    if (document.getElementById('lang-btn')) return;
    var headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    var btn = document.createElement('button');
    btn.className   = 'btn btn-sm';
    btn.id          = 'lang-btn';
    btn.type        = 'button';
    btn.style.cssText = 'font-size:1rem;padding:6px 10px';
    btn.textContent = '🌐';
    btn.setAttribute('aria-label', 'Cambiar idioma');
    btn.title = 'Idioma';
    /* Insertar antes del primer elemento existente */
    headerActions.insertBefore(btn, headerActions.firstChild);
  }

  /* ── Ligar el botón a la lógica de cambio ── */
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

  /* ── Init ── */
  function init() {
    injectLangButton();
    var lang = detectLang();
    applyTranslations(lang);  // Siempre aplicar (establece lang/dir)
    bindLangButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── API pública ── */
  window.NeuralI18n = {
    setLang:           setLang,
    detectLang:        detectLang,
    applyTranslations: applyTranslations,
    supported:         SUPPORTED,
    t: function (key) {
      var lang = detectLang();
      var obj  = lang === 'es' ? T.es : Object.assign({}, T.es, T[lang]);
      return obj[key] || key;
    }
  };

})();
