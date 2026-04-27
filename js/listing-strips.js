/**
 * Franjas animadas de anuncios con prioridad comercial
 * Carga datos desde public-data/listings.public.json
 */
(function () {
  'use strict';

  const LISTINGS_URL = '/public-data/listings.public.json';
  const MIN_ITEMS_FOR_INFINITE = 4; // Mínimo de items para duplicar y crear efecto infinito

  /**
   * Determina la prioridad del anuncio basándose en los campos disponibles
   * @param {Object} listing
   * @returns {string} 'premium' | 'standard'
   */
  function getListingPriority(listing) {
    // Premium: featured=true o badges incluyen "prime" o "destacado"
    if (listing.featured) return 'premium';
    if (listing.badges && Array.isArray(listing.badges)) {
      const premiumBadges = ['prime', 'destacado', 'premium', 'enterprise'];
      if (listing.badges.some(b => premiumBadges.includes(b.toLowerCase()))) {
        return 'premium';
      }
    }
    return 'standard';
  }

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
   * Renderiza un item de la franja
   */
  function renderListingItem(listing) {
    const image = listing.images && listing.images[0]
      ? listing.images[0]
      : '/assets/img/real-estate/placeholders/default.svg';

    const slug = listing.slug || listing.id;
    const href = `/listing.html?slug=${encodeURIComponent(slug)}`;
    const priority = getListingPriority(listing);
    const badge = priority === 'premium' ? 'PREMIUM' : (listing.featured ? 'DESTACADO' : '');

    return `
      <a href="${escapeHtml(href)}" class="listing-strip-item" data-listing-id="${escapeHtml(listing.id)}">
        <div style="position: relative;">
          <img
            src="${escapeHtml(image)}"
            alt="${escapeHtml(listing.title)}"
            class="listing-strip-image"
            loading="lazy"
          />
          ${badge ? `<span class="listing-strip-badge ${priority}">${badge}</span>` : ''}
        </div>
        <div class="listing-strip-content">
          <h3 class="listing-strip-title">${escapeHtml(listing.title)}</h3>
          <div class="listing-strip-price">${escapeHtml(formatPrice(listing))}</div>
          <div class="listing-strip-location">
            📍 ${escapeHtml(listing.city)}, ${escapeHtml(listing.country)}
          </div>
        </div>
      </a>
    `;
  }

  /**
   * Renderiza una franja completa
   */
  function renderStrip(listings, containerId, priority) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!listings || listings.length === 0) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">No hay anuncios disponibles</div>';
      return;
    }

    // Duplicar items para crear efecto de bucle infinito
    let itemsToRender = [...listings];
    if (listings.length < MIN_ITEMS_FOR_INFINITE) {
      // Si hay pocos items, duplicar varias veces
      const times = Math.ceil(MIN_ITEMS_FOR_INFINITE / listings.length) + 1;
      itemsToRender = Array(times).fill(listings).flat();
    } else {
      // Duplicar una vez para el efecto infinito
      itemsToRender = [...listings, ...listings];
    }

    const stripClass = listings.length < 6 ? 'slow' : (listings.length > 12 ? 'fast' : '');

    const html = `
      <div class="listing-strip ${stripClass}">
        ${itemsToRender.map(renderListingItem).join('')}
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Carga y distribuye los listings en las franjas
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

      // Separar por prioridad
      const premiumListings = published.filter(l => getListingPriority(l) === 'premium');
      const standardListings = published.filter(l => getListingPriority(l) === 'standard');

      // Si no hay suficientes premium, rellenar con standard
      let topStripListings = premiumListings.length > 0 ? premiumListings : published.slice(0, 6);

      // Si no hay suficientes standard, usar los restantes
      let bottomStripListings = standardListings.length > 0
        ? standardListings
        : published.filter(l => !topStripListings.includes(l));

      // Si aún no hay suficientes para la franja inferior, usar todos menos los de arriba
      if (bottomStripListings.length === 0 && published.length > topStripListings.length) {
        bottomStripListings = published.slice(topStripListings.length);
      }

      // Renderizar ambas franjas
      renderStrip(topStripListings, 'listing-strip-premium', 'premium');
      renderStrip(bottomStripListings, 'listing-strip-standard', 'standard');

    } catch (error) {
      console.warn('[ListingStrips] Error loading listings:', error);

      // Mostrar mensaje de error amigable
      const errorMsg = '<div style="padding: 20px; text-align: center; color: var(--muted);">No se pudieron cargar los anuncios en este momento</div>';
      const premium = document.getElementById('listing-strip-premium');
      const standard = document.getElementById('listing-strip-standard');
      if (premium) premium.innerHTML = errorMsg;
      if (standard) standard.innerHTML = errorMsg;
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
