/**
 * Franjas animadas temáticas de anuncios
 * Carga datos desde public-data/listings.public.json
 * 4 franjas: Alquiler, Venta Residencial, Industrial, Servicios
 */
(function () {
  'use strict';

  const LISTINGS_URL = '/public-data/listings.public.json';
  const MIN_ITEMS_FOR_INFINITE = 4;

  /**
   * Formatea el precio según la operación y moneda
   */
  function formatPrice(listing) {
    const price = Number(listing.price) || 0;
    const currency = listing.currency || 'EUR';
    const symbol = currency === 'EUR' ? '€' : currency;

    const formatted = price.toLocaleString('es-ES');
    const suffix = (listing.operation === 'long_term_rent' || listing.operation === 'room_rent')
      ? '/mes'
      : '';

    return `${formatted} ${symbol}${suffix}`;
  }

  /**
   * Obtiene el badge de categoría
   */
  function getCategoryBadge(listing) {
    if (listing.operation === 'long_term_rent' || listing.operation === 'room_rent') return 'ALQUILER';
    if (listing.operation === 'sale') return 'VENTA';
    return 'INMUEBLE';
  }

  /**
   * Renderiza un item de listing
   */
  function renderListingItem(listing) {
    const image = listing.images && listing.images[0]
      ? listing.images[0]
      : '/assets/img/real-estate/placeholders/default.svg';

    const slug = listing.slug || listing.id;
    const href = `/listing.html?slug=${encodeURIComponent(slug)}`;
    const badge = getCategoryBadge(listing);

    return `
      <a href="${escapeHtml(href)}" class="listing-strip-item" data-listing-id="${escapeHtml(listing.id)}">
        <div style="position: relative;">
          <img
            src="${escapeHtml(image)}"
            alt="${escapeHtml(listing.title)}"
            class="listing-strip-image"
            loading="lazy"
          />
          <span class="listing-strip-badge">${badge}</span>
        </div>
        <div class="listing-strip-content">
          <h3 class="listing-strip-title">${escapeHtml(listing.title)}</h3>
          <div class="listing-strip-price">${escapeHtml(formatPrice(listing))}</div>
          <div class="listing-strip-location">
            📍 ${escapeHtml(listing.city || 'Europa')}, ${escapeHtml(listing.country || '')}
          </div>
        </div>
      </a>
    `;
  }

  /**
   * Renderiza un item de servicio (estático)
   */
  function renderServiceItem(service) {
    return `
      <div class="listing-strip-item" style="cursor:default">
        <div style="position: relative;background:linear-gradient(135deg, rgba(191,0,255,0.15), rgba(127,0,255,0.1));height:160px;display:flex;align-items:center;justify-content:center;font-size:3rem">
          ${service.icon}
        </div>
        <div class="listing-strip-content">
          <h3 class="listing-strip-title">${escapeHtml(service.name)}</h3>
          <div style="font-size:0.82rem;color:var(--muted);line-height:1.5;margin-top:8px">${escapeHtml(service.desc)}</div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza una franja completa
   */
  function renderStrip(items, containerId, isServiceStrip = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">No hay contenido disponible</div>';
      return;
    }

    // Duplicar items para efecto infinito
    let itemsToRender = [...items];
    if (items.length < MIN_ITEMS_FOR_INFINITE) {
      const times = Math.ceil(MIN_ITEMS_FOR_INFINITE / items.length) + 1;
      itemsToRender = Array(times).fill(items).flat();
    } else {
      itemsToRender = [...items, ...items];
    }

    const stripClass = items.length < 6 ? 'slow' : (items.length > 12 ? 'fast' : '');

    const renderer = isServiceStrip ? renderServiceItem : renderListingItem;
    const html = `
      <div class="listing-strip ${stripClass}">
        ${itemsToRender.map(renderer).join('')}
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Carga y distribuye los listings en las 4 franjas temáticas
   */
  async function loadAndRenderStrips() {
    try {
      const response = await fetch(LISTINGS_URL);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const allListings = await response.json();

      if (!Array.isArray(allListings)) {
        throw new Error('Invalid listings format');
      }

      // Filtrar solo publicados
      const published = allListings.filter(l => l.status === 'published');

      // Franja 1: ALQUILER
      const alquilerListings = published.filter(l =>
        l.operation === 'long_term_rent' || l.operation === 'room_rent' || l.operation === 'rent' || l.operation === 'alquiler'
      );

      // Franja 2: VENTA RESIDENCIAL
      const residentialTypes = ['apartment', 'house', 'villa', 'chalet', 'duplex', 'penthouse', 'studio'];
      const ventaResidencialListings = published.filter(l =>
        l.operation === 'sale' && residentialTypes.includes(l.asset_type)
      );

      // Franja 3: FINCAS, TERRENOS Y NEGOCIOS
      const industrialTypes = ['land', 'finca', 'warehouse', 'garage', 'office', 'business', 'transfer', 'commercial', 'commercial_unit'];
      const industrialListings = published.filter(l =>
        industrialTypes.includes(l.asset_type)
      );

      // Franja 4: SERVICIOS (contenido estático)
      const servicios = [
        { icon: '🏛️', name: 'Gestoría Inmobiliaria', desc: 'Tramitación completa de documentación y registro de la propiedad.' },
        { icon: '💰', name: 'Préstamos Hipotecarios', desc: 'Financiación adaptada con las mejores condiciones del mercado.' },
        { icon: '🛡️', name: 'Seguros de Hogar', desc: 'Protección integral para tu inmueble y contenido.' },
        { icon: '📊', name: 'Valoraciones Oficiales', desc: 'Tasación certificada por profesionales homologados.' },
        { icon: '🔑', name: 'Administración de Fincas', desc: 'Gestión profesional de comunidades de propietarios.' },
        { icon: '⚖️', name: 'Asesoría Legal', desc: 'Consultoría jurídica especializada en derecho inmobiliario.' }
      ];

      // Renderizar las 4 franjas
      renderStrip(alquilerListings.length > 0 ? alquilerListings : published.slice(0, 4), 'listing-strip-alquiler');
      renderStrip(ventaResidencialListings.length > 0 ? ventaResidencialListings : published.slice(0, 4), 'listing-strip-venta-residencial');
      renderStrip(industrialListings.length > 0 ? industrialListings : published.slice(0, 4), 'listing-strip-industrial');
      renderStrip(servicios, 'listing-strip-servicios', true);

    } catch (error) {
      console.warn('[ListingStrips] Error loading listings:', error);

      // Mostrar mensaje de error amigable
      const errorMsg = '<div style="padding: 20px; text-align: center; color: var(--muted);">No se pudieron cargar los anuncios en este momento</div>';
      ['listing-strip-alquiler', 'listing-strip-venta-residencial', 'listing-strip-industrial', 'listing-strip-servicios'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = errorMsg;
      });
    }
  }

  /**
   * Escapa HTML para prevenir XSS
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  /**
   * Inicializa las franjas cuando el DOM esté listo
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndRenderStrips);
  } else {
    loadAndRenderStrips();
  }
})();
