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

async function loadProducts() {
  try {
    const res = await fetch('/core/modules/products/products.json');
    if (!res.ok) throw new Error('Failed to load products');
    const data = await res.json();
    const container = document.getElementById('product-list');
    if (!container) return;

    container.innerHTML = '';
    data.forEach(p => {
      const price = parseFloat(p.price) || 0;
      const item = document.createElement('div');
      item.className = 'product-card';
      item.innerHTML = `
        <h3>${escapeHtml(p.name || 'Untitled')}</h3>
        <p class="product-desc">${escapeHtml(p.description || '')}</p>
        <p class="product-price">Price: €${price.toFixed(2)}</p>
        <button class="add-to-cart" data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name || '')}" data-price="${price}">Add to cart</button>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    console.error('loadProducts error:', err);
  }
}

function addToCart(id, name, price) {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart.push({ id, name, price: Number(price) || 0 });
  localStorage.setItem('cart', JSON.stringify(cart));
  // production: reduce console noise
  if (window && window.console && window.console.debug) window.console.debug && window.console.debug('Product added to cart:', id, name, price);
  document.dispatchEvent(new CustomEvent('cart.updated'));
}

document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', (evt) => {
    const btn = evt.target.closest && evt.target.closest('.add-to-cart');
    if (!btn) return;
    const id = btn.dataset.id;
    const name = btn.dataset.name;
    const price = parseFloat(btn.dataset.price) || 0;
    addToCart(id, name, price);
  });
  loadProducts();
});
