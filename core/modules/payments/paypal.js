// Safe fallback for PayPal buttons: if PayPal SDK isn't present or external APIs
// are disabled, render a local placeholder to avoid external calls.
(function(){
  try {
    if (window.DISABLE_EXTERNAL_APIS === true || window.DISABLE_EXTERNAL_APIS === 'true' || typeof window.paypal === 'undefined') {
      const container = document.getElementById('paypal-button');
      if (container) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline-accent';
        btn.innerText = 'PayPal (disabled)';
        btn.disabled = true;
        container.appendChild(btn);
      }
      return;
    }

    // PayPal SDK usage is disabled by repository policy. Render a static placeholder instead.
    const container = document.getElementById('paypal-button');
    if (container) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.innerText = 'PayPal buttons are disabled in this static build. Use a PayPal.me link or hosted Donate button in the payments page.';
      container.appendChild(p);
    }
  } catch (e) {
    // noop
  }
})();
