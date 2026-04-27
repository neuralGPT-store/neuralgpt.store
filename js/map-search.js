/**
 * map-search.js — Búsqueda inmobiliaria con mapa interactivo Leaflet
 * Implementa: mapa con marcadores, filtro draw-on-map, popup, panel lateral sincronizado
 */

(function() {
  'use strict';

  let map = null;
  let markersLayer = null;
  let drawnItems = null;
  let allListings = [];
  let filteredListings = [];

  /**
   * Inicializa el mapa de búsqueda
   * @param {Array} listings - Array de listings con lat/lng
   * @param {string} operation - Tipo de operación ('sale', 'long_term_rent', etc.)
   */
  window.initMapSearch = function(listings, operation) {
    allListings = listings.filter(l => l.lat && l.lng);
    filteredListings = allListings;

    if (allListings.length === 0) {
      console.warn('[MapSearch] No hay listings con coordenadas');
      return;
    }

    // Crear mapa centrado en Europa
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) {
      console.warn('[MapSearch] No se encontró #map-container');
      return;
    }

    map = L.map('map-container').setView([48.8566, 2.3522], 5); // Centrado en París

    // Añadir capa de OpenStreetMap (libre, sin API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(map);

    // Inicializar capas de marcadores y dibujo
    markersLayer = L.layerGroup().addTo(map);
    drawnItems = new L.FeatureGroup().addTo(map);

    // Añadir controles de dibujo para filtro de área
    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          shapeOptions: {
            color: '#00F5FF',
            fillOpacity: 0.2
          },
          showArea: true
        },
        rectangle: {
          shapeOptions: {
            color: '#00F5FF',
            fillOpacity: 0.2
          }
        },
        circle: {
          shapeOptions: {
            color: '#00F5FF',
            fillOpacity: 0.2
          }
        },
        polyline: false,
        marker: false,
        circlemarker: false
      },
      edit: {
        featureGroup: drawnItems,
        remove: true
      }
    });
    map.addControl(drawControl);

    // Event listeners para filtro de dibujo
    map.on(L.Draw.Event.CREATED, function(e) {
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
      filterByDrawnArea(e.layer);
    });

    map.on(L.Draw.Event.DELETED, function() {
      filteredListings = allListings;
      renderMarkers();
      updateSidePanel();
    });

    // Renderizar marcadores iniciales
    renderMarkers();
    updateSidePanel();
    fitMapToMarkers();
  };

  /**
   * Renderiza marcadores en el mapa
   */
  function renderMarkers() {
    markersLayer.clearLayers();

    filteredListings.forEach(listing => {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-pin" style="background: ${getMarkerColor(listing.operation)}">
                 <span class="marker-price">${formatPrice(listing.price, listing.currency)}</span>
               </div>`,
        iconSize: [40, 50],
        iconAnchor: [20, 50],
        popupAnchor: [0, -50]
      });

      const marker = L.marker([listing.lat, listing.lng], { icon })
        .bindPopup(createPopupHTML(listing))
        .addTo(markersLayer);

      // Sincronizar con panel lateral
      marker.on('click', () => highlightInSidePanel(listing.id));
    });
  }

  /**
   * Filtra listings por área dibujada
   */
  function filterByDrawnArea(layer) {
    const bounds = layer.getBounds ? layer.getBounds() : null;
    const center = layer.getLatLng ? layer.getLatLng() : null;
    const radius = layer.getRadius ? layer.getRadius() : null;

    filteredListings = allListings.filter(listing => {
      const latLng = L.latLng(listing.lat, listing.lng);

      if (bounds) {
        return bounds.contains(latLng);
      } else if (center && radius) {
        return latLng.distanceTo(center) <= radius;
      }
      return true;
    });

    renderMarkers();
    updateSidePanel();

    if (filteredListings.length > 0) {
      fitMapToMarkers();
    }
  }

  /**
   * Crea HTML del popup del marcador
   */
  function createPopupHTML(listing) {
    const img = listing.images && listing.images[0] ? listing.images[0] : '/assets/img/real-estate/placeholder-default.svg';
    const price = formatPrice(listing.price, listing.currency);
    const surface = listing.surface_m2 ? `${listing.surface_m2} m²` : '';

    return `
      <div class="map-popup" style="min-width: 200px;">
        <img src="${img}" alt="${listing.title}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;">
        <h3 style="font-size: 0.9rem; margin: 0 0 6px 0; font-weight: 600;">${listing.title}</h3>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-weight: 700; color: var(--accent); font-size: 1.1rem;">${price}</span>
          ${surface ? `<span style="color: var(--muted); font-size: 0.85rem;">${surface}</span>` : ''}
        </div>
        <a href="/listing.html?slug=${listing.slug}" class="btn btn-sm btn-primary" style="width: 100%; text-align: center; padding: 6px 12px; font-size: 0.8rem;">
          Ver detalles
        </a>
      </div>
    `;
  }

  /**
   * Actualiza el panel lateral con listings filtrados
   */
  function updateSidePanel() {
    const grid = document.getElementById('collection-grid');
    const resultsCount = document.getElementById('results-count');

    if (!grid) return;

    grid.innerHTML = '';

    if (filteredListings.length === 0) {
      grid.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--muted);">No se encontraron activos en el área seleccionada. Dibuja otra área o elimina el filtro.</p>';
      if (resultsCount) resultsCount.textContent = 'Sin resultados en el área';
      return;
    }

    filteredListings.forEach(listing => {
      const card = createListingCard(listing);
      grid.appendChild(card);
    });

    if (resultsCount) {
      resultsCount.textContent = `${filteredListings.length} activo${filteredListings.length !== 1 ? 's' : ''} encontrado${filteredListings.length !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Crea card de listing para panel lateral
   */
  function createListingCard(listing) {
    const card = document.createElement('div');
    card.className = 'market-card';
    card.id = `listing-card-${listing.id}`;
    card.setAttribute('data-listing-id', listing.id);

    const img = listing.images && listing.images[0] ? listing.images[0] : '/assets/img/real-estate/placeholder-default.svg';
    const price = formatPrice(listing.price, listing.currency);
    const surface = listing.surface_m2 ? `${listing.surface_m2} m²` : '';
    const rooms = listing.rooms ? `${listing.rooms} hab.` : '';

    card.innerHTML = `
      <div class="market-card-image">
        <img src="${img}" alt="${listing.title}" loading="lazy">
        ${listing.featured ? '<span class="badge badge-hot" style="position: absolute; top: 10px; left: 10px;">DESTACADO</span>' : ''}
      </div>
      <div class="market-card-body">
        <h3 class="market-card-title">${listing.title}</h3>
        <p class="market-card-location">${listing.city}, ${listing.country}</p>
        <p class="market-card-summary">${listing.summary}</p>
        <div class="market-card-meta">
          <span class="market-card-price">${price}</span>
          <span class="market-card-specs">${surface} ${rooms ? '· ' + rooms : ''}</span>
        </div>
        <a href="/listing.html?slug=${listing.slug}" class="btn btn-sm">Ver detalles</a>
      </div>
    `;

    // Al hacer click en card, centrar mapa en marcador
    card.addEventListener('click', (e) => {
      if (!e.target.classList.contains('btn')) {
        centerMapOnListing(listing);
      }
    });

    return card;
  }

  /**
   * Centra el mapa en un listing y abre su popup
   */
  function centerMapOnListing(listing) {
    map.setView([listing.lat, listing.lng], 14);

    // Abrir popup del marcador correspondiente
    markersLayer.eachLayer(layer => {
      const latLng = layer.getLatLng();
      if (latLng.lat === listing.lat && latLng.lng === listing.lng) {
        layer.openPopup();
      }
    });
  }

  /**
   * Resalta card en panel lateral
   */
  function highlightInSidePanel(listingId) {
    document.querySelectorAll('.market-card').forEach(card => {
      card.classList.remove('highlighted');
    });

    const card = document.getElementById(`listing-card-${listingId}`);
    if (card) {
      card.classList.add('highlighted');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Ajusta el mapa para mostrar todos los marcadores
   */
  function fitMapToMarkers() {
    if (filteredListings.length === 0) return;

    const bounds = L.latLngBounds(
      filteredListings.map(l => [l.lat, l.lng])
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }

  /**
   * Obtiene color del marcador según tipo de operación
   */
  function getMarkerColor(operation) {
    const colors = {
      'sale': '#00F5FF',
      'long_term_rent': '#FFD700',
      'room_rent': '#FF6B6B',
      'short_term_rent': '#A855F7'
    };
    return colors[operation] || '#00F5FF';
  }

  /**
   * Formatea precio
   */
  function formatPrice(price, currency = 'EUR') {
    if (!price) return 'Consultar';
    const formatted = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
    return formatted;
  }

  /**
   * Expone función para aplicar filtros externos (ciudad, tipo, etc.)
   */
  window.applyMapFilters = function(filters) {
    filteredListings = allListings.filter(listing => {
      if (filters.city && listing.city !== filters.city) return false;
      if (filters.assetType && listing.asset_type !== filters.assetType) return false;
      if (filters.operation && listing.operation !== filters.operation) return false;
      return true;
    });

    renderMarkers();
    updateSidePanel();
    if (filteredListings.length > 0) {
      fitMapToMarkers();
    }
  };

})();
