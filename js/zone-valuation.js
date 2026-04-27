/**
 * zone-valuation.js — Valoración estimada de zona
 * Calcula precio medio €/m² de la zona y compara con el anuncio actual
 */

(function() {
  'use strict';

  /**
   * Inicializa el widget de valoración de zona
   * @param {Object} currentListing - Listing actual
   * @param {Array} allListings - Todos los listings disponibles
   */
  window.initZoneValuation = function(currentListing, allListings) {
    const widget = document.getElementById('zone-valuation');
    if (!widget) return;

    // Filtrar listings comparables (misma ciudad, mismo tipo de activo, misma operación)
    const comparables = allListings.filter(l =>
      l.id !== currentListing.id &&
      l.city === currentListing.city &&
      l.asset_type === currentListing.asset_type &&
      l.operation === currentListing.operation &&
      l.price > 0 &&
      l.surface_m2 > 0 &&
      l.status === 'published'
    );

    // Solo mostrar si hay al menos 3 comparables
    if (comparables.length < 3) {
      widget.style.display = 'none';
      return;
    }

    // Calcular precio por m² de cada comparable
    const pricesPerM2 = comparables.map(l => l.price / l.surface_m2);

    // Precio medio de la zona
    const avgPricePerM2 = pricesPerM2.reduce((sum, p) => sum + p, 0) / pricesPerM2.length;

    // Precio por m² del anuncio actual
    const currentPricePerM2 = currentListing.price / currentListing.surface_m2;

    // Diferencia porcentual
    const diffPercent = ((currentPricePerM2 - avgPricePerM2) / avgPricePerM2) * 100;

    // Renderizar widget
    renderValuation({
      avgPricePerM2,
      currentPricePerM2,
      diffPercent,
      comparablesCount: comparables.length,
      city: currentListing.city,
      assetType: currentListing.asset_type
    });

    widget.style.display = 'block';
  };

  function renderValuation(data) {
    const widget = document.getElementById('zone-valuation');
    if (!widget) return;

    const isAbove = data.diffPercent > 0;
    const isBelow = data.diffPercent < 0;
    const diffColor = isAbove ? '#FF6B6B' : (isBelow ? '#00FF99' : 'var(--text)');
    const diffText = isAbove ? 'por encima' : (isBelow ? 'por debajo' : 'en línea con');

    widget.innerHTML = `
      <h2 style="font-family:var(--font-title);font-size:0.78rem;letter-spacing:1px;color:var(--accent);margin-bottom:14px">
        💰 Valoración estimada de zona
      </h2>
      <div style="background:rgba(0,245,255,0.05);border:1.5px solid rgba(0,245,255,0.2);border-radius:8px;padding:16px;margin-bottom:12px">
        <div style="font-size:0.75rem;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">
          Precio medio ${data.city}
        </div>
        <div style="font-size:1.6rem;font-weight:700;color:var(--accent);font-family:var(--font-title)">
          ${formatCurrency(data.avgPricePerM2)}/m²
        </div>
        <div style="font-size:0.75rem;color:var(--muted);margin-top:4px">
          Basado en ${data.comparablesCount} ${data.comparablesCount === 1 ? 'anuncio comparable' : 'anuncios comparables'}
        </div>
      </div>
      <div style="background:var(--bg);border:1.5px solid var(--border);border-radius:8px;padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:0.85rem;color:var(--muted)">Este anuncio:</span>
          <span style="font-size:0.95rem;font-weight:600;color:var(--text)">${formatCurrency(data.currentPricePerM2)}/m²</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding-top:10px;border-top:1px solid var(--border)">
          <span style="font-size:0.85rem;color:var(--muted)">Comparativa:</span>
          <span style="font-size:0.9rem;font-weight:700;color:${diffColor}">
            ${Math.abs(diffPercent).toFixed(1)}% ${diffText} del mercado
          </span>
        </div>
      </div>
      <p style="font-size:0.72rem;color:var(--muted);margin-top:10px;margin-bottom:0">
        * Estimación basada en anuncios activos de ${humanAssetType(data.assetType)} en ${data.city}. No constituye valoración oficial.
      </p>
    `;
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  function humanAssetType(assetType) {
    const map = {
      apartment: 'apartamentos',
      room: 'habitaciones',
      commercial_unit: 'locales comerciales',
      warehouse: 'naves',
      land: 'suelo',
      singular_asset: 'activos singulares'
    };
    return map[assetType] || assetType || 'activos';
  }

})();
