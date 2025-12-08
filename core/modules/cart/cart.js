function loadCart() {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const container = document.getElementById('cart-items');
  let total = 0;
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"'`=\/]/g, function (s) {
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

function loadCart() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const container = document.getElementById('cart-items');
  let total = 0;

  if (!container) return;
  container.innerHTML = '';

  if (cart.length === 0) {
    container.innerHTML = '<div class="cart-empty">Your cart is empty.</div>';
    const totalEl = document.getElementById('total');
    if (totalEl) totalEl.innerText = 'Total: €0.00';
    return;
  }

  cart.forEach((item, index) => {
    const price = parseFloat(item.price) || 0;
    total += price;

    const itemHtml = `
      <div class="cart-item" data-index="${index}">
        <div class="cart-item-meta">
          <span class="cart-item-name">${escapeHtml(item.name || 'Untitled')}</span>
        </div>
        <div class="cart-item-actions">
          <span class="cart-item-price">€${price.toFixed(2)}</span>
          <button class="remove-btn" data-index="${index}" type="button">Remove</button>
        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = itemHtml;
    container.appendChild(wrapper.firstElementChild);
  });

  const totalEl = document.getElementById('total');
  if (totalEl) totalEl.innerText = 'Total: €' + total.toFixed(2);
}

function removeItem(index) {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  if (typeof index !== 'number' || isNaN(index)) return;
  if (index < 0 || index >= cart.length) return;
  cart.splice(index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  loadCart();
}

// Event delegation for remove buttons
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('cart-items');
  if (container) {
    container.addEventListener('click', (evt) => {
      const btn = evt.target.closest && evt.target.closest('.remove-btn');
      if (!btn) return;
      const idx = parseInt(btn.dataset.index, 10);
      removeItem(idx);
    });
  }
  // Initial render
  loadCart();
});
