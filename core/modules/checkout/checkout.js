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

function loadSummary() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const div = document.getElementById('summary');
  if (!div) return;
  div.innerHTML = '';
  let total = 0;

  if (cart.length === 0) {
    div.innerHTML = '<div class="summary-empty">Your cart is empty.</div>';
    const totalEl = document.getElementById('total');
    if (totalEl) totalEl.innerText = 'Total: €0.00';
    return;
  }

  const list = document.createElement('div');
  list.className = 'summary-list';
  cart.forEach((item, idx) => {
    const price = parseFloat(item.price) || 0;
    total += price;
    const row = document.createElement('div');
    row.className = 'summary-row';
    row.innerHTML = `<span class="item-name">${escapeHtml(item.name || 'Untitled')}</span>` +
                    `<span class="item-price">€${price.toFixed(2)}</span>`;
    list.appendChild(row);
  });
  div.appendChild(list);

  const totalEl = document.getElementById('total');
  if (totalEl) totalEl.innerText = 'Total: €' + total.toFixed(2);
}

async function confirmOrder() {
  try {
    // Convert to client-only flow: open a Stripe Payment Link if configured.
    const paymentLink = window.STRIPE_PAYMENT_LINK || document.querySelector('[data-stripe-link]')?.getAttribute('data-stripe-link');
    if (paymentLink) {
      localStorage.removeItem('cart');
      window.open(paymentLink, '_blank');
      return;
    }
    // If no payment link configured, fall back to static payments page instructions.
    alert('No payment link configured. You will be redirected to the payments information page.');
    window.location.href = '/payments.html';
  } catch (err) {
    console.error('confirmOrder error:', err);
    alert('Payment simulation failed. See console for details.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const confirmBtn = document.getElementById('confirm-order');
  if (confirmBtn) confirmBtn.addEventListener('click', confirmOrder);
  loadSummary();
});
