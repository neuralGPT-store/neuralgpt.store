function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>\"'`=\/]/g, function (s) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    }[s];
  });
}

export async function renderProducts(container) {
  if (!container) return;
  container.innerHTML = '';
  try {
    const res = await fetch('/core/modules/marketplace/product-data.json');
    if (!res.ok) throw new Error('Failed to fetch product-data.json');
    const products = await res.json();

    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'ng-card';
      const price = parseFloat(p.price) || 0;
      card.innerHTML = `
        <h3>${escapeHtml(p.name || 'Untitled')}</h3>
        <p class="ng-desc">${escapeHtml(p.description || '')}</p>
        <span class='badge'>${escapeHtml(p.category || '')}</span>
        <div class='price'>€${price.toFixed(2)}</div>
        <button class="market-add" data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name || '')}" data-price="${price}">Add</button>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('renderProducts error:', err);
    container.innerHTML = '<div class="products-error">Error loading products.</div>';
  }
}

// Auto-render when a container with id 'marketplace-products' is present
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('marketplace-products');
  if (container) renderProducts(container);
});

